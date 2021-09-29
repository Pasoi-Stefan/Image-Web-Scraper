const fs = require('fs').promises; // https://nodejs.org/api/fs.html#fs_promises_api
const got = require('got'); // https://github.com/sindresorhus/got#readme
const sharp = require('sharp'); // https://github.com/lovell/sharp
const imghash = require('imghash'); // https://github.com/pwlmaciejewski/imghash
const PassjoinIndex = require('mnemonist/passjoin-index'); // https://yomguithereal.github.io/mnemonist/passjoin-index, https://yomguithereal.github.io/mnemonist/bk-tree
const {default: PQueue} = require('p-queue'); // https://github.com/sindresorhus/p-queue
const {Mutex} = require('async-mutex'); // https://github.com/DirtyHairy/async-mutex

const hamming = (str1, str2) => {
    let cnt = 0;
  
    for (let i = 0; i < str1.length; ++ i)
      cnt += str1[i] !== str2[i];
    
    return cnt;
  };

let hash_data, num_original_downloaded, download_counter;
const mutex = new Mutex();


let downloadImage = async (path, link, i) => {
    let format = 'jpeg';
    let buff;
    let timeout = 30000; // ms
    let retry = {limit: 0} // no retries

    // check if link is a http url or a base64 image and then get buffer
    if(link.match(/^http/)) {
        let response = await got(link, {responseType: 'buffer', timeout, retry});
        buff = response.body;
    }
    else {
        let base64_image = link.replace(/^data:image\/[^;]*;base64,/, "");
        buff = Buffer.from(base64_image, 'base64');
    }
    
    // check if image resolution is high enough (matching that of 512*512)
    let {width, height} = await sharp(buff).metadata();

    if(width * height < 262144)
        return 0;

    // convert images to the same format
    let image = await sharp(buff)[format]().toBuffer();

    // get perceptual image hash
    let hash = await imghash.hash(image); // 16 hex length

    // check for similar hashes to eliminate image duplicates
    const release = await mutex.acquire();

    // https://stackoverflow.com/a/32539929/15445526 - get first element of a set
    let match = hash_data.search(hash).values().next().value;

    if(match) {
        release();
        return 0;
    }
    else {
        hash_data.add(hash);
        release();
        await fs.writeFile(`${path}/aaa_images/${i.toString().padStart(5, '0')}.${format}`, image);
        ++ download_counter;
        return 1;
    }

    // await fs.writeFile(`${path}/aaa_images/${cnt}-${search_engine}.${format}`, image);
};


module.exports = async (download_threshold, path, console) => {
    hash_data = new PassjoinIndex(hamming, 1);
    num_original_downloaded = 0;
    download_counter = 0;
    // get links to download the images
    let links = JSON.parse(await fs.readFile(`${path}/all-image-links.json`, 'utf8'));

    let queue = new PQueue({concurrency: 100});

    queue.on('next', () => {
        // when the download_threshold is reached, stop the download process
        if(download_counter >= download_threshold)
            queue.clear();

        if(download_counter % 100 === 0)
            console.log(`Progress downloading images - ${download_counter}/${download_threshold}`);
    });

    for(let i = 0 ; i < links.length; ++ i) 
        queue.add(async () => {
            try {
                let no_match = await downloadImage(path, links[i], i);
                num_original_downloaded += no_match;
            }
            catch(e) {}
        });
    
    await queue.onIdle();
    // return number of original link downloads from the download counter
    console.log(`Downloaded ${num_original_downloaded}/${download_counter} original images`);
    return download_counter;
};