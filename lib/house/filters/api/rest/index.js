// # API Filter
//
// ## REST API
//

(exports = module.exports = function(house, options){
    house.api = {};
    if(!options) {
        var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('api')); });
        options = (filter && filter.api && filter.api.hasOwnProperty('rest')) ? filter.api.rest : {};
    }
        
    if(options.hasOwnProperty('endPoints')) {
        house.api.endPoints = require(options.endPoints)(house);
    } else {
        house.api.endPoints = require(process.cwd()+'/endPoints')(house);
    }
    
    var handleReq = function(req, res, next) {
        req.urlParsed = url.parse(req.url, true);
        console.log(req.urlParsed)
        if(req.urlParsed.search) {
          req.query = req.urlParsed.query; //querystring.parse(req.urlParsed.query);
          if(_.size(req.query) === 1) {
              for(var i in req.query) {
                  if(req.query[i] === '') {
                      var json = JSON.parse(i);
                      req.query = json;
                  }
              }
          }
        }
        //
        // endpoints can respond using this method to handle the common rest request,
        // taking the accept type into consideration
        //
        res.data = function(data){
            var sendResJson = function() {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
            }
            var sendResText = function() {
                if(typeof data !== 'string') {
                    data = JSON.stringify(data, null, 4);
                }
                res.end(data);
            }
            
            if(req.headers.hasOwnProperty('accept')) {
                var acceptType = req.headers.accept;
                
                if(acceptType.indexOf('json') !== -1) {
                    sendResJson();
                } else {
                    sendResText();
                }
            } else {
                sendResJson();
            }
        }
        
        //
        // Describe our api endpoints
        //
        if(req.url === '/') {
            res.data(house.api.endPointsList);
            return;
        }
        
        // route to known endpoints
        
        for(var i in house.api.endPoints) {
            for(var path in house.api.endPoints[i]) {
                if(req.url.indexOf(path) === 1) {
                    
                    house.log.debug('api endpoint '+path);
                    
                    req.url = req.url.substr(path.length+1);
                    
                    house.log.debug('modified req.url '+req.url);
                    
                    house.api.endPoints[i][path].apply(this, arguments);
                    return;
                }
            }
        }
        next();
    };
    return handleReq;
});
