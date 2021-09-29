const fs = require('fs').promises; // https://nodejs.org/api/fs.html#fs_promises_api
const scraper = require('./scraper.js');

(async () => {
    // let all_image_classes = JSON.parse(await fs.readFile(`./search-queries.json`, 'utf8'));
    let all_image_classes = {
        "Rabbitfish": [
            "Siganus argenteus", "streamlined spinefoot",
            "Siganus corallinus", "blue-spotted spinefoot", 
            "Siganus doliatus", "barred spinefoot",
            "Siganus guttatus", "orange-spotted spinefoot", 
            "Siganus javus", "streaked spinefoot", 
            "Siganus lineatus", "golden-lined spinefoot", 
            "Siganus magnificus", "magnificent rabbitfish", 
            "Siganus puellus", "masked spinefoot", 
            "Siganus unimaculatus", "blotched foxface", 
            "Siganus uspi", "bicolored foxface", 
            "Siganus virgatus", "barhead spinefoot",
            "Siganus vulpinus", "foxface rabbitfish"
        ]};

    for (let image_class in all_image_classes) {
        let search_queries = all_image_classes[image_class];

        let download_path = 'F:/scraper-images';
        let download_threshold = 10000;
        let num_images_per_scraper = Infinity;
        let enable_fetching = true;
        let enable_download = true;
    
        let common_options = {
            download_path: download_path, 
            image_class: image_class, 
            search_queries: search_queries,
            num_requested_images: num_images_per_scraper
        };

        console.log(image_class, search_queries);
    
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#cloning_an_object 
        // if using Object.assing(common_options, ...), then common_options will be changed, so use the approach in the link 
        let google_options = Object.assign({}, common_options, {enable: true, is_headless: true, debug_mode: false});
        let yahoo_options = Object.assign({}, common_options, {enable: true, is_headless: true, debug_mode: false});
        let bing_options = Object.assign({}, common_options, {enable: true, is_headless: true, debug_mode: false});
        let duckduckgo_options = Object.assign({}, common_options, {enable: true, max_num_retries: 2, using_puppeteer: false});
        let yandex_options = Object.assign({}, common_options, {enable: true, is_headless: true, debug_mode: false}) ;
    
        await scraper(image_class, download_path, download_threshold, enable_fetching, enable_download,  google_options, yahoo_options, bing_options, duckduckgo_options, yandex_options);
    }
})();