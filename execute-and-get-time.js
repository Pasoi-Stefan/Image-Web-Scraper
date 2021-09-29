module.exports = custom_console => {
    return async (beforeMessage, afterMessage, callback, ...args) => {
        custom_console.log(`${beforeMessage}...`);
        let start, end; // variables used to calculate execution time
        start =  Date.now();
        let result = await callback(...args);
        end =  Date.now();
        custom_console.log(`${afterMessage} - ${Math.trunc((end - start) / 1000 / 60)}m ${Math.trunc((end - start) / 1000 % 60)}s`);
        return result;
    };
}
