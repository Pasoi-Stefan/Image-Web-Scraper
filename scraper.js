const fs = require('fs').promises; // https://nodejs.org/api/fs.html#fs_promises_api
const {default: PQueue} = require('p-queue'); // https://github.com/sindresorhus/p-queue
const googleImageScraper = require('./scrapers/google-image-scraper.js');
const yahooImageScraper = require('./scrapers/yahoo-image-scraper.js');
const bingImageScraper = require('./scrapers/bing-image-scraper.js');
const duckduckgoImageScraper = require('./scrapers/duckduckgo-image-scraper.js');
const yandexImageScraper = require('./scrapers/yandex-image-scraper.js');
const downloadImages = require('./download-images.js');
 
// https://bytearcher.com/articles/using-npm-update-and-npm-outdated-to-update-dependencies/ - how to update a npm package using @latest
// https://stackoverflow.com/a/15892076 - install older version of a package

module.exports = async (image_class, download_path, download_threshold, enable_fetching, enable_download, google_options, yahoo_options, bing_options, duckduckgo_options, yandex_options) => {
    // in case the directory for images already exists, delete it
    await fs.rmdir(`${download_path}/${image_class}/aaa_images`, {recursive: true});

    // create a directory in download path to store the links and images for the search query
    await fs.mkdir(`${download_path}/${image_class}/aaa_images`, {recursive: true});

    let console = await require('./search-engine-logger.js')(null, `${download_path}/${image_class}/scraper-log.txt`);
    
    let executeAndGetTime = require('./execute-and-get-time.js')(console);
    
    try {
        if(enable_fetching) {
            let search_results = await executeAndGetTime('Starting scrapers', 'Finished all scrapers', async () => {
                const queue = new PQueue();

                return queue.addAll([
                    () => executeAndGetTime('(google) Starting scraper', '(google) Finished scraping', googleImageScraper, google_options),
                    () => executeAndGetTime('(yahoo) Starting scraper', '(yahoo) Finished scraping', yahooImageScraper, yahoo_options),
                    () => executeAndGetTime('(bing) Starting scraper', '(bing) Finished scraping', bingImageScraper, bing_options),
                    () => executeAndGetTime('(duckduckgo) Starting requests', '(duckduckgo) Finished requesting', duckduckgoImageScraper, duckduckgo_options),
                    () => executeAndGetTime('(yandex) Starting scraper', '(yandex) Finished scraping', yandexImageScraper, yandex_options)
                ]);
            }); 

            console.log(`Obtained ${search_results[0].length} links from google`);
            console.log(`Obtained ${search_results[1].length} links from yahoo`);
            console.log(`Obtained ${search_results[2].length} links from bing`);
            console.log(`Obtained ${search_results[3].length} links from duckduckgo`);
            console.log(`Obtained ${search_results[4].length} links from yandex`);
            console.log(`Total unfiltered links: ${search_results.flat().length}`);

            // distribute search results from each search engine across an array;
            // this is done because some search engines have less results than others
            let max_len = Math.max(...search_results.map(arr => arr.length));

            let step = (max_len, len) => Math.trunc((max_len - 1)/ (len - 1))
            let rem_pos = (max_len, len) => len - 1 - (max_len - 1) % (len - 1)

            let paramenters = search_results.map(arr => [step(max_len, arr.length), rem_pos(max_len, arr.length)]);

            let search_results_distributed = [];

            for(let curr_arr = 0; curr_arr < search_results.length; ++ curr_arr) {
                let arr = search_results[curr_arr];
                let [step, rem_pos] = paramenters[curr_arr];
                let pos = 0;

                for(let i = 0; i < arr.length; ++ i) {
                    if(search_results_distributed[pos])
                        search_results_distributed[pos].push(arr[i]);
                    else
                        search_results_distributed[pos] = [arr[i]];

                    pos += step + ((i + 1) > rem_pos);
                }
            }

            // flatten array
            search_results_distributed = search_results_distributed.flat();

            // get all unique links
            search_results_distributed = Array.from(new Set(search_results_distributed));

            console.log(`Number of unique links scraped: ${search_results_distributed.length}`)

            await fs.writeFile(`${download_path}/${image_class}/all-image-links.json`, JSON.stringify(search_results_distributed)); 
        }

        if(enable_download) {
            let num_downloaded_images = await executeAndGetTime('Downloading images', 'Finished downloading images', 
                                                                 downloadImages, download_threshold, `${download_path}/${image_class}`, console);

            console.log(`Downloaded ${num_downloaded_images} images`);
        }
    }
    catch(e) {
        console.log(e);
    }
};
