//
// # File System API Endpoint
//
var fs = require('fs');
var util = require('util');
(exports = module.exports = function(house, options){
    // This endpoint requires a data source
    var ds = options.ds;
    var basePath = options.ds.path;
    
    var handleReq = function(req, res, next) {
        var procFile = function(file, path, callback) {
            console.log(file);
            //name, type, size
            house.log.debug('move upload to fs - '+basePath+path+file.name);
            
            var is = fs.createReadStream(file.path)
            var os = fs.createWriteStream(basePath+path+file.name);
            util.pump(is, os, function() {
                if(callback) {
                    callback({id: file.name, name: file.name, size: file.size, type: file.type});
                }
            });
        }
        if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
        } else {
            res.writeHead(403);
            res.end('{}');
            return;
        }
        
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        if(req.method == 'GET') {
            ds.find(basePath, path, function(err, data){
                if(err) {
                    if(err === 301) {
                        house.utils.response.redirect(res, req.url+data);
                    } else {
                        house.log.err(err);
                    }
                } else if(data) {
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from fs find'));
                }
            });
        } else if(req.method == 'POST') {
            house.log.debug('post');
            console.log(path)
            console.log(req.fields)
            var datas = [];
            var requestFiles = [];
            if(req.files && _.size(req.files) > 0) {
                for(var i in req.files) {
                    requestFiles.push(req.files[i]);
                }
                var procNextFile = function(){
                    var file = requestFiles.pop();
                    if(file) {
                        procFile(file, path, function(data){
                            datas.push(data);
                            fs.unlink(file.path, function(){
                                //console.log('file unlinked from tmp');
                            });
                            if(requestFiles.length > 0) {
                                procNextFile();
                            } else {
                                // done
                                res.data(datas);
                            }
                        });
                    }
                }();
            } else if (req.fields) {
                ds.insert(basePath+decodeURIComponent(path), req.fields, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
                    }
                });
            }
        } else if(req.method == 'PUT') {
            house.log.debug('fs put');
            var editData = '';
            if(req.fields.hasOwnProperty('$set')) {
                req.fields = req.fields.$set;
            }
            if(req.fields.hasOwnProperty('data')) {
                editData = req.fields.data;
                
                if(req.fields.hasOwnProperty('mime') && req.fields.mime.indexOf('text') !== 0) {
                    editData = new Buffer(editData, 'base64');
                }
            }
            house.log.debug(editData);
            ds.update(basePath, decodeURIComponent(path), editData, function(err, data){
                if(err) {
                    house.log.err(err);
                    res.end('error');
                } else {
                    res.data(data);
                }
            });
        } else if(req.method == 'DELETE') {
            house.log.debug('delete '+decodeURIComponent(path));
            ds.remove(basePath, decodeURIComponent(path), function(err, data){
                if(err) {
                    house.log.err(err);
                    res.end('error');
                } else {
                    res.data(data);
                }
            });
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
