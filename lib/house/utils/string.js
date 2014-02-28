(function(){
    var string = module.exports = {};
    
    string.slugify = function(str) {
        return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
    }
    string.getBytes = function(str) {
        if(typeof str !== 'string') {
            str = JSON.stringify(str);
        }
        // console.log(typeof str)
        // if(typeof str !== 'string') {
        //     console.log(str);
        // }
        return Buffer.byteLength(str, 'utf8');
    }
})();