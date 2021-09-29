const customScraper = require('../custom-scraper-template.js');

let goToImagesPage = async ({search_query, page, console}) => {
    await page.goto(`https://yandex.com/images/search?text=${search_query.replace(/ /g,"+")}`, {
        waitUntil: 'networkidle0',
    });
};

let loadThumbnails = async ({page, num_requested_images, console}) => {
    // adapted from https://stackoverflow.com/a/53527984
    await page.evaluate(async (num_requested_images) => {
        let prev_num_thumbnails = document.querySelectorAll('div.serp-item').length;

        await new Promise(resolve => {
            let retry = 0;

            // keep scrolling to the bottom of the page until all the thumbnails are loaded
            let timer = setInterval(() => {
                // console.log(window.innerHeight + window.pageYOffset, document.body.scrollHeight);

                if(document.querySelectorAll('div.serp-item').length >= num_requested_images) {
                    clearTimeout(timer);
                    resolve();
                }

                // check if page is scrolled to the bottom (https://stackoverflow.com/a/40370876)
                // and if number of thumbnails is the same as in the last check;
                // added 1 to cover an edge case
                if(prev_num_thumbnails == document.querySelectorAll('div.serp-item').length &&
                    (window.innerHeight + window.pageYOffset + 1) >= document.body.offsetHeight) 
                    ++retry;
                else 
                    retry = 0;
                
                prev_num_thumbnails = document.querySelectorAll('div.serp-item').length;

                // if at least 15 seconds have passed since the scroll has been at the bottom of the page, then consider all thumbnails are loaded
                if(retry === 15) {
                    clearTimeout(timer);
                    resolve();
                }

                // scroll to the bottom of the body (https://www.w3schools.com/jsref/met_element_scrollintoview.asp)
                document.body.scrollIntoView(false);
            }, 1000);
        });
    }, num_requested_images);
};

let getLinks = async ({page, num_requested_images, console}) => {
    let image_links = await page.$$eval('div.serp-item', anchors => {
        return anchors.map(anchor => {
            let attr = anchor.getAttribute('data-bem');
            let stringified_value = attr.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            let img_href = stringified_value.match(/(?<="img_href":")[^"]*(?=")/);
            let thumb = stringified_value.match(/(?<="thumb":{"url":")[^"]*(?=")/);
            return [img_href[0], `https:${thumb[0]}`];
        });
    });

    let num_found_images = Math.min(num_requested_images, image_links.length);

    console.log(`Found ${num_found_images} thumbnails`);

    return image_links.slice(0, num_found_images);
};

module.exports = async (args) => {
    return await customScraper(Object.assign(
        args, 
        {
            search_engine_name: 'yandex',
            goToImagesPage,
            loadThumbnails,
            getLinks
        }
    ));
};

