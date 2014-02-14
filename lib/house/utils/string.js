(function(){
    var string = module.exports = {};
    
    string.slugify = function(str) {
        return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
    }
})();