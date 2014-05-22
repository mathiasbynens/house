//
// # Mongodb GridFs API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    // This endpoint requires a data source
    var ds = options.ds;
    var filesRoot = ds.options.filesCol || options.collection;
    var col = filesRoot+'.files';
    var usersCol = 'users';
    var imagesCol = 'images';
    var tagsCol = options.collectionTags || 'tags';
    
    var ensureIndexes = function() {
        var collection = ds.db.collection(col);
        collection.ensureIndex({"uploadDate": -1}, function(){
            house.log.debug('index ensured for files uploadDate');
        });
    };
    if(!house.config.forkedFeedFetcher) {
        ds.connected(function(){
            ensureIndexes();
        });
    }
    
    var updateFileId = function(fileId, updateFileDoc, callback) {
        ds.update(col, {"_id": fileId}, updateFileDoc, function(err, updateData) {
            if(err) {
                callback(err);
            } else {
                ds.find(col, {"_id": fileId}, function(err, updatedFile) {
                    if(err) {
                        callback(err);
                    } else {
                        if(updatedFile.length > 0) {
                            if(callback) {
                                callback(null, _.first(updatedFile));
                            }
                        }
                    }
                });
            }
        });
    }
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
        var feedEndPoint = house.api.getEndPointByName("feed");
        var parseQuery = function(query) {
            if(query.contentType && query.contentType.indexOf('/') === 0) {
                var opts = query.contentType.substr(query.contentType.lastIndexOf('/')+1);
                query.contentType = new RegExp(query.contentType.substr(1, query.contentType.lastIndexOf('/')-1), opts);
            }
            if(query.filename && query.filename.indexOf('/') === 0) {
                var opts = query.filename.substr(query.filename.lastIndexOf('/')+1);
                query.filename = new RegExp(query.filename.substr(1, query.filename.lastIndexOf('/')-1), opts);
            }
            if(query.hasOwnProperty('metadata.proc[$exists]')) {
                if(query['metadata.proc[$exists]'] == 'false') {
                    query['metadata.proc'] = {"$exists": false};
                } else {
                    query['metadata.proc'] = {"$exists": true};
                }
                delete query['metadata.proc[$exists]'];
            }
            if(query.hasOwnProperty('metadata.fav') && (query['metadata.fav'] === 'true' || query['metadata.fav'] === '1')) {
                query['metadata.fav'] = true;
            }
            
            if(query.hasOwnProperty('metadata.tags')) {
                query["metadata.tags.name"] = query["metadata.tags"];
                delete query["metadata.tags"];
            }
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
                if(query.hasOwnProperty('metadata.owner.id')) {
                    query["metadata.owner.id"] = new ObjectID(query["metadata.owner.id"]);
                }
            } else {
                if(req.session.data.user) {
                    if(query.hasOwnProperty('metadata.owner.id')) {
                        query["metadata.owner.id"] = new ObjectID(query["metadata.owner.id"]);
                        query["metadata.groups"] = 'public';
                    } else {
                        query["metadata.owner.id"] = req.session.data.user;
                    }
                } else {
                    if(query.hasOwnProperty('metadata.owner.id')) {
                        query["metadata.owner.id"] = new ObjectID(query["metadata.owner.id"]);
                    }
                    query["metadata.groups"] = 'public';
                }
            }
            return query;
        }
        var countQuery = function(query) {
            query = parseQuery(query);
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else {
                    res.setHeader('X-Count', data);
                    res.data({});
                }
            });
        }
        
        var findQuery = function(query, callback) {
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
            if(!query.limit || query.limit > 1000) {
                query.limit = 25;
            }
            query = parseQuery(query);
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
        
        var insertDocToFeed = function(doc, callback) {
            var newFeedItem = {
                "ref": {"col": "files", "id": doc.id},
                "file": doc,
                "groups": doc.groups,
                "owner": doc.owner,
                "at": doc.at,
            }
            feedEndPoint({session: req.session, method: 'POST', url: '', fields: newFeedItem}, {end:function(){}, data:function(newFeedData){
                if(_.isArray(newFeedData)) {
                    newFeedData = _.first(newFeedData);
                }
                ds.update(col, {"_id": doc.id}, {"$set": {"feed": {id:newFeedData.id,at:newFeedData.at}}}, function(err, data) {
                    if(callback) {
                        callback(newFeedData);
                    }
                });
            },writeHead:function(){}});
        }
        var updateDocInFeed = function(doc) {
            var updateDoc = {
                "$set": {
                    "file": doc,
                    "groups": doc.groups,
                    "owner": doc.owner,
                    "at": doc.at,
                }
            }
            feedEndPoint({session: req.session, method: 'PUT', url: '/'+doc.feed.id, fields: updateDoc}, {end:function(){}, data:function(newFeedData){
                if(_.isArray(newFeedData)) {
                    newFeedData = _.first(newFeedData);
                }
            },writeHead:function(){}});
        }
        var removeDocFromFeed = function(doc) {
            if(doc.feed && doc.feed.id) {
                feedEndPoint({session: req.session, method: 'DELETE', url: '/'+doc.feed.id, fields: {delete: true}}, {end:function(){}, data:function(newFeedData){
                },writeHead:function(){}});
            } else if(doc.id) {
                var feedQuery = {"ref": {"col": "files", "id": doc.id}};
                ds.find('feed', feedQuery, function(err, data) {
                    _.each(data, function(e) {
                        var doc_Id = e.id;
                        house.io.rooms.in('feed').emit('deletedFeed', doc_Id);
                    });
                    ds.remove('feed', feedQuery, function(err, data) {
                    });
                });
            }
        }
        
        var docId;
        var query = req.query || {};
        var subPath = false;
        var tagsStr = 'metadata.tags';
        var tagsPrefix = '/' + tagsStr;
        var srcPostfix = '/src';
        // console.log(query)
        // ex. api/files/[filename]
        // ex. api/files/[file_id]/metadata.tags
        // ex. api/files/[file_id]/metadata.tags/[tag_id]
        // console.log(path.indexOf(srcPostfix))
        // console.log(path.length);
        // console.log(srcPostfix.length);
        if(path.length > 1 && (path.indexOf(tagsPrefix) !== -1)) {
            docId = path.substr(1, path.indexOf(tagsPrefix)); 
            var subSlashI = docId.lastIndexOf('/');
            if(subSlashI !== -1) {
                docId = docId.substr(0, subSlashI);
                docId = new ObjectID(docId);
                subPath = path.substr(subSlashI + 1);
            } else {
                // docId = new ObjectID(docId);
            }
            house.log.debug('files endpoint - subPath: '+subPath);
        } else if(path.length > 1 &&  path.indexOf(srcPostfix) === path.length - srcPostfix.length) {
            docId = path.substr(1, path.indexOf(srcPostfix)); 
            var subSlashI = docId.lastIndexOf('/');
            if(subSlashI !== -1) {
                docId = docId.substr(0, subSlashI);
                docId = new ObjectID(docId);
                subPath = path.substr(subSlashI + 1);
            } else {
                // docId = new ObjectID(docId);
            }
            house.log.debug('files endpoint - src path: '+subPath);
        }
        
        if(req.method == 'GET' || req.method == 'HEAD') {
            // console.log(path);
            if(path === '' || path === '/' || path.substr(0,1) === '?') {
                if(subPath && subPath === tagsPrefix) {
                    house.log.debug('tag subpath');
                    query._id = docId;

                    ds.find(col, query, function(err, data) {
                        if(err) {
                            house.log.err(err);
                        } else if(data) {
                            res.data(_.first(data).metadata.tags);
                        } else {
                            house.log.err(new Error('no data from mongo'));
                        }
                    });
                } else {
                    // console.log('query')
                    // console.log(query)
                    if(req.method == 'HEAD') {
                        countQuery(query);
                    } else {
                        findQuery(query);
                    }
                }
            } else {
                var filename = decodeURIComponent(path.substr(1));
                mongo.GridStore.exist(ds.db, filename, filesRoot, function(err, result) {
                    if(result) {
                        house.utils.media.gridfs.getReadableFile(ds.db, filesRoot, filename).open(function(err, gs){
                            if(err) {
                                house.log.err('err house.utils.media.gridfs.getReadableFile');
                                house.log.err(err);
                                return;
                            }
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
                            if(meta) {
                                if(req.session.data.user && req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
                                    hasPermission = true;
                                } else if(req.session.data.user && meta.hasOwnProperty('owner') && (meta.owner.id.toString() == req.session.data.user.toString())) {
                                    hasPermission = true;
                                } else if(meta.hasOwnProperty('groups')) {
                                    if(meta.groups && meta.groups.indexOf('public') != -1) {
                                        hasPermission = true;
                                    } else if(req.session.data.hasOwnProperty('groups')) {
                                        if(req.session.data.groups.indexOf('admin') !== -1) {
                                            hasPermission = true;
                                        } else if(meta.groups) {
                                            for(var g in meta.groups) {
                                                var group = meta.groups[g];
                                                if(req.session.data.groups.indexOf(group) !== -1) {
                                                    hasPermission = true;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            
                            if(!hasPermission) {
                                // throw them out
                                var name = req.session.data ? req.session.data.name : '';
                                house.log.debug('user '+name+' does not have permission to: '+gs.filename);
                                //house.log.debug(req.session.data);
                                if(meta) {
                                    //house.log.debug(meta);
                                }
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
                                        var reqRangeLen = parseInt(bytEndDash);
                                        if(reqRangeLen > contentLen) {
                                            house.log.debug('accept asking for invalid range')
                                            rangeString = bytPreDash + '-' + (contentLen-1);
                                        } else {
                                            contentLen = reqRangeLen+1;
                                            rangeString = bytPreDash + '-' + bytEndDash;
                                        }
                                    } else {
                                        rangeString = '0-' + (gs.length-1).toString();
                                    }
                                } else if(bytEndDash != '' && bytPreDash != '') {
                                    contentLen = (parseInt(bytEndDash)+1) - parseInt(bytPreDash);
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
                            
                            //house.log.debug(headerFields);
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
                                          //house.log.debug('gridstore closed');
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
                                          //house.log.debug('gridstore closed');
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
                                   if(req.method == 'HEAD') {
                                       countQuery(req.query);
                                   } else {
                                       findQuery(req.query);
                                   }
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
            
            
            if(subPath && subPath === tagsPrefix) {
                house.log.debug('files endpoing POST to tags');
                var newObject = req.fields;
                console.log(newObject)
                
                if(!newObject.title) {
                    newObject.title = newObject.name;
                }
                newObject.name = house.utils.string.slugify(newObject.name);
                
                var findOrInsertTag = function(tag, callback) {
                    var tagQuery = {
                        name: tag.name,
                        "user.id": req.session.data.user
                    }
                    
                    ds.find(tagsCol, tagQuery, function(err, data){
                        if(err) {
                            callback(err);
                        } else if(data) {
                            if(data.length > 0) {
                                var doc = _.first(data);
                                ds.update(tagsCol, {_id: doc.id}, {$inc:{"filesCount": 1}}, function(err, data){
                                    
                                });
                                
                                callback(null, doc);
                            } else {
                                newObject.filesCount = 1;
                                newObject.at = new Date();
                                newObject.user = {
                                    id: req.session.data.user,
                                    name: req.session.data.name
                                }
                                ds.insert(tagsCol, newObject, function(err, data){
                                    if(err) {
                                        callback(err);
                                    } else if(data) {
                                        ds.find(tagsCol, tagQuery, function(err, data){
                                            if(err) {
                                                callback(err);
                                            } else if(data) {
                                                if(data.length > 0) {
                                                    callback(null, _.first(data));
                                                }
                                            }
                                        });
                                    }
                                })
                            }
                        }
                    });
                }
                
                findOrInsertTag(newObject, function(err, tag){
                    if(err) {
                        
                    } else if(tag) {
                        delete tag.user;
                        delete tag.at;
                        var query = {};
                        if(docId) {
                            query._id = docId;
                            ds.update(col, query, {$push: {"metadata.tags": tag}}, function(err, data){
                                res.data(tag);
                            });
                        }
                    }
                });

                newObject.at = new Date();
                //console.log(req.session.data);
                
                return;
            }
            
            house.log.debug('POST to files (upload)');
            var procFile = function(file, callback) {
                var fileMeta = {};
                if(req.hasOwnProperty('fields') && req.fields.hasOwnProperty('metadata')) {
                    try {
                        var meta = JSON.parse(req.fields.metadata);
                        for(var meta_field in meta) {
                            fileMeta[meta_field] = meta[meta_field];
                        }
                    } catch(e) {
                        house.log.err(e);
                    }
                }
                if(req.session.data) {
                    var owner = {
                        id: req.session.data.user,
                        name: req.session.data.name
                    }
                    fileMeta.owner = owner;
                    
                    house.utils.media.gridfs.importFile(ds.db, filesRoot, 'uploads/'+file.filename, file.path, file.type, fileMeta, function(err, gridStore){
                        house.log.debug('--post to files complete');
                        //console.log(gridStore)
                        var data = house.utils.media.gridfs.getDocFromGridStore(gridStore);
                        if(err) {
                            house.log.err('--file upload err');
                            house.log.err(err);
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
                                    var fileMeta = {
                                    }
                                    var newSong = {
                                        file_id: data.id,
                                        filename: data.filename,
                                        ss: ''
                                    }
                                    if(exif.Title) {
                                        fileMeta['metadata.title'] = exif.Title;
                                        newSong.title = exif.Title;
                                        newSong.ss += exif.Title;
                                    }
                                    if(exif.Album) {
                                        fileMeta['metadata.album'] = exif.Album;
                                        newSong.album = exif.Album;
                                        newSong.ss += ' '+exif.Album;
                                    }
                                    if(exif.Artist) {
                                        fileMeta['metadata.artist'] = exif.Artist;
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
                                        fileMeta['metadata.duration'] = house.utils.media.exif.getDurationTime(exif.Duration);
                                        newSong.duration = house.utils.media.exif.getDurationTime(exif.Duration);
                                    }
                                    if(exif.Lyrics) {
                                        newSong.lyrics = exif.Lyrics;
                                    }
                                    
                                    if(exif.Track) {
                                        newSong.trackSeq = exif.Track;
                                    }
                                    // picture
                                    // track
                                    // lyrics
                                    
                                    // user uploading the song
                                    newSong.owner = owner;
                                    
                                    ds.insert('songs', newSong, function(err, songData) {
                                        //console.log('new song!');
                                        if(_.size(fileMeta) > 0) {
                                            updateFileId(data.id, {"$set": fileMeta}, function(err, updatedFileDoc){
                                                if(err) {
                                                    house.log.err(err);
                                                } else if(updatedFileDoc) {
                                                    console.log('updated file doc with song metadata');
                                                    console.log(updatedFileDoc);
                                                    house.ioi.emitDocToRoomOwnerGroup('files', 'inserted', updatedFileDoc, updatedFileDoc.metadata.owner.id, updatedFileDoc.metadata.groups);
                                                    callback({song: songData, file: updatedFileDoc});
                                                }
                                            });
                                        } else {
                                            house.ioi.emitDocToRoomOwnerGroup('files', 'inserted', data, data.metadata.owner.id, data.metadata.groups);
                                            callback({song: songData, file: data});
                                        }
                                    });
                                });
                            } else if(data.contentType.indexOf('image') === 0) {
                                house.utils.media.exif.getFromPath(file.path, function(exif){
                                    processImage(data, exif, function(newImageData, updatedFile){
                                        // house.ioi.emitDocToRoomOwnerGroup('images', 'inserted', newImageData, updatedFile.metadata.owner.id, updatedFile.metadata.groups);
                                        house.ioi.emitDocToRoomOwnerGroup('files', 'inserted', updatedFile, updatedFile.metadata.owner.id, updatedFile.metadata.groups);
                                        callback({image: newImageData, file: updatedFile});
                                    });
                                });
                            } else {
                                house.log.debug('--non-media upload done');
                                house.ioi.emitDocToRoomOwnerGroup('files', 'inserted', data, data.metadata.owner.id, data.metadata.groups);
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
                                //house.log.debug('file unlinked from tmp');
                            });
                            if(requestFiles.length > 0) {
                                procNextFile();
                            } else {
                                // done
                                res.data(datas, 'json');
                            }
                        });
                    }();
                }
            }
        } else if(req.method == 'PUT') {
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            house.log.debug('files endpoint - PUT from user '+req.session.data.user);
            // house.log.debug(req.fields);
            query = {};
            if(path.length > 1 && path.indexOf('/') === 0) {
                docId = path.substr(1);
                try {
                    var objDocId = new ObjectID(docId);
                    docId = objDocId;
                } catch(e) {
                    house.log.debug('not a good ObjectID');
                }
            }
            if(docId) {
                house.log.debug('files endpoint - docId: '+docId);
                query._id = docId;
                
                if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
                } else {
                    query['metadata.owner.id'] = req.session.data.user;
                }
                if(req.fields.hasOwnProperty('$set') && req.fields['$set'].hasOwnProperty('metadata.proc')) {
                    ds.find(col, query, function(err, data) {
                        //house.log.debug(data)
                        if(err) {
                            house.log.err(err);
                        } else {
                            if(data.length > 0) {
                                data = _.first(data);
                                if(data.contentType.indexOf('audio') === 0) {
                                    res.data(data);
                                } else if(data.contentType.indexOf('image') === 0) {
                                    processImage(data, function(newImageData, updatedFile){
                                        house.log.debug('proc image from PUT complete');
                                        //console.log(arguments);
                                        res.data({file: updatedFile, image: newImageData});
                                    });
                                } else {
                                    res.data(data);
                                }
                            } else {
                                res.data(data);
                            }
                        }
                    });
                } else {
                    house.log.debug('files endpoint - query and req.fields ');
                    house.log.debug(query);
                    house.log.debug(req.fields);
                    ds.update(col, query, req.fields, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            //house.log.debug(data);
                            // res.data(data);
                            ds.find(col, query, function(err, data) {
                                //house.log.debug(data)
                                if(err) {
                                    house.log.err(err);
                                } else {
                                    if(data.length > 0) {
                                        data = _.first(data);
                                    }
                                    res.data(data);
                                }
                            });
                        }
                    });
                }
            }
        } else if(req.method == 'DELETE') {
            house.log.debug('files DELETE');
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            query = {};
            var ownerId = req.session.data.user;
            
            if(docId && subPath && subPath.indexOf(tagsPrefix) === 0) {
                var tag_id = new ObjectID(subPath.substr(tagsPrefix.length + 1));
                house.log.debug('delete tag_id:');
                console.log(tag_id);
                
                ds.update(col, {_id: docId}, {$pull: {"metadata.tags": {id: tag_id}}}, function(err, data){
                    ds.update(tagsCol, {_id: tag_id}, {$inc:{"filesCount": -1}}, function(err, data){
                    });
                    res.data(data);
                });
                return;
            }
            // console.log('0000000------');
            // console.log(docId);
            // console.log(subPath);
            // console.log(path);
            var srcPostfix = '/src';
            
            var deleteRef = function(ref, callback) {
                house.log.debug('delete ref from collection: '+ref.col);
                try {
                    var refEndPoint = house.api.getEndPointByName(ref.col);
                    refEndPoint.call(this, {
                        session: req.session,
                        method: 'DELETE',
                        url: '/' + ref.id,
                        fields: {
                            "delete": true
                        }
                    }, {
                        end: function() {},
                        data: function(resData) {
                            callback(resData);
                        },
                        writeHead: function() {}
                    });
                } catch (e) {
                    house.log.err(e);
                }
            }
            
            
            if(!docId && path.length > 1 && path.indexOf('/') === 0) {
                docId = path.substr(1);
                try {
                    var objDocId = new ObjectID(docId);
                    docId = objDocId;
                } catch(e) {
                    house.log.debug('not a good ObjectID');
                }
            }
            if(docId) {
                query._id = docId;
                house.log.debug('id: '+docId);
                if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
                } else {
                    query["metadata.owner.id"] = ownerId;
                }
                ds.find(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else if(data.length > 0) {
                        var file = _.first(data);
                        var meta = _.clone(file.metadata);
                        house.log.debug('filename: '+file.filename);
                        
                        // subPath && subPath.indexOf(tagsPrefix) === 0) {
                        
                        // dec users file bytes used
                        incUserFileBytes(ownerId, (file.length * -1));
                        
                        // dec users fileCount
                        incUserFileCount(ownerId, -1);
                        
                        mongo.GridStore.unlink(ds.db, file.filename, {root: filesRoot}, function(err, gridStore){
                            if(err) {
                                house.log.err(err);
                                res.end('error');
                            } else {
                                house.log.debug('deleted file');
                                if(house.ioi) {
                                    house.log.debug('emit delete '+col+' to owner '+meta.owner.id);
                                    // house.io.emitToRoomDocAndOwnerId('files', 'deleted', docId, meta.owner.id); // client is coded to 'files' but db might be different
                                    house.ioi.emitDocToRoomOwnerGroup('files', 'deleted', docId, meta.owner.id, meta.groups);
                                }
                                if(path.substr(path.length-srcPostfix.length) === srcPostfix) {
                                    var srcRef = false;
                                    for(var i in meta.refs) {
                                        var ref = meta.refs[i];
                                        if(ref.col && ref.col === meta.src) {
                                            var refCol = meta.src;
                                            srcRef = ref;
                                        }
                                    }
                                    if(srcRef) {
                                        deleteRef(srcRef, function(data){
                                            house.log.debug('src ref deleted');
                                            res.data({});
                                        });
                                    } else {
                                        res.data({});
                                    }
                                } else {
                                    res.data({});
                                }
                            }
                        });
                    } else {
                        res.data({});
                        // house.log.err(new Error('no data from mongo'));
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
            //house.log.debug('processImage '+file.filename)
            var newImage = {
                "filename": file.filename
                , "ref": {"col": col, "id": file.id}
            }
            if(typeof exif == 'object') {
                newImage.exif = exif;
            } else if(typeof exif == 'function') {
                callback = exif;
            }
            if(file.metadata.hasOwnProperty('exif')) {
                newImage.exif = file.metadata.exif;
            }
            if(file.metadata.hasOwnProperty('groups')) {
                newImage.groups = file.metadata.groups;
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
            if(file.metadata.src === "urls") {
                newImage.feed = 0;
            }
            var imagesEndPoint = house.api.getEndPointByName(imagesCol);
            imagesEndPoint.call(this, {session: req.session, method: 'POST', url: '', fields: newImage}, {end:function(){}, data:function(newImageData){
                // house.log.debug('images response for newImage '+newImage.filename);
                //console.log(newImageData);
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
    
    if(house.config.google && house.config.google.analytics && house.config.google.analytics.id) {
        var ga = require('node-ga-plus')(house.config.google.analytics.id, { safe : false, cookie_name: "SID" });
    }
    if(ga) {
        var shouldRecordRequest = function(req) {
            // Only log mp3's for now
            if(req.method == 'GET' && /.mp3$/.test(req.url)) {
                var bytZeroStr = 'bytes=0';
                if(req.headers.range && req.headers.range.indexOf(bytZeroStr) === 0) {
                    house.log.debug('shouldRecordRequest range check '+req.headers.range);
                    return true; // only the first range request of multiple GET should be tracked
                } else if(!req.headers.range) {
                    return true; // normal GET
                } else {
                    return false; // non 0- range request
                }
            } else {
                // no HEAD requests
            }
            return false;
        }
        
        var analyticsReq = function(req, res, next) {
            if(shouldRecordRequest(req)) {
                ga(req, res, function() {
                    handleReq(req,res,next);
                });
            } else {
                handleReq(req,res,next);
            }
        }
        
        house.log.info('using google analytics for files endpoint');
        return analyticsReq;
    } else {
        return handleReq;
    }
});
