//
// # Mongodb GridFs API Endpoint
//
var ObjectID = mongo.ObjectID;

(exports = module.exports = function(house, options){
    // This endpoint requires a data source
    var ds = options.ds;
    var filesRoot = options.collection;
    var col = filesRoot+'.files';
    var usersCol = 'users';
    var imagesCol = 'images';
    
    var updateUserIdWithDoc = function(userId, doc, cb) {
        ds.update(usersCol, {_id: userId}, doc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                if(cb) cb();
            }
        });
    }
    var incUserFileBytes = function(userId, b) {
        var updateDoc = {"$inc":{"fileBytes": b}};
        updateUserIdWithDoc(userId, updateDoc);
    }
    var incUserFileCount = function(userId, c) {
        var updateDoc = {"$inc":{"fileCount": c}};
        updateUserIdWithDoc(userId, updateDoc);
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var countQuery = function(query) {
            query["metadata.owner.id"] = req.session.data.user;
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    res.setHeader('X-Count', data);
                    res.data({});
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var findQuery = function(query, callback) {
            console.log('find query');
            console.log(query);
            
            if(query.id) {
                query._id = query.id;
                delete query.id;
            }
            if(query.hasOwnProperty('_id') && typeof query._id == 'string') {
                try {
                    query._id = new ObjectID(query._id);
                } catch(e) {
                    console.log('bad object id');
                }
            }
            
            if(query.limit) {
                query.limit = parseInt(query.limit, 10);
            }
            if(!query.limit || query.limit > 100) {
                query.limit = 25;
            }
            if(query.contentType && query.contentType.indexOf('/') === 0) {
                query.contentType = new RegExp(query.contentType.substr(1, query.contentType.length-2));
                console.log(query.contentType)
            }
            if(query.hasOwnProperty('metadata.proc[$exists]')) {
                if(query['metadata.proc[$exists]'] == 'false') {
                    query['metadata.proc'] = {"$exists": false};
                } else {
                    query['metadata.proc'] = {"$exists": true};
                }
                delete query['metadata.proc[$exists]'];
            }
            query["metadata.owner.id"] = req.session.data.user;
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var docId;
        
        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            try {
                docId = new ObjectID(docId);
            } catch(e) {
            }
        }
        
        if(req.method == 'GET' || req.method == 'HEAD') {
            var query = {};
            
            if(path === '' || path === '/') {
                findQuery(query);
            } else {
                var filename = decodeURIComponent(path.substr(1));
                mongo.GridStore.exist(ds.db, filename, filesRoot, function(err, result) {
                    if(result) {
                        house.utils.media.gridfs.getReadableFile(ds.db, filesRoot, filename).open(function(err, gs){
                            var resCode = 200;
                            var offset = 0;
                            var etag = '"'+gs.length+'-'+gs.uploadDate+'"';
                            var headerFields = {
                                'Content-Type': gs.contentType
                                , 'Date': gs.uploadDate
                            	, 'ETag': etag
                            };
                            
                            // check for permission to the file
                            var hasPermission = false;
                            var meta = gs.metadata;
                            console.log(meta);
                            if(meta) {
                                console.log(typeof req.session.data.user);
                                console.log(typeof meta.owner.id)
                                if(meta.hasOwnProperty('groups') && meta.groups && meta.groups.indexOf('public') != -1) {
                                    hasPermission = true;
                                }
                                else if(req.session.data.user && meta.hasOwnProperty('owner') && (meta.owner.id.toString() == req.session.data.user.toString())) {
                                    hasPermission = true;
                                }
                            }
                            
                            if(!hasPermission) {
                                // throw them out
                                next();
                                return;
                            }
                            
                            if(req.method == 'HEAD') {
                                //console.log('HEAD');
                                headerFields["Content-Length"] = gs.length;
                                headerFields["Accept-Ranges"] = 'bytes';
                                gs.close(function(){
                                    //house.log.debug('gridstore closed');
                                    res.writeHead(200, headerFields);
                                    res.end('');
                                });
                                return;
                            }
                            
                            if(req.headers['if-none-match'] == etag){
                              resCode = 304;
                              headerFields['Content-Length'] = 0;
                              gs.close(function(){
                                  res.writeHead(resCode, headerFields);
                                  res.end();
                              });
                              return;
                            }
                            
                            var contentLen = gs.length;
                            var bytStr = 'bytes=';
                            var chunkSize = 4096
                            , lengthRemaining = gs.length;
                            
                            if(req.headers.range && req.headers.range.substr(0,bytStr.length) == bytStr) {
                                house.log.debug('range '+req.headers.range);
                            	var rangeString = '';
                                var bytSelection = req.headers.range.substr(bytStr.length);
                            	var bytDashPos = bytSelection.indexOf('-');
                            	var bytPreDash = bytSelection.substr(0, bytDashPos);
                            	var bytEndDash = bytSelection.substr(bytDashPos+1);
                            	resCode = 206;
                                delete headerFields['ETag'];
                            	if(bytPreDash == '0') {
                            		if(bytEndDash) {
                            			contentLen = parseInt(bytEndDash);
                                        rangeString = bytPreDash + '-' + bytEndDash;
                            		} else {
                            		    rangeString = '0-' + (gs.length-1).toString();
                            		}
                            	} else if(bytEndDash != '' && bytPreDash != '') {
                            		contentLen = parseInt(bytEndDash) - parseInt(bytPreDash);
                            		offset = parseInt(bytPreDash);
                            		rangeString = bytPreDash + '-' + bytEndDash;
                            	} else if(bytEndDash == '' && bytPreDash != '') {
                                    // ex, 1234-
                            		contentLen = contentLen - parseInt(bytPreDash);
                            		offset = parseInt(bytPreDash) - 1;
                            		rangeString = bytPreDash + '-' + (gs.length - 1).toString();
                            	}
                            	headerFields["Content-Range"] = 'bytes ' + rangeString+'/'+gs.length; // needs to always be the full content length? // req.headers.range; //bytSelection; // should include bytes= ???
                            	headerFields["Vary"] = "Accept-Encoding";
                                lengthRemaining = contentLen;
                            }
                            
                            house.log.debug(resCode+' '+filename+' as: '+gs.contentType+' with length: ' + contentLen, resCode);
                            headerFields["Content-Length"] = contentLen;
                            //headerFields["Accept-Ranges"] = 'bytes'; // enables scrubbing in chrome
                            
                        	house.log.debug(headerFields);
                            res.writeHead(resCode, headerFields);
                            
                            if(lengthRemaining < chunkSize) {
                              chunkSize = lengthRemaining;
                            }
                            
                            var gridStoreReadChunk = function(gs) {
                                var readAndSend = function(chunk) {
                                  gs.read(chunk, function(err, data) {
                                	if(err) {
                                	  house.log.err('file read err: '+filename);
                                	  house.log.err(err);
                                      gs.close(function(){
                                          house.log.debug('gridstore closed');
                                      });
                                      res.end();
                                      return;
                                	} else {
                                		
                                      res.write(data, 'binary');
                                      lengthRemaining = lengthRemaining - chunk;
                                      
                                      if(lengthRemaining < chunkSize) {
                                        chunkSize = lengthRemaining;
                                      }
                                    }
                                    
                                    if(lengthRemaining == 0) {
                                      // close the gridstore
                                      gs.close(function(){
                                          house.log.debug('gridstore closed');
                                      });
                                      res.end();
                                    } else {
                                      readAndSend(chunkSize);
                                    }
                                  }); // read
                                }
                                if(chunkSize > 0) {
                                  readAndSend(chunkSize);
                                }
                            }
                            if(offset != 0) {
                                 gs.seek(offset, function(err, gs) {
                                 	if(err) {
                                 		house.log.err('err');
                                 	}
                                 	gridStoreReadChunk(gs);
                                 });
                            } else {
                                 gridStoreReadChunk(gs);
                            }
                        });
                        
                    } else {
                       if(err) {
                           house.log.err(err);
                           res.end('error');
                       } else {
                           try {
                                var fid = new ObjectID(filename);
                                findQuery({_id: fid});
                           } catch(e) {
                               
                               if(req.query && path.indexOf('?') === 0) {
                                   findQuery(req.query);
                               } else {
                                   console.log(e);
                                   res.end('file does not exist');
                               }
                           }
                           //res.end('file does not exist');
                       }
                    }
                });
            }
            
        } else if(req.method == 'POST') {
            house.log.debug('post to files (upload)');
            
            var procFile = function(file, callback) {
                var fileMeta = {};
                if(req.session.data) {
                    var owner = {
                        id: req.session.data.user,
                        name: req.session.data.name
                    }
                    fileMeta.owner = owner;
                    house.utils.media.gridfs.importFile(ds.db, filesRoot, '/uploads/'+file.filename, file.path, file.type, fileMeta, function(err, data){
                        console.log('gridfs import file upload done');
                        console.log(data)
                        data.id = data._id;
                        delete data._id;
                        if(err) {
                            console.log('file upload err');
                            console.log(err);
                        } else {
                            // inc users fileBytes
                            incUserFileBytes(owner.id, data.length);
                            // inc users fileCount
                            incUserFileCount(owner.id, 1);
                            
                            if(data.contentType.indexOf('audio') === 0) {
                                //console.log('proces audio upload');
                                house.utils.media.exif.getFromPath(file.path).result(function(exif){
                                    //console.log('metadata');
                                    //console.log(exif);
                                
                                    var newSong = {
                                        file_id: data._id,
                                        filename: data.filename,
                                        ss: ''
                                    }
                                    if(exif.Title) {
                                        newSong.title = exif.Title;
                                        newSong.ss += exif.Title;
                                    }
                                    if(exif.Album) {
                                        newSong.album = exif.Album;
                                        newSong.ss += ' '+exif.Album;
                                    }
                                    if(exif.Artist) {
                                        newSong.artist = exif.Artist;
                                        newSong.ss += ' '+exif.Artist;
                                    }
                                    if(exif.Year) {
                                        newSong.year = exif.Year;
                                    }
                                    if(exif.Genre) {
                                        newSong.genre = exif.Genre;
                                    }
                                    if(exif.Duration) {
                                        newSong.duration = exif.Duration;
                                        var iof = newSong.duration.indexOf(' (approx)');
                                        if(iof !== -1) {
                                            newSong.duration = newSong.duration.substr(0,iof);
                                        }
                                        var dArr = newSong.duration.split(':');
                                        var secs = parseInt(dArr.pop(), 10);
                                        var mins = parseInt(dArr.pop(), 10);
                                        
                                        newSong.duration = (mins * 60) + secs;
                                    }
                                    if(exif.Lyrics) {
                                        newSong.lyrics = exif.Lyrics;
                                    }
                                    // picture
                                    // track
                                    // lyrics
                                    
                                    // user uploading the song
                                    newSong.owner = owner;
                                    
                                    ds.insert('songs', newSong, function(err, songData) {
                                        //console.log('new song!');
                                        callback({song: songData, file: data});
                                    });
                                });
                            } else if(data.contentType.indexOf('image') === 0) {
                                console.log('1-'+data.filename);
                                house.utils.media.exif.getFromPath(file.path, function(exif){
                                    console.log('2-'+data.filename);
                                    processImage(data, exif, function(newImageData, updatedFile){
                                        callback({image: newImageData, file: updatedFile});
                                    });
                                });
                            } else {
                                console.log('non-media upload done');
                                callback({file:data});
                            }
                        }
                    });
                }
            }
            
            if(path == '') {
                var datas = [];
                var requestFiles = [];
                if(req.files) {
                    for(var i in req.files) {
                        requestFiles.push(req.files[i]);
                    }
                    
                    var procNextFile = function(){
                        var file = requestFiles.pop();
                        procFile(file, function(data){
                            datas.push(data);
                            fs.unlink(file.path, function(){
                                console.log('file unlinked from tmp');
                            });
                            if(requestFiles.length > 0) {
                                procNextFile();
                            } else {
                                // done
                                res.data(datas);
                            }
                        });
                    }();
                }
            }
        } else if(req.method == 'PUT') {
            house.log.debug('files PUT');
            var query = {};
            if(docId) {
                query._id = docId;
                query['metadata.owner.id'] = req.session.data.user;
                if(req.fields.hasOwnProperty('$set') && req.fields['$set'].hasOwnProperty('metadata.proc')) {
                    ds.find(col, query, function(err, data) {
                        console.log(data)
                        data = _.first(data);
                        if(data.contentType.indexOf('audio') === 0) {
                        } if(data.contentType.indexOf('image') === 0) {
                            processImage(data, function(newImageData, updatedFile){
                                console.log('proc image complete');
                            });
                        } else {
                        }
                    });
                } else {
                }
                ds.update(col, query, req.fields, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        res.data(data);
                    }
                });
            }
        } else if(req.method == 'DELETE') {
            house.log.debug('files DELETE');
            var query = {};
            var ownerId = req.session.data.user;
            if(docId) {
                query._id = docId;
                
                query["metadata.owner.id"] = ownerId;
                ds.find(col, query, function(err, data){
                    
                    if(err) {
                        house.log.err(err);
                    } else if(data) {
                        // dec users file bytes used
                        incUserFileBytes(ownerId, (data[0].length * -1));
                        
                        // dec users fileCount
                        incUserFileCount(ownerId, -1);
                        
                        ds.remove(col, query, function(err, data){
                            if(err) {
                                house.log.err(err);
                                res.end('error');
                            } else {
                                console.log('deleted file');
                                res.data(data);
                            }
                        });
                    } else {
                        house.log.err(new Error('no data from mongo'));
                    }
                });
            }
        } else if(req.method == 'OPTIONS') {
            console.log('OPTIONS');
        } else {
            if(req.method) {
                console.log('bad method '+req.method);
            } else {
                console.log('NO method!');
            }
        }
        var processImage = function(file, exif, callback) {
            console.log('processImage '+file.filename)
            var newImage = {
                "filename": file.filename
                , "ref": {"col": col, "id": file.id}
            }
            if(typeof exif == 'object') {
                newImage.exif = exif;
            } else if(typeof exif == 'function') {
                callback = exif;
            }
            
            if(file.metadata.subject) {
                newImage["caption"] = file.metadata.subject;
            }
            if(file.metadata.body) {
                // parse body for tags and groups
                var b = file.metadata.body;
                //newImage["tags"] = file.metadata.subject;
                var blines = b.split('\n');
                for(var i in blines) {
                    var bline = blines[i];
                    var tags;
                    var groups;
                    var ts = 'Tags: ';
                    var gs = 'Groups: ';
                    if(bline.indexOf(ts) === 0) {
                        tags = bline.substring(ts.length);
                        tags = tags.split(', ');
                        for(var t in tags) {
                            tags[t] = tags[t].trim();
                        }
                    }
                    if(bline.indexOf(gs) === 0) {
                        groups = bline.substring(gs.length);
                        groups = groups.split(', ');
                        for(var g in groups) {
                            groups[g] = groups[g].trim();
                        }
                    }
                }
                
                if(tags) {
                    newImage["tags"] = tags;
                }
                if(groups) {
                    newImage["groups"] = groups;
                }
            }
            
            var imagesEndPoint = house.api.getEndPointByName(imagesCol);
            imagesEndPoint.call(this, {session: req.session, method: 'POST', url: '', fields: newImage}, {end:function(){}, data:function(newImageData){
                console.log('images response for newImage '+newImage.filename);
                console.log(newImageData);
                var updateFileDoc = {
                    "$push": {
                        "metadata.refs": {
                            "col": imagesCol
                            , "id": newImageData.id
                        }
                    }
                    , "$set": {
                        "metadata.proc": 1
                    }
                };
                
                ds.update(col, {"_id": file.id}, updateFileDoc, function(err, updateData) {
                    ds.find(col, {"_id": file.id}, function(err, updatedFile) {
                        if(updatedFile.length > 0) {
                            if(callback) {
                                callback(newImageData, _.first(updatedFile));
                            }
                        }
                    });
                });
            },writeHead:function(){}});
            
            //ds.insert(imagesCol, newImage, function(err, newImageData) {
            //});
        }
    }
    
    return handleReq;
});
