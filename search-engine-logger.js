const fs = require('fs').promises; // https://nodejs.org/api/fs.html#fs_promises_api
const fs_sync = require('fs'); // https://nodejs.org/api/fs.html#fs_callback_api
const util = require('util'); // https://nodejs.org/api/util.html

module.exports = async (search_engine, path) => {
    return await new CustomConsole(search_engine, path).init();
};

// this creates a class used to instantiate a console object which also writes to a log file when calling log()
class CustomConsole {
    constructor (search_engine, path) {
        this.search_engine = search_engine;
        this.path = path;
    }

    async init() {
        if(this.search_engine) {
            // in case the directory for info related to search engine results exists, delete it
            await fs.rmdir(`${this.path}`, {recursive: true});

            // create a directory in download path to store info related to search engine results
            await fs.mkdir(`${this.path}`, {recursive: true});

            // open the log file for writing the search engine log
            this.file_handler = fs_sync.createWriteStream(`${this.path}/${this.search_engine}-log.txt`);

            // the search engine name is prepended before every message
            this.prefix = `(${this.search_engine}) `;
        }
        else {
            // open the log file for writing the scraper general log
            this.file_handler = fs_sync.createWriteStream(`${this.path}`);

            // if string is empty, then the logger will be console.log() without any additional information logged
            this.prefix = '';
        }

        this.log = (...args) => {
            // JSON.stringify() could be used instead of util.inspect(), but undefined and functions are not shown;
            // use the 'colors' option to use colors for different data types, like console.log() would;
            // use the 'depth' option with null to show full recursion, unlike console.log(), which shows recursion for up to two levels;
            // strings in util.inspect() keep the quotes and newline characters (https://github.com/nodejs/node/issues/9406), so we treat this case separately
            let message = args.map(el => {
                if(typeof(el) === 'string')
                    return el;
                
                return util.inspect(el, {depth: null});
            }).join(' ');
            // using 'await fs.open()' from fs/promises means log function becomes an async function and I have to write 'await console.log()' when I want to call it
            this.file_handler.write(`${this.prefix}${message}\n`);
            console.log(`${this.prefix}${message}`);
        }

        return this;
    }

    changePrefix(prefix_extension) {
        this.prefix = `${this.search_engine ? `(${this.search_engine})` : ''} ${prefix_extension} `;
    }
}