const customScraper = require('../custom-scraper-template.js');

let goToImagesPage = async ({search_query, page, console}) => {
    await page.goto(`https://images.search.yahoo.com/search/images?p=${search_query.replace(/ /g,"+")}`, {
        waitUntil: 'networkidle0',
    });
};

let loadThumbnails = async ({page, num_requested_images, console}) => {
    // adapted from https://stackoverflow.com/a/53527984
    await page.evaluate(async (num_requested_images) => {
        await new Promise(resolve => {
            // click on the load button until it no longer appears
            let timer1 = setInterval(() => {
                let load_button = document.querySelector('.ygbt.more-res');

                if(getComputedStyle(load_button).display === 'none'){
                    clearTimeout(timer1);
                }

                load_button.click();
            }, 100);

            let retry = 0;

            // keep scrolling to the bottom of the page until all the thumbnails are loaded
            let timer2 = setInterval(() => {
                // console.log(window.innerHeight + window.pageYOffset, document.body.scrollHeight);

                if(document.querySelectorAll('.ld').length >= num_requested_images) {
                    clearTimeout(timer1);
                    clearTimeout(timer2);
                    resolve();
                }

                // check if page is scrolled to the bottom (https://stackoverflow.com/a/40370876)
                // added 1 to cover an edge case
                if((window.innerHeight + window.pageYOffset + 1) >= document.body.offsetHeight)
                    ++retry;
                else
                    retry = 0;
                
                // if at least 15 seconds have passed since the scroll has been at the bottom of the page, then consider all thumbnails are loaded
                if(retry === 15) {
                    clearTimeout(timer2);
                    resolve();
                }

                // scroll to the bottom of the body (https://www.w3schools.com/jsref/met_element_scrollintoview.asp)
                document.body.scrollIntoView(false);
            }, 1000);
        });
    }, num_requested_images);
};

let getLinks = async ({page, num_requested_images, console}) => {
    let thumbnails = await page.$$('.ld');
    let num_found_images = Math.min(num_requested_images, thumbnails.length);

    console.log(`Found ${num_found_images} thumbnails`);

    for(let i = 0; i < num_found_images; ++ i) 
        try {
            if(i % 100 === 0)
                console.log(`Progress getting image links - ${i}/${num_found_images}`)

            // hover over thumbnail to get into view
            await thumbnails[i].hover();
            // wait for thumbnail image to load
            await page.waitForXPath(`//li[contains(@class, 'ld')][${i + 1}]/a/img[@src]`, {timeout: 3000});
        } 
        catch (e) {
            console.log(e);
        }
    
    let image_links = await page.$$eval(".ld a", (anchors, num_found_images) => {
            return anchors.slice(0, num_found_images).map(anchor => {
                let href = anchor.getAttribute('href').match(/(?<=imgurl=).*(?=&rurl)/)[0];
                let img = anchor.getElementsByTagName('img')[0];
                let src = img.getAttribute('src');
                // thumbnail images are cropped, so we eliminate the p, w and h query parameters (https://docs.microsoft.com/en-us/azure/cognitive-services/bing-web-search/resize-and-crop-thumbnails)
                return [`https://${decodeURIComponent(href)}`, src.replace(/&p=\d*&w=\d*&h=\d*/i, '')];
            });
        }, num_found_images);
        
    return image_links;
};

module.exports = async (args) => {
    return await customScraper(Object.assign(
        args, 
        {
            search_engine_name: 'yahoo',
            goToImagesPage,
            loadThumbnails,
            getLinks
        }
    ));
};

