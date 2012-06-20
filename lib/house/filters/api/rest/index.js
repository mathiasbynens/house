// # API Filter
//
// ## REST API
//
var util = require('util');
(exports = module.exports = function(house){
    var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('api')); });
    var options = (filter && filter.api && filter.api.hasOwnProperty('rest')) ? filter.api.rest : {};
    var handleReq = function(req, res, next) {
        //next();
        //res.write(util.inspect(req.fields));
        if(req.fields) {
            //console.log(JSON.stringify(req.fields));
            res.end(JSON.stringify(req.fields));
        } else {
            res.end('api '+req.method+' request to '+req.url);
        }
    };
    return handleReq;
});
