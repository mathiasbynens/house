//
// # File System API Endpoint
//
(exports = module.exports = function(house, options){
    // This endpoint requires a data source
    var ds = options.ds;
    var basePath = options.path;
    
    var handleReq = function(req, res, next) {
        var path = req.url;
        if(req.method == 'GET') {
            house.log.debug('get');
            ds.find(basePath, path, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from fs find'));
                }
            });
        } else if(req.method == 'POST') {
            house.log.debug('post');
            ds.insert(basePath, path);
        } else if(req.method == 'PUT') {
            house.log.debug('put');
            //ds.update(basePath, path);
            res.end('test');
        } else if(req.method == 'DELETE') {
            
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
