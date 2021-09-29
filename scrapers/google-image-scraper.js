const customScraper = require('../custom-scraper-template.js');

let goToImagesPage = async ({search_query, page, console}) => {
    await page.goto(`https://www.google.com/search?q=${search_query.replace(/ /g,"+")}&&tbm=isch`, {
        waitUntil: 'networkidle0'
    });
};

let loadThumbnails = async ({browser, page, num_requested_images, console}) => {
    // adapted from https://stackoverflow.com/a/53527984
    await page.evaluate(async (num_requested_images) => {
        await new Promise(resolve => {
            let timer = setInterval(() => {
                if(document.querySelectorAll('.wXeWr.islib.nfEiy.mM5pbd').length >= num_requested_images) {
                    clearTimeout(timer);
                    resolve();
                }
                
                let load_button = document.querySelector('.mye4qd');
                let end_text_1 = document.querySelector('.OuJzKb.Yu2Dnd');
                let end_text_2 = document.querySelector('.OuJzKb.CAq6te');
                let retry_button = document.querySelector('.sGx53d');
                let see_more_button = document.querySelector('.r0zKGf');

                // console.log('\n');
                // console.log('end_text_1 - ' + getComputedStyle(end_text_1).display);
                // console.log('end_text_2 - ' + getComputedStyle(end_text_2).display);
                // console.log('retry_button - ' + getComputedStyle(retry_button).display);
                // console.log('see_more_button - ' + !!see_more_button);
                // console.log('\n');

                if(getComputedStyle(end_text_1).display !== 'none' ||
                    getComputedStyle(end_text_2).display !== 'none'){
                        clearTimeout(timer);
                        resolve();
                    }
                    
                if(getComputedStyle(retry_button).display !== 'inline') 
                    retry_button.click();
                else if (see_more_button)
                    see_more_button.click();
                else 
                    load_button.click();
            }, 100);
        });
    }, num_requested_images);
};

let getLinks = async ({page, search_query, num_requested_images, console}) => {
    let thumbnails = await page.$$('.wXeWr.islib.nfEiy.mM5pbd');
    let num_found_images = Math.min(num_requested_images, thumbnails.length);

    console.log(`Found ${num_found_images} thumbnails`);

    for(let i = 0; i < num_found_images; ++ i)
            try {
                if(i % 100 === 0)
                    console.log(`Progress getting image links - ${i}/${num_found_images}`)

                // right click to generate original image url;
                // idea from https://github.com/pevers/images-scraper/blob/820f52aad680acc3ec3d37bf6200b5c0dbc11d5c/src/google/scraper.js#L130
                await thumbnails[i].click({button: 'right'});
                // wait for alternative image link to load (that image is the thumbnail image);
                // tried to use css selector '.isv-r.PNCib.MSM1fd.BUooTd:nth-of-type(${i + 1}) img.rg_i.Q4LuWd[src]' but does not work;
                // probably related to this issue https://stackoverflow.com/a/9313956, which mentions that there has be an actual tag (such as 'div') to the left of :nth-of-type();
                // the solution was using xpath which solves this issue and the issue of selecting the parents according to children elements;
                // https://stackoverflow.com/a/1014958 - "There is currently no way to select the parent of an element in CSS.";
                // https://stackoverflow.com/a/10881495 - example case of selecting parent node according to the property of the child node;
                // https://stackoverflow.com/a/9683142 - same as above;
                // https://www.w3schools.com/xml/xpath_syntax.asp - basic xpath syntax;
                // https://developer.mozilla.org/en-US/docs/Web/XPath/Functions - xpath functions;
                // https://stackoverflow.com/a/473069 - we can also use conditional operators;
                // http://test-able.blogspot.com/2016/04/xpath-selectors-cheat-sheet.html - advanced xpath syntax, such as 'Find Elements That Have an Attribute Starting With Keyword'
                await page.waitForXPath(`//div[@class='isv-r PNCib MSM1fd BUooTd'][${i + 1}]/a[1]/div[1]/img[@src]`, {timeout: 3000});
            } 
            catch (e) {
                console.log(e);
            }

    // wait for the last thumbnail to load image link)
    await page.waitForXPath("//a[@class='wXeWr islib nfEiy mM5pbd' and @href]", {timeout: 3000});

    let image_links = await page.$$eval(".wXeWr.islib.nfEiy.mM5pbd[href]", (anchors, num_found_images) => {
            return anchors.slice(0, num_found_images).map(anchor => {
                let href = anchor.getAttribute('href').match(/(?<=imgurl=).*(?=&imgrefurl)/)[0];
                let img = anchor.getElementsByTagName('img')[0];

                // replace url encoding for original link;
                // https://www.w3schools.com/tags/ref_urlencode.ASP - url encoding
                // https://www.w3schools.com/jsref/jsref_decodeuricomponent.asp - decode url
                return [decodeURIComponent(href), img.getAttribute('src')];
            });
        }, num_found_images);
    
    return image_links;
};

module.exports = async (args) => {
    return await customScraper(Object.assign(
        args, 
        {
            search_engine_name: 'google',
            goToImagesPage,
            loadThumbnails,
            getLinks
        }
    ));
};