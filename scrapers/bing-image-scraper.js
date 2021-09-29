const customScraper = require('../custom-scraper-template.js');

let goToImagesPage = async ({search_query, page, console}) => {
    // await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36");

    await page.goto(`https://www.bing.com/images/search?q=${search_query.replace(/ /g,"+")}`, {
        waitUntil: 'networkidle0',
    });
};

let loadThumbnails = async ({page, num_requested_images, console}) => {
    // adapted from https://stackoverflow.com/a/53527984
    await page.evaluate(async (num_requested_images) => {
        await new Promise(resolve => {
            // click on the load button once it appears
            let timer1 = setInterval(() => {
                let load_button = document.querySelector('.btn_seemore.cbtn.mBtn');

                load_button.click();

                if(load_button){
                    clearTimeout(timer1);
                }
            }, 100);

            let retry = 0;

            // keep scrolling to the bottom of the page until all the thumbnails are loaded
            let timer2 = setInterval(() => {
                // console.log(window.innerHeight + window.pageYOffset, document.body.scrollHeight);

                if(document.querySelectorAll('a.iusc').length >= num_requested_images) {
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
    let image_links = await page.$$eval('a.iusc', anchors => {
        return anchors.map(anchor => {
            let attr = anchor.getAttribute('m');
            let stringified_value = attr.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            let info = JSON.parse(stringified_value);
            return [info.murl, info.turl];
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
            search_engine_name: 'bing',
            goToImagesPage,
            loadThumbnails,
            getLinks
        }
    ));
};

