(function() {
    var spawn = require('child_process').spawn;
    var media = module.exports = {};
    media.fs = {};
    media.fs.getFileMime = function(fullPath, callback) {
        var getMimeViaExif = function(callback) {
            var calledback = false;
            var exif = spawn("/usr/bin/exiftool", ["-MimeType", fullPath]);
            var exifOut = "";
            var errMsg = '';
            exif.stdout.on("data", function(data) {
                exifOut += data.toString();
            });
            exif.stderr.on("data", function(data) {
                console.log("getMimeViaExif stderr: " + data);
                console.dir(data);
                errMsg = data.toString();
                if(!calledback) {
                    //calledback = true;
                    //callback(new Error(data.toString()));
                }
            });
            exif.on("close", function(code) {
                //house.log.debug("upload.getMime exif process exited with code " + code);
                if(code == 0) {
                    var exifObject = {};
                    exifOut = exifOut.split("\n");
                    exifOut.forEach(function(e, i) {
                        var tmp = e.split(": ");
                        exifObject[tmp[0].trim().replace(" ", "")] = tmp[1];
                    });
                    //house.log.debug(exifObject);
                    var mimeType = "";
                    if(exifObject.hasOwnProperty("MIMEType")) {
                        //house.log.debug('exif has mime type');
                        // house.log.debug('using mime from exifObject.MIMEType: ' + exifObject["MIMEType"]);
                        callback(null, exifObject["MIMEType"]);
                    } else {
                        var err = new Error("could not find mime type via exiftool");
                        //house.log.err(err);
                        if(!calledback) {
                            calledback = true;
                            callback(err);
                        }
                    }
                } else {
                    if(errMsg) {
                        callback(new Error(errMsg));
                    } else {
                        callback(new Error("Unknown error from getMimeViaExif"));
                    }
                }
            });
        };
        var getMimeViaMimeType = function(callback) {
            var exif = spawn("mimetype", [fullPath]);
            var exifOut = "";
            exif.stdout.on("data", function(data) {
                exifOut += data.toString();
            });
            exif.stderr.on("data", function(data) {
                console.log("stderr mimetype: " + data);
                console.dir(data);
                //callback(new Error(data.toString()));
            });
            exif.on("close", function(code) {
                console.log('close mimetype ' + code);
                //console.log(code);
                //house.log.debug("upload.getMime exif process exited with code " + code);
                if(code == 0) {
                    var exifObject = {};
                    exifOut = exifOut.split("\n");
                    exifOut.forEach(function(e, i) {
                        var tmp = e.split(": ");
                        exifObject[tmp[0].trim().replace(" ", "")] = tmp[1];
                    });
                    //house.log.debug(exifObject);
                    var mimeType = "";
                    if(exifObject.hasOwnProperty("MIMEType")) {
                        //house.log.debug('exif has mime type');
                        // house.log.debug('using mime from mimetype exifObject.MIMEType: ' + exifObject["MIMEType"]);
                        callback(null, exifObject["MIMEType"]);
                    } else {
                        var err = new Error("could not find mime type via mimetype");
                        //house.log.err(err);
                        callback(err);
                    }
                }
            });
        };
        var getMimeViaFile = function(callback) {
            // house.log.debug('getMimeViaFile')
            var runFile = spawn("file", ["-iNb", fullPath]);
            var runO = "";
            runFile.stdout.on("data", function(data) {
                runO += data.toString();
            });
            runFile.stderr.on("data", function(data) {
                console.log('getMimeViaFile err');
                //callback(new Error(data.toString()));
            });
            runFile.on("close", function(code) {
                // house.log.debug('getMimeViaFile close code ' + code);
                runO = runO.replace(/[\n\r\t]/g, "");
                var fileMime = runO.indexOf(";") != -1 ? runO.substring(0, runO.indexOf(";")) : runO;
                // house.log.debug('using mime from getMimeViaFile: ' + fileMime);
                callback(null, fileMime);
            });
        };
        getMimeViaExif(function(err, data) {
            if(err) {
                //house.log.err(err);

                console.log(err);
                if(err.message.indexOf('File not found:') !== -1) {
                    // house.log.debug('dont look any further if file not found');
                    callback(err);
                } else {
                    house.log.err('lets try getMimeViaFile');
                    getMimeViaFile(function(err, data) {
                        if(err) {
                            house.log.err('err with getting meta via file');
                            house.log.err(err);
                            callback(err);
                        } else {
                            //console.log('getMimeViaFile calledback')
                            //console.log(data)
                            callback(null, data);
                        }
                    });
                }
            } else {
                callback(null, data);
            }
        });
    };

    media.exif = {};

    media.exif.getFromPath = function(filePath, callback) {
        //console.log('media.exif.getFromPath');
        var self = this;
        var exif = spawn('/usr/bin/exiftool', [filePath]);
        var exifOut = '';
        exif.stdout.on('data', function(data) {
            //console.log('stdout: ' + data);
            exifOut += data.toString();
        });

        exif.stderr.on('data', function(data) {
            //console.log('stderr: ' + data);
            //console.dir(data);
        });

        exif.on('close', function(code) {
            //console.log('media.exif.getFromPath process exited with code ' + code);
            if(code == 0) { // good
                var exifObject = {};
                exifOut = exifOut.split('\n');
                exifOut.forEach(function(e, i) {
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
            "result": function(callback) {
                self.resultCb = callback;
            }
        }
    }

    media.exif.getDurationTime = function(str) {
        var hrs, mins, secs;
        var iof = str.indexOf(' (approx)');
        if(iof !== -1) {
            str = str.substr(0, iof);
        }
        var dArr = str.split(':');
        secs = parseInt(dArr.pop(), 10);
        var seconds = secs;
        mins = parseInt(dArr.pop(), 10);
        seconds = seconds + (mins * 60);
        if(dArr.length) {
            hrs = parseInt(dArr.pop(), 10);
            seconds = seconds + (hrs * 60 * 60);
        }
        return seconds;
    }

    media.exif.getImageTime = function(exifObject) {
        var imageTime = false;
        if(exifObject.hasOwnProperty("Create Date")) {
            imageTime = exifObject["Create Date"]; //2008:09:07 07:07:06+02:00
        } else if(exifObject.hasOwnProperty("Date/Time Original")) {
            imageTime = exifObject["Date/Time Original"];
        } else if(exifObject.hasOwnProperty("File Modification Date/Time")) {
            imageTime = exifObject["File Modification Date/Time"];
        } else if(exifObject.hasOwnProperty('Modify Date')) {
            imageTime = exifObject['Modify Date'];
        } else if(exifObject.hasOwnProperty("Profile Date Time")) {
            imageTime = exifObject["Profile Date Time"];
        }
        if(imageTime) {
            var ix = imageTime.indexOf('+');
            var iy = imageTime.indexOf('-');
            var modHours = 0;
            if(ix !== -1) {
                var tz = imageTime.substring(ix + 1);
                tz = tz.split(":");
                modHours = parseInt(tz[0]) + parseInt(tz[1]) / 60;
                imageTime = imageTime.substring(0, ix);
            }
            if(iy !== -1) {
                var tz = imageTime.substring(iy + 1);
                tz = tz.split(":");
                modHours = (-1 * parseInt(tz[0]) + parseInt(tz[1]) / 60);
                imageTime = imageTime.substring(0, iy);
            }
            var tempDate = imageTime.split(" ");
            var tempDateOne = tempDate[0].split(":");
            var tempDateTwo = tempDate[1].split(":");
            var hours = parseInt(tempDateTwo[0], 10); // + modHours;
            var newImageDate = new Date(parseInt(tempDateOne[0], 10), parseInt(tempDateOne[1], 10) - 1, parseInt(tempDateOne[2], 10), hours, parseInt(tempDateTwo[1], 10), parseInt(tempDateTwo[2], 10));
            imageTime = newImageDate;
        } else {
            // house.log.debug("no imageTime");
        }
        return imageTime;
    }

    media.exif.getLatLng = function(exifObject) {
        if(exifObject.hasOwnProperty("GPS Latitude")) {
            var glat = exifObject["GPS Latitude"];
            var glong = exifObject["GPS Longitude"];
            var dms2dd = function(s) {
                var sw = /[sw]/i.test(s);
                var f = sw ? -1 : 1;
                var bits = s.match(/[\d.]+/g);
                var result = 0;
                for(var i = 0, iLen = bits.length; i < iLen; i++) {
                    result += bits[i] / f;
                    f *= 60;
                }
                return result;
            };
            var lat = dms2dd(glat);
            var lng = dms2dd(glong);
            return [lat, lng];
        } else {
            return false;
        }
    }

    var imagemagick = require("imagemagick");
    media.imagemagick = {};
    
    media.imagemagick.identifyWidthHeight = function(filePath, callback) {
        //"%w,%h"
        var self = this;
        var sepStr = ' || ';
        var identify = spawn('identify', ["-format", "%w,%h"+sepStr, filePath]);
        var identifyOut = '';
        identify.stdout.on('data', function(data) {
            //console.log('stdout: ' + data);
            identifyOut += data.toString();
        });

        identify.stderr.on('data', function(data) {
            //console.log('stderr: ' + data);
            //console.dir(data);
        });

        identify.on('close', function(code) {
            // console.log('media.identify process exited with code ' + code);
            // console.log(identifyOut)
            if(code === 0) { // good
                var identifyObject;
                var identitiesArr;
                identitiesArr = identifyOut.split(sepStr);
                // console.log(identitiesArr)
                // Grab last frame 
                var lastIdent = identitiesArr[identitiesArr.length - 2]; // format gives us a trailing seprator
                // console.log(lastIdent)
                // split w,h
                identifyObject = lastIdent.split(',');
                // console.log(identifyObject);
                if(identifyObject.length > 1 && callback) {
                    callback(null, parseInt(identifyObject[0].trim(),10), parseInt(identifyObject[1].trim(),10));
                }
            } else {
                callback(new Error("identify failed"));
            }
        });
    }

    media.imagemagick.convertToGrid = function(convert, convertedPath, db, filesCol, dbPath, mimeType, newFileMeta, callback) {
        //console.log('convertToGrid');
        var saveResult = function(savePath) {
            //house.log.debug("savePath: " + savePath);
            media.gridfs.importFile(db, filesCol, dbPath, savePath, mimeType, newFileMeta, function(err, gridfile) {
                //house.log.debug('uploadedFile from imagick to db');
                callback(err, gridfile, savePath);
            });
        };
        imagemagick.convert(convert, function(err, stdout, stderr) {
            if(err) {
                house.log.err(err);
            } else {
                var convertedPathSplit = convertedPath.substr(0, convertedPath.lastIndexOf(".")) + "-0" + convertedPath.substr(convertedPath.lastIndexOf("."));
                fs.stat(convertedPathSplit, function(err, stat) {
                    if(err || !stat.isFile()) {
                        fs.stat(convertedPath, function(err, stat) {
                            if(err || !stat.isFile()) {
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
    
    media.gridfs.getDocFromGridStore = function(gridStore) {
        
        return _.clone({
            id: gridStore.fileId,
            filename: gridStore.filename,
            length: gridStore.position,
            contentType: gridStore.contentType,
            metadata: _.clone(gridStore.metadata),
            uploadDate: gridStore.uploadDate
        });
    }

    media.gridfs.getUniqueFilename = function(db, filesCol, name, callback) {
        mongo.GridStore.exist(db, name, filesCol, function(err, result) {
            if(result) {
                var r = Math.floor(Math.random() * 99999);
                var n = name.split('.');

                var i = name.lastIndexOf('.');
                if(i === -1) {
                    media.gridfs.getUniqueFilename(db, filesCol, name + "_" + r, callback);
                } else {
                    media.gridfs.getUniqueFilename(db, filesCol, name.substr(0, i) + "_" + r + name.substr(i), callback);
                }

            } else {
                callback(name);
            }
        });
    }

    media.gridfs.isUniqueMD5 = function(db, filesCol, md5, callback) {
        db.count(filesCol, {
            'metadata.md5': md5
        }, function(err, count) {
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
        house.log.debug('media.gridfs.importFile ' + gridFilename);
        //console.log(filePath); 
        //console.log(mimeType);
        //console.log(metadata);
        var self = this;
        try {
            var file_name = gridFilename; // decodeURIComponent
            //file_name.substr(0,file_name.lastIndexOf('.')).replace('.','')+file_name.substr(file_name.lastIndexOf('.'));
            media.gridfs.getUniqueFilename(db, filesCol, file_name, function(unique_file_name) {
                //house.log.debug('unique filename found: '+unique_file_name);
                var uploadFileGridStore = new mongo.GridStore(db, unique_file_name, "w", {
                    content_type: mimeType,
                    metadata: metadata,
                    root: filesCol
                });
                uploadFileGridStore.open(function(err, uploadFileGridStore) {
                    // house.log.debug('uploadFileGridStore.writeFile');
                    if(err) {
                        house.log.err(err);
                    }
                    uploadFileGridStore.writeFile(filePath, function(err, gridFile) {
                        if(err) {
                            house.log.debug('ERR with upload file to gridstore!');
                            house.log.debug(err);
                            callback(err);
                        } else {
                            // house.log.debug('uploadFileGridStore.writeFile success, unique_file_name: '+unique_file_name);
                            // house.log.debug(gridFile);
                            callback(null, gridFile);
                        }
                    });
                });
            });
        } catch(err) {
            house.log.err(err);
        }
    }

    media.gridfs.getReadableFile = function(db, filesCol, filename) {
        return new mongo.GridStore(db, filename, "r", {
            'root': filesCol
        });
    }
    
    media.gridfs.readFile = function(db, filesRoot, filename, callback) {
        mongo.GridStore.exist(db, filename, filesRoot, function(err, result) {
            if(result) {
                house.utils.media.gridfs.getReadableFile(db, filesRoot, filename).open(function(err, gs){
                    if(err) {
                        house.log.err('err house.utils.media.gridfs.getReadableFile');
                        house.log.err(err);
                        return;
                    } else {
                        gs.seek(0, function() {
                            // Read the entire file
                            gs.read(function(err, data) {
                                if(callback) {
                                    callback(null, data);
                                }
                            });
                          });
                    }
                });
            }
        });
        
        /*
        mongo.GridStore.read(db, filename, {
            root: filesCol
        }, function(err, data) {
            if(err) {
                house.log.err('urls endpoint - error reading gridfile');
                house.log.err(err);
            } else {
                callback(null, data);
            }
        });
        */
    }

    media.gridfs.writeFileToPath = function(db, filesCol, gridPath, fullPath, callback) {
        //house.log.debug('media.writeGridFileToPath');
        //house.log.debug(filesCol);
        var fileStream = fs.createWriteStream(fullPath);
        fileStream.on('open', function(fd) {
            var gridStore = new mongo.GridStore(db, gridPath, "r", {
                'root': filesCol
            });
            gridStore.open(function(err, gridStore) {
                if(err) {
                    house.log.err(err);
                    callback(err);
                } else {
                    var chunkSize = 1024,
                        lengthRemaining = gridStore.length;
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
                                    gs.close(function() {
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
                    if(err) {
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
        media.url.importFileToTmp(url, function(err, fullPath, responseHeaders) {
            // house.log.debug('media.gridfs.importUrl - tmp file: ' + fullPath);
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(fullPath) {
                var importMimeFileToGrid = function(mimeType) {
                    // house.log.debug('media.gridfs.importUrl - mime type: ' + mimeType);
                    media.exif.getFromPath(fullPath, function(exif) {
                        //console.log('exif')
                        //console.log(exif)
                        metadata.srcUrl = url;
                        metadata.exif = exif;
                        metadata.responseHeaders = responseHeaders;
                        media.gridfs.importFile(db, filesCol, fullPath, fullPath, mimeType, metadata, function(err, gridfile) {

                            // unlink the tmp file
                            fs.unlink(fullPath, function() {
                                // house.log.debug('media.gridfs.importUrl - removed tmp file');
                            });

                            callback(err, gridfile);
                        });
                    });
                }

                // use the curl http response content type to save the hassle and get better results!
                if(responseHeaders && responseHeaders.hasOwnProperty('Content-Type')) {
                    var mimeType = responseHeaders['Content-Type']; // application/xml; charset=UTF-8
                    mimeType = mimeType.split(';').shift();
                    // house.log.debug('using mime from curl response header Content-Type: ' + mimeType);
                    importMimeFileToGrid(mimeType);
                } else {
                    media.fs.getFileMime(fullPath, function(err, mimeType) {
                        //console.log('media.fs.getFileMime mimeType: '+mimeType);
                        if(err) {
                            house.log.err('media.gridfs.importUrl - media.fs.getFileMime err');
                            house.log.err(err);
                            callback(err);
                        } else if(mimeType) {
                            importMimeFileToGrid(mimeType);
                        } else {
                            house.log.err('invalid mime');
                            callback(new Error("Inavlid Mime"));
                        }
                    });
                }
            }
        });
    }

    media.url = {};

    media.url.importFileToTmp = function(url, callback) {
        var self = this;
        var tmpPath = encodeURIComponent(url);
        if(tmpPath.length > 200) tmpPath = tmpPath.substr(-200);
        var fullPath = "/tmp/" + tmpPath;
        var headersPath = "/tmp/" + tmpPath + "header.txt";
        //console.log(fullPath);
        var fileStream = fs.createWriteStream(fullPath, {
            flags: "w",
            mode: 438,
            bufferSize: 4 * 1024
        }).addListener("open", function(fd) {});

        var userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_5_8) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.68 Safari/534.24";

        var curlResponseHeaders = {};
        var curlStdErrData = '';
        var head = false;
        var breakStr = '\r\n\r\n'; // break string between headers and response data

        // curl
        // --dump-header to a tmp file
        // --compressed decompresses gzips
        // -L follow redirects
        var curl = spawn("curl", ["--dump-header", headersPath, "--compressed", "--user-agent", userAgent, "-L", encodeURI(url)]);
        curl.stdout.on("data", function(data) {
            if(data) {
                fileStream.write(data);
            }
        });
        curl.stderr.on("data", function(data) {
            // progress 
            //console.log("media curl stderr: " + data);
            curlStdErrData += data.toString();
        });
        curl.on("close", function(code) {
            // house.log.debug("media curl close with code: " + code);
            if(code !== 0) {
                house.log.err('curlStdErrData')
                house.log.err(curlStdErrData);
                callback(new Error("curl failed"), fullPath);
                return;
            }
            var headData = '';
            var headerFsStream = fs.createReadStream(headersPath);
            headerFsStream.on('open', function() {
                //console.log('open')
            });
            headerFsStream.addListener('data', function(data) {
                headData += data.toString();
            });
            headerFsStream.addListener('end', function() {
                //console.log('end')
                //console.log(headData);

                var multiHeaders = headData.trim().split(breakStr);
                //console.log(multiHeaders.length)
                headData = multiHeaders[multiHeaders.length - 1].trim(); // removes any redirects
                fileStream.end();
                // console.log('headData');
                // console.log(headData);

                var curlResArr = headData.split('\r\n');
                for(var i in curlResArr) {
                    var h = curlResArr[i].trim();
                    
                    var arr = h.split('\n');
                    h = arr.pop();
                    for(var arrI in arr) {
                        curlResArr.push(arr[arrI]);
                    }
                    
                    var seper = h.indexOf(': ');
                    var fieldName;
                    var fieldVal = h;
                    if(seper === -1) {
                        fieldName = '_CODE'; // response code
                        fieldVal = h;
                    } else {
                        fieldName = h.substr(0, seper);
                        fieldVal = h.substr(seper + 2);
                    }
                    curlResponseHeaders[fieldName] = fieldVal;
                }
                // console.log(curlResponseHeaders)

                // destroy / unlink the tmp file
                fs.unlink(headersPath, function() {
                    // house.log.debug('headers tmp file removed: ' + headersPath);
                });

                callback(null, fullPath, curlResponseHeaders);
            });
            headerFsStream.addListener('close', function() {
                //console.log('close')
            });

            headerFsStream.on('error', function(err) {
                console.log('err with curl header out file')
                house.log.err(err);
            });
        });
    };
})();