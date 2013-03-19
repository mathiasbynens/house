(function(){
    var spawn = require('child_process').spawn;
    var media = module.exports = {};
    media.fs = {};
    media.fs.getFileMime = function(fullPath, callback) {
        var getMimeViaExif = function(callback) {
            var exif = spawn("/usr/bin/exiftool", [ "-MimeType", fullPath ]);
            var exifOut = "";
            exif.stdout.on("data", function(data) {
                exifOut += data.toString();
            });
            exif.stderr.on("data", function(data) {
                console.log("stderr: " + data);
                console.dir(data);
            });
            exif.on("close", function(code) {
                //house.log.debug("upload.getMime exif process exited with code " + code);
                if (code == 0) {
                    var exifObject = {};
                    exifOut = exifOut.split("\n");
                    exifOut.forEach(function(e, i) {
                        var tmp = e.split(": ");
                        exifObject[tmp[0].trim().replace(" ", "")] = tmp[1];
                    });
                    //house.log.debug(exifObject);
                    var mimeType = "";
                    if (exifObject.hasOwnProperty("MIMEType")) {
                        //house.log.debug('exif has mime type');
                        callback(null, exifObject["MIMEType"]);
                    } else {
                        var err = new Error("could not find mime type");
                        //house.log.err(err);
                        callback(err);
                    }
                }
            });
        };
        getMimeViaExif(function(err, data){
            if(err) {
                //house.log.err(err);
                //house.log.err('lets try getMimeViaFile');
                getMimeViaFile(function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        callback(null, data)
                    }
                });
            } else {
                callback(null, data)
            }
        });
        var getMimeViaFile = function(callback) {
            var runFile = spawn("file", [ "-iNb", fullPath ]);
            var runO = "";
            runFile.stdout.on("data", function(data) {
                runO += data.toString();
            });
            runFile.stderr.on("data", function(data) {
                callback(new Error(data.toString()));
            });
            runFile.on("close", function(code) {
                runO = runO.replace(/[\n\r\t]/g, "");
                var fileMime = runO.indexOf(";") != -1 ? runO.substring(0, runO.indexOf(";")) : runO;
                callback(null, fileMime);
            });
        };
    };
    
    media.exif = {};
    
    media.exif.getFromPath = function(filePath, callback) {
       var self = this;
       var exif = spawn('/usr/bin/exiftool', [filePath]);
       var exifOut = '';
       exif.stdout.on('data', function (data) {
         //console.log('stdout: ' + data);
         exifOut += data.toString();
       });
    
       exif.stderr.on('data', function (data) {
         console.log('stderr: ' + data);
         console.dir(data);
       });
    
       exif.on('close', function (code) {
         //console.log('exiftool process exited with code ' + code);
         if(code == 0){ // good
           var exifObject = {};
           exifOut = exifOut.split('\n');
           exifOut.forEach(function(e, i){
             var tmp = e.split(': ');
             exifObject[tmp[0].trim()] = tmp[1];
           });
           //console.log(exifObject);
           if(self.hasOwnProperty('resultCb')) {
               self.resultCb(exifObject);
           }
           if(callback) {
               callback(exifObject);
           }
         }
       });
           
        return {
            "result": function(callback){
                self.resultCb = callback;
            }
        }
    }
    
    media.exif.getImageTime = function(exifObject) {
        var imageTime = false;
        if (exifObject.hasOwnProperty("Create Date")) {
            imageTime = exifObject["Create Date"];  //2008:09:07 07:07:06+02:00
        } else if (exifObject.hasOwnProperty("Date/Time Original")) {
            imageTime = exifObject["Date/Time Original"];
        } else if (exifObject.hasOwnProperty("File Modification Date/Time")) {
            imageTime = exifObject["File Modification Date/Time"];
        } else if (exifObject.hasOwnProperty('Modify Date')) {
            imageTime = exifObject['Modify Date'];
        } else if (exifObject.hasOwnProperty("Profile Date Time")) {
            imageTime = exifObject["Profile Date Time"];
        }
        if(imageTime) {
            var ix = imageTime.indexOf('+');
            var iy = imageTime.indexOf('-');
            var modHours = 0;
            if(ix !== -1) {
                var tz = imageTime.substring(ix+1);
                tz = tz.split(":");
                modHours = parseInt(tz[0]) + parseInt(tz[1]) / 60;
                imageTime = imageTime.substring(0,ix);
            }
            if(iy !== -1) {
                var tz = imageTime.substring(iy+1);
                tz = tz.split(":");
                modHours = (-1 * parseInt(tz[0]) + parseInt(tz[1]) / 60);
                imageTime = imageTime.substring(0,iy);
            }
            var tempDate = imageTime.split(" ");
            var tempDateOne = tempDate[0].split(":");
            var tempDateTwo = tempDate[1].split(":");
            var hours = parseInt(tempDateTwo[0], 10); // + modHours;
            var newImageDate = new Date(parseInt(tempDateOne[0], 10), parseInt(tempDateOne[1], 10) - 1, parseInt(tempDateOne[2], 10), hours, parseInt(tempDateTwo[1], 10), parseInt(tempDateTwo[2], 10));
            imageTime = newImageDate;
        } else {
            house.log.debug("no imageTime");
        }
        return imageTime;
    }
    
    media.exif.getLatLng = function(exifObject) {
        if(exifObject.hasOwnProperty("GPS Latitude")) {
            var glat = exifObject["GPS Latitude"];
            var glong = exifObject["GPS Longitude"];
            var dms2dd = function(s) {var sw = /[sw]/i.test(s);var f = sw ? -1 : 1;var bits = s.match(/[\d.]+/g);var result = 0;for (var i = 0, iLen = bits.length; i < iLen; i++) {result += bits[i] / f;f *= 60;}return result;};
            var lat = dms2dd(glat);
            var lng = dms2dd(glong);
            return [ lat, lng ];
        } else {
            return false;
        }
    }
    
    var imagemagick = require("imagemagick");
    media.imagemagick = {};
    
    media.imagemagick.convertToGrid = function(convert, convertedPath, db, filesCol, dbPath, mimeType, newFileMeta, callback) {
        console.log('convertToGrid');
        var saveResult = function(savePath) {
            //house.log.debug("savePath: " + savePath);
            media.gridfs.importFile(db, filesCol, dbPath, savePath, mimeType, newFileMeta, function(err, gridfile) {
                //house.log.debug('uploadedFile from imagick to db');
                callback(err, gridfile, savePath);
            });
        };
        imagemagick.convert(convert, function(err, stdout, stderr) {
            if (err) {
                house.log.err(err);
            } else {
                var convertedPathSplit = convertedPath.substr(0, convertedPath.lastIndexOf(".")) + "-0" + convertedPath.substr(convertedPath.lastIndexOf("."));
                fs.stat(convertedPathSplit, function(err, stat) {
                    if (err || !stat.isFile()) {
                        fs.stat(convertedPath, function(err, stat) {
                            if (err || !stat.isFile()) {
                                callback(err);
                            } else {
                                saveResult(convertedPath);
                            }
                        });
                    } else {
                        saveResult(convertedPathSplit);
                    }
                });
            }
        });
    };
    
    media.gridfs = {};
    
    media.gridfs.getUniqueFilename = function(db, filesCol, name, callback) {
        mongo.GridStore.exist(db, name, filesCol, function(err, result) {
            if(result) {
                var r = Math.floor(Math.random()*99999);
                var n = name.split('.');
                media.gridfs.getUniqueFilename(db, filesCol, n[0]+"_"+r+"."+n[1], callback);
            } else {
                callback(name);
            }
        });
    }
    
    media.gridfs.isUniqueMD5 = function(db, filesCol, md5, callback) {
        db.count(filesCol, {'metadata.md5': md5}, function(err, count){
            if(err) {
                house.log.err(err);
            } else {
                if(count) {
                    callback(false);
                } else {
                    callback(true);
                }
            }
        });
    }
    
    media.gridfs.importFile = function(db, filesCol, gridFilename, filePath, mimeType, metadata, callback) {
        //console.log('importFile');
        //console.log(filesCol);
        var self = this;
        var file_name = decodeURIComponent(gridFilename);
        //file_name.substr(0,file_name.lastIndexOf('.')).replace('.','')+file_name.substr(file_name.lastIndexOf('.'));
        media.gridfs.getUniqueFilename(db, filesCol, file_name, function(unique_file_name) {
            var uploadFileGridStore = new mongo.GridStore(db, unique_file_name, "w", {
                content_type: mimeType,
                metadata: metadata,
                root: filesCol
            });
            uploadFileGridStore.writeFile(filePath, function(err, gridFile){
                //console.log('uploadFileGridStore.writeFile');
                //console.log(gridFile);
                callback(err, gridFile);
            });
        });
    }
    
    media.gridfs.getReadableFile = function(db, filesCol, filename) {
        return new mongo.GridStore(db, filename, "r", {'root': filesCol});
    }
    
    media.gridfs.writeFileToPath = function(db, filesCol, gridPath, fullPath, callback) {
        //house.log.debug('media.writeGridFileToPath');
        //house.log.debug(filesCol);
        var fileStream = fs.createWriteStream(fullPath);
        fileStream.on('open', function(fd) {
            var gridStore = new mongo.GridStore(db, gridPath, "r", {'root': filesCol});
            gridStore.open(function(err, gridStore) {
                if(err) {
                    house.log.err(err);
                    callback(err);
                } else {
                    var chunkSize = 1024
                    , lengthRemaining = gridStore.length;
                    if(lengthRemaining < chunkSize) {
                       chunkSize = lengthRemaining;
                     }
                    var gridStoreReadChunk = function(gs) {
                         var readAndSend = function(chunk) {
                           gs.read(chunk, function(err, data) {
                         	if(err) {
                         	  house.log.err(err);
                         	  house.log.err('file read err');
                         	} else {
                               fileStream.write(data, 'binary');
                               lengthRemaining = lengthRemaining - chunk;
                               if(lengthRemaining < chunkSize) {
                                 chunkSize = lengthRemaining;
                               }
                             }
                             if(lengthRemaining === 0) {
                               // close the gridstore
                               gs.close(function(){
                                   //house.log.debug('gridstore closed');
                               });
                               fileStream.end();
                               fileStream.on('close', function() {
                                   callback();
                               });
                             } else {
                               readAndSend(chunkSize);
                             }
                           }); // read
                         }
                         if(chunkSize > 0) {
                           readAndSend(chunkSize);
                         }
                    } // gridStoreReadChunk
                    gridStoreReadChunk(gridStore);
                }
            });
        });
    }
    
    media.gridfs.importBuffer = function(db, filesColRoot, fileBuffer, fileName, contentType, metadata, callback) {
        var self = this;
        media.gridfs.getUniqueFileName(db, filesCol, fileName, function(file_name) {
            var gridStore = new mongo.GridStore(db, file_name, "w", {
                content_type: contentType,
                metadata: metadata,
                root: filesColRoot
            });
            gridStore.open(function(err, gridstore) {
                gridStore.write(fileBuffer.toString("binary"), function(err, gridStore) {
                    if (err) {
                        house.log.err(err);
                    } else {
                        gridStore.close(function(err, result) {
                            upload.processFile(result, callback);
                        });
                    }
                });
            });
        });
    };
    
    media.gridfs.importUrl = function(db, filesCol, url, metadata, callback) {
        var urlFilename = "/url/" + decodeURIComponent(url).replace(/[:\/]/g, ".");
        media.url.importFileToTmp(url, function(err, fullPath) {
            if(err) {
                house.log.err(err);
            } else if(fullPath) {
                media.fs.getFileMime(fullPath, function(err, mimeType){
                    if(err) {
                        house.log.err(err);
                    } else if(mimeType) {
                        media.exif.getFromPath(fullPath, function(exif) {
                            metadata.exif = exif;
                            media.gridfs.importFile(db, filesCol, fullPath, fullPath, mimeType, metadata, callback);
                        });
                    } else {
                        house.log.err('invalid mime');
                        callback(new Error("Inavlid Mime"));
                    }
                });
            }
        });
    }
    
    media.url = {};
    
    media.url.importFileToTmp = function(url, callback) {
        var self = this;
        var tmpPath = url;
        if (tmpPath.length > 200) tmpPath = tmpPath.substr(0, 200);
        var fullPath = "/tmp/" + encodeURIComponent(tmpPath);
        //console.log(fullPath);
        var fileStream = fs.createWriteStream(fullPath, {
            flags: "w",
            mode: 438,
            bufferSize: 4 * 1024
        }).addListener("open", function(fd) {});
        var userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_5_8) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.68 Safari/534.24";
        var curl = spawn("curl", [ "--user-agent", userAgent, "-L", url ]);
        //var curl = spawn("curl", [ "-L", url ]);
        curl.stdout.on("data", function(data) {
            if (data) {
                fileStream.write(data);
            }
        });
        curl.stderr.on("data", function(data) {
            //console.log("curl stderr: " + data);
        });
        curl.on("close", function(code) {
            fileStream.destroy();
            //console.log("curl close");
            callback(null, fullPath);
        });
    };
})();