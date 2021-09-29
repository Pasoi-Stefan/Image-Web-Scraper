const puppeteer = require('puppeteer'); // https://pptr.dev/
const fs = require('fs').promises; // https://nodejs.org/api/fs.html#fs_promises_api

// this is what the 'args' object contains (comments for the function are in the code below)
/*
    {
        enable: boolean,                      -> whether to start scraper or not
        download_path: string,                -> where to download image links and create log files
        image_class: string,                  -> class of the images being searched, no matter the search query
        search_queries: [string],             -> different search queries for the image class
        num_requested_images: integer,        -> how many images to request
        is_headless: boolean,                  -> whether the browser runs in headless mode or not
        debug_mode: boolean,                   -> whether to activate the console for the page
        search_engine_name: string,           -> what the name of the search engine is (this is useful for the messages in the console and 
                                                 to put those messages in the right log file) 
        max_num_retries: integer,             -> maximum number of retries when there is an error

        goToImagesPage: function,
        loadThumbnails: function,
        getLinks: function
    }
*/

module.exports = async (args) => {
    let {download_path, image_class, search_queries, search_engine_name, num_requested_images=Infinity} = args;
    let {enable=true, is_headless=true, debug_mode=false, using_puppeteer=true} = args;
    let {goToImagesPage , loadThumbnails, getLinks} = args;

    // prepare the custom console
    let console = await require('./search-engine-logger.js')(search_engine_name, `${download_path}/${image_class}/${search_engine_name}-info`);
    let executeAndGetTime = require('./execute-and-get-time.js')(console);

    if(!enable) {
        console.log('Disabled');
        return [];
    }

    console.log(`Requesting ${num_requested_images == Infinity ? 'all' : num_requested_images} images for '${image_class}'...`);

    let all_search_results = [];

    for(let i in search_queries) {
        let search_query = search_queries[i];
        console.changePrefix(`${search_query} (${parseInt(i) + 1}/${search_queries.length})`);

        const browser = using_puppeteer ? await puppeteer.launch({
            headless: is_headless, 
            defaultViewport: null
        }) : null;

        try {
            const page = using_puppeteer ? await browser.newPage() : null;

            // add new arguments to the arguments object
            let new_args = Object.assign(args, {search_query, browser, page, console});

            // this is for debugging the page.evaluate() methods
            if(using_puppeteer && debug_mode)
                page.on('console', (msg) => console.log('PAGE LOG:', msg.text())); 

            // go to images page
            if(goToImagesPage)
                await executeAndGetTime(`Going to images page`, `Arrived at images page`, goToImagesPage, new_args);

            // scroll page in order to load all thumbnails
            if(loadThumbnails)
                await executeAndGetTime(`Loading images`, `Finished loading images`, loadThumbnails, new_args);

            // fetch image links
            let current_image_links = getLinks ? await executeAndGetTime(`Fetching image links`, `Finished fetching image links`, getLinks, new_args) : [];

            // get just the original links
            current_image_links = current_image_links.map(pair => pair[0]);

            console.log(`Fetched ${current_image_links.length} image links`);

            // add links according to the position of the thumbnail in the search results of the search engine
            for(let i = 0; i < current_image_links.length; ++ i)
                if(all_search_results[i])
                    all_search_results[i].push(current_image_links[i]);
                else
                    all_search_results[i] = [current_image_links[i]];

            // if not using puppeteer, then skip closing browser (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR#short-circuit_evaluation)
            !using_puppeteer || await browser.close();
        } 
        catch (e) {
            console.log(e);
            all_search_results[search_query] = [];
            !using_puppeteer || await browser.close();
        }
    }

    // flatten array of search results and eliminate null or undefined values
    all_search_results = all_search_results.flat().filter(el => el);
    
    // get the unique original links
    all_search_results = Array.from(new Set(all_search_results));
     
    // save links in a json file
    await fs.writeFile(`${download_path}/${image_class}/${search_engine_name}-info/${search_engine_name}-links.json`, JSON.stringify(all_search_results));

    return all_search_results;
}