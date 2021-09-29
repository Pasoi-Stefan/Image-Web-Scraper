const customScraper = require('../custom-scraper-template.js');
const got = require('got'); // https://github.com/sindresorhus/got#readme
const delay = require('delay'); // https://github.com/sindresorhus/delay#readme

// code mostly adapted from https://github.com/KshitijMhatre/duckduckgo-images-api/blob/master/src/api.js from 'image_search' function;
// there doesn't seem to be an official api from DuckDuckGo for images, so this option was originally developed by Deepan Prabhu Babu (https://qr.ae/pN0Wnr);
// this developer wrote the requests in python
let getLinks = async ({search_query, num_requested_images, max_num_retries, console}) => {
    search_query = search_query.replace(/ /g, "+");
    let retry_num = 0;
    let image_links = [];

    // after every request, the program will sleep for 5s so the DuckDuckGo servers won't get overloaded
    try {
        let token;
 
        while(true)
            try {
                // fetch the 'vqd' token
                let request_for_token = await got(`https://duckduckgo.com?q=${search_query}`); 

                let html_page_with_token = request_for_token.body;
            
                if(!html_page_with_token)
                    throw Error('Request for token failed');
            
                token = html_page_with_token.match(/(?<=vqd=')[^']*/)[0];
            
                if(!token)
                    throw Error('No token found');

                retry_num = 0;
                break;
            } 
            catch (e) {
                console.log(`${e} - retry ${retry_num}`);
                ++ retry_num;

                if(retry_num > max_num_retries) 
                    throw Error('Exceeded maximum number of retries for token');

                await delay(5000); 
            }

        // get image links
        let requestUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${search_query}&vqd=${token}&f=,,,&p=1`;

        let headers = {
            'dnt': '1',
            'accept-encoding': 'gzip, deflate, sdch',
            'x-requested-with': 'XMLHttpRequest',
            'accept-language': 'en-GB,en-US;q=0.8,en;q=0.6,ms;q=0.4',
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'referer': 'https://duckduckgo.com/',
            'authority': 'duckduckgo.com',
        }

        let it = 0;

        while(image_links.length < num_requested_images) {
            ++ it;
            let image_data;

            // get image links in this iteration
            while(true)
                try {
                    let request_for_image_links = await got(requestUrl, {
                        headers,
                        responseType: 'json'
                    });

                    image_data = request_for_image_links.body;

                    if(!image_data.results)
                        throw Error(`No results for iteration ${it}`);

                    retry_num = 0;
                    break;
                }
                catch (e) {
                    console.log(`${e} - retry ${retry_num}`);
                    ++ retry_num;

                    if(retry_num > max_num_retries) 
                        throw Error(`Exceeded maximum number of retries at iteration ${it}`);

                    await delay(5000);
                }

            image_links.push(...image_data.results.map(info => [info.image, info.thumbnail]));

            console.log(`Iteration ${it} - Extracted ${image_data.results.length} image links - ${image_links.length} in total`);

            if(!image_data.next)
                break;

            requestUrl = `https://duckduckgo.com/${image_data.next}&vqd=${token}`;
            await delay(5000);
        }   
    }
    catch (e) {
        console.log(e.message);    
    }

    return image_links.slice(0, num_requested_images);
};

module.exports = async (args) => {
    return await customScraper(Object.assign(
        args, 
        {
            search_engine_name: 'duckduckgo',
            getLinks
        }
    ));
};

