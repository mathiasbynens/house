//
// # File System Data Source
//
// 
var fs = require('fs');
(exports = module.exports = function(options){
    var ds = {};
    
    //
    // ## Find
    //
    // Query the File System
    //
    // 
    //
    ds.find = function(basePath, query, callback) {
        if(query == '') query = '/';
        var fullPath = basePath + query;
        fs.stat(fullPath, function(err, stat){
            if(stat.isDirectory()) {
                fs.readdir(fullPath, function(err, files){
                    // files will be an array of strings of both files and folders
                    if(err) {
                        house.log.err(err);
                    } else if(files) {
                        var j = {};
                        j[query] = files;
                        callback(null, j);
                    } else {
                        house.log.err(new Error('no files in dir'));
                    }
                });
            } else if(stat.isFile()) {
                fs.readFile(fullPath, function(err, data){
                    // files will be an array of strings of both files and folders
                    if(err) {
                        house.log.err(err);
                    } else if(data) {
                        var j = {};
                        j[query] = data.toString();
                        callback(null, j);
                    } else {
                        house.log.err(new Error('no data from file path'));
                    }
                });
            }
        });
    }
    ds.insert = function(colName, newDoc, callback) {
        // New file
    }
    ds.del = function(colName, query, callback) {
        // Delete path
    }
    ds.edit = function(colName, query, editDoc, callback) {
        // Edit file
    }
    ds.info = function(colName, query, callback) {
        // file info
    }
    
    return ds;
});