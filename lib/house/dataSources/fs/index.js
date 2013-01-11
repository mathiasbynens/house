//
// # File System Data Source
//
// 
var fs = require('fs');
var spawn = require('child_process').spawn;

(exports = module.exports = function(options, house){
    var ds = {};
    ds.path = options.path || process.cwd();
    //
    // ## Find
    //
    // Query the File System
    //
    // 
    ds.find = function(basePath, query, callback) {
        if(query == '') query = '/';
        var fullPath = basePath + query;
        fs.stat(fullPath, function(err, stat){
            if(err) {
                house.log.err(err);
                return;
            }
            if(stat.isDirectory()) {
                // see if the request ended in a slash because dirs should
                if(query.substr(-1) !== '/') {
                    callback(301, '/');
                    return;
                }
                fs.readdir(fullPath, function(err, files){
                    // files will be an array of strings of both files and folders
                    if(err) {
                        house.log.err(err);
                    } else if(files) {
                        console.log(files);
                        var a = [];
                        for(var i in files) {
                            var d = files[i];
                            a.push({id: d, name:d});
                        }
                        
                        callback(null, a);
                    } else {
                        house.log.err(new Error('no files in dir'));
                    }
                });
            } else if(stat.isFile()) {
                fs.readFile(fullPath, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else if(data) {
                        var runFile = spawn("file", [ "-iNb", fullPath ]);
                        var runO = "";
                        runFile.stdout.on("data", function(filedata) {
                            runO += filedata.toString();
                        });
                        runFile.stderr.on("data", function(filedata) {
                            callback(new Error(filedata.toString()));
                        });
                        runFile.on("exit", function(code) {
                            runO = runO.replace(/[\n\r\t]/g, "");
                            var fileMime = runO.indexOf(";") != -1 ? runO.substring(0, runO.indexOf(";")) : runO;
                            var oId = query.substr(query.lastIndexOf('/')+1);
                            var dataout;
                            if(fileMime.indexOf('text') === 0) {
                                dataout = data.toString();
                            } else {
                                dataout = data.toString('base64');
                            }
                            callback(null, {data: dataout, id: query.substr(1), mime: fileMime, filename: query.substr(1), stat: {ctime: stat.ctime, atime: stat.atime, mtime: stat.mtime, size: stat.size}});
                        });
                    } else {
                        house.log.err(new Error('no data from file path'));
                    }
                });
            }
        });
    }
    ds.insert = function(colName, newDoc, callback) {
        // New file
        var fullPath = colName;
        console.log('fs insert '+fullPath);
        fs.stat(fullPath, function(err, stat){
            if(err) {
                house.log.err(err);
                return;
            }
            if(stat.isDirectory()) {
                console.log('dir')
                
                var makeNewFile = function(newFilePath, data, cb) {
                    console.log('makeNewFile '+newFilePath);
                    var fileStream = fs.createWriteStream(newFilePath, {'flags': 'w', 'mode': 0666, 'bufferSize': 4 * 1024})
                    .addListener("open", function(fd){
                        fileStream.write(data);
                        fileStream.destroy();
                    	
                        cb();
                    });
                }
                var makeNewFolder = function(newFolderPath, cb) {
                    fs.mkdir(newFolderPath, cb);
                }
                console.log(newDoc);
                if(newDoc.hasOwnProperty('name')) {
                    if(fullPath.substr(-1) !== '/') {
                        fullPath = fullPath + '/';
                    }
                    if(newDoc.hasOwnProperty('data')) {
                        var data = newDoc.data || '';
                        
                        if(newDoc.hasOwnProperty('mime') && newDoc.mime.indexOf('text') !== 0) {
                            var baseData = data;
                            data = new Buffer(baseData, 'base64');
                        }
                        
                        makeNewFile(fullPath+newDoc.name, data, function(){
                            callback(null, {id: newDoc.name, name: newDoc.name});
                        });
                    } else {
                        makeNewFolder(fullPath+newDoc.name, function(){
                            var n = newDoc.name.substr(0, newDoc.name.length-1);
                            callback(null, {id:n, name:n});
                        });
                    }
                } else {
                    callback(null, {});
                }
                
            } else {
                console.log('file')
                callback(null, {});
            }
        });
    }
    ds.remove = function(colName, query, callback) {
        // Delete path
        var fullPath = colName + query;
        fs.stat(fullPath, function(err, stat){
            if(err) {
                house.log.err(err);
                return;
            }
            if(stat.isDirectory()) {
                var rmRf = spawn("rm", [ "-Rf", fullPath ]);
                var runO = "";
                rmRf.stdout.on("data", function(filedata) {
                    runO += filedata.toString();
                });
                rmRf.stderr.on("data", function(filedata) {
                    callback(new Error(filedata.toString()));
                });
                rmRf.on("exit", function(code) {
                    callback(null, {});
                });
            } else {
                fs.unlink(fullPath, function(){
                    callback(null, {});
                });
            }
        });
    }
    ds.update = function(colName, query, editDoc, callback) {
        console.log(editDoc)
        // Edit file
        var fullPath = colName + query;
        console.log(fullPath)
        fs.writeFileSync(fullPath, editDoc);
        callback(null, {});
    }
    ds.info = function(colName, query, callback) {
        // file info
    }
    
    return ds;
});