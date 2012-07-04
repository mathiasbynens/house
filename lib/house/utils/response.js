(function(){
    var response = module.exports = {};
    
    response.redirect = function(res, url, code){
        if(!code) code = 301;
        
        var headerFields = {
            "Location": url
        }
        
        res.writeHead(code, headerFields);
        res.end();
    }
})();