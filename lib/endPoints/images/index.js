//
// # Images Collection API Endpoint
//
var ObjectID = mongo.ObjectID;

(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var filesRoot = options.filesRootCollection || 'files';
    var colFiles = filesRoot+'.files';
    var usersCol = 'users';
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var countQuery = function(query) {
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            } else {
                query["owner.id"] = req.session.data.user;
            }
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else {
                    console.log(data);
                    res.setHeader('X-Count', data);
                    res.data({});
                }
            });
        }
        
        var findQuery = function(query) {
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            } else {
                query["owner.id"] = req.session.data.user;
            }
            console.log(query);
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
            docId = new ObjectID(docId);
        }
        
        if(req.method == 'GET') {
            var query = {};
            
            if(docId) {
                query._id = docId;
                findQuery(query);
            } else {
                if(req.query) {
                    query = req.query;
                    
                    // query mongo id's
                    if(query.hasOwnProperty('id')) {
                        query._id = new ObjectID(query.id);
                        delete query.id;
                    }
                }
                findQuery(query);
            }
        } else if(req.method == 'HEAD') {
            var query = {};
            
            if(docId) {
                query._id = docId;
                findQuery(query);
            } else {
                if(req.query) {
                    query = req.query;
                }
                countQuery(query);
            }
        } else if(req.method == 'POST') {
            house.log.debug('post');
            if(path == '') {
                var newDoc = req.fields;
                newDoc.owner = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                newDoc.at = new Date();
                var imageTime = false;
                if(newDoc.hasOwnProperty('exif')) {
                    imageTime = house.utils.media.exif.getImageTime(newDoc.exif);
                    if(imageTime) {
                        newDoc.at = imageTime;
                    }
                }
                
                ds.insert(col, newDoc, function(err, newImageDoc){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        var doImageUpdate = false;
                        var updateImageDoc = {};
                        var respondWithFind = function() {
                            var query = {_id: newImageDoc.id};
                            ds.find(col, query, function(err, docs) {
                                if (err) {
                                    house.log.err(err);
                                } else {
                                    house.log.debug("respond with updated image");
                                    console.log(_.first(docs));
                                    console.log(res);
                                    res.data(_.first(docs));
                                }
                            });
                        }
                        var updateImageWithDoc = function(doc, callback) {
                            if(!doImageUpdate) {
                                if(callback) {
                                    callback();
                                }
                            }
                            var query = {_id: newImageDoc.id};
                            ds.update(col, query, doc, function(err, updatedDocs) {
                                if (err) {
                                    house.log.err(err);
                                } else {
                                    house.log.debug("update new image success!");
                                    if(callback) {
                                        callback(updatedDocs);
                                    }
                                }
                            });
                        }
                        var processThumbnailsFromExifAndPath = function(exifObject, fullPath) {
                            house.log.debug('proc thumbnails');
                            
                            var mimeType = exifObject["MIME Type"];
                            var newFileMeta = {
                                owner: newDoc.owner,
                                groups: newDoc.groups,
                                src: "images",
                                proc: 1,
                                refs: [ {
                                    col: "images",
                                    id: newDoc.id
                                } ]
                            };
                            var encodedFilename = encodeURIComponent(newDoc.filename);
                            var tmpSquarePath = "/tmp/im-sq-" + encodedFilename;
                            var tmpThumbPath = "/tmp/im-t-" + encodedFilename;
                            var tmpFullPath = "/tmp/im-f-" + encodedFilename;
                            
                            var thumbSize = 320;
                            var squareDimension = 640, origW = 640, origH = 640;
                            if (exifObject.hasOwnProperty("Image Width")) {
                                origW = parseInt(exifObject["Image Width"]);
                            }
                            if (exifObject.hasOwnProperty("Image Height")) {
                                origH = parseInt(exifObject["Image Height"]);
                            }
                            if (origH < origW) {
                                squareDimension = origH;
                            } else {
                                squareDimension = origW;
                            }
                            
                            console.log("processTmpImage");
                            var convertFullToSquare = [ fullPath, "-auto-orient", "-strip", "-crop", squareDimension + "x" + squareDimension, tmpSquarePath ];
                            var convertSquareToThumb = [ tmpSquarePath, "-auto-orient", "-strip", "-resize", thumbSize, "-crop", thumbSize + "x" + thumbSize, tmpThumbPath ];
                            var convertFullToFull = [ fullPath, "-auto-orient", "-strip", "-resize", 1024, tmpFullPath ];
                            
                            var newFileNameBase = newDoc.filename;
                            if (newFileNameBase.indexOf("/") == 0) {
                                newFileNameBase = newFileNameBase.substr(1);
                            }
                            house.log.debug("newFileNameBase: " + newFileNameBase);
                            
                            
                            
                            var addSizeToPush = function(size, val) {
                                doImageUpdate = true;
                                if(!updateImageDoc.hasOwnProperty("$push")) {
                                    updateImageDoc["$push"] = {};
                                }
                                if(!updateImageDoc["$push"].hasOwnProperty("sizes")) {
                                    updateImageDoc["$push"]['sizes'] = {};
                                }
                                updateImageDoc["$push"]['sizes'][size] = val;
                            }
                            house.utils.media.imagemagick.convertToGrid(convertFullToSquare, tmpSquarePath, ds.db, filesRoot, "/images/square/" + newFileNameBase, mimeType, newFileMeta, function(err, dataSquare, squarePath) {
                                if (dataSquare._id) {
                                    addSizeToPush('square', {
                                        id: dataSquare._id.toString(),
                                        filename: dataSquare.filename
                                    });
                                }
                                house.log.debug("uploaded " + squarePath + " to db");
                                house.utils.media.imagemagick.convertToGrid(convertSquareToThumb, tmpThumbPath, ds.db, filesRoot, "/images/thumb/" + newFileNameBase, mimeType, newFileMeta, function(err, data, tmpThumbPath) {
                                    if (data._id) {
                                        addSizeToPush('thumb', {
                                            id: data._id.toString(),
                                            filename: data.filename
                                        });
                                    }
                                    house.utils.media.imagemagick.convertToGrid(convertFullToFull, tmpFullPath, ds.db, filesRoot, "/images/full/" + newFileNameBase, mimeType, newFileMeta, function(err, data, convertedPath) {
                                        if (data._id) {
                                            addSizeToPush('full', {
                                                id: data._id.toString(),
                                                filename: data.filename
                                            });
                                        }
                                        updateImageAndRespond();
                                    });
                                });
                            });
                            var updateImageAndRespond = function() {
                                console.log(updateImageDoc);
                                updateImageWithDoc(updateImageDoc, function(){
                                    respondWithFind();
                                });
                            }
                        }
                        
                        
                        var fullTmpPath = "/tmp/im-" + encodeURIComponent(newDoc.filename);
                        house.utils.media.gridfs.writeFileToPath(ds.db, filesRoot, newDoc.filename, fullTmpPath, function() {
                            house.utils.media.exif.getFromPath(fullTmpPath).result(function(exif){
                                
                                imageTime = house.utils.media.exif.getImageTime(newDoc.exif);
                                if(imageTime) {
                                    if(!updateImageDoc.hasOwnProperty("$set")) {
                                        updateImageDoc["$set"] = {};
                                    }
                                    updateImageDoc["$set"]['at'] = imageTime;
                                    doImageUpdate = true;
                                }
                                var loc = house.utils.media.exif.getLatLng(exif);
                                if(loc) {
                                    var newCheckin = {
                                        loc: loc,
                                        owner: newDoc.owner,
                                        src: "image"
                                    };
                                    if (imageTime) {
                                        newCheckin["createdAt"] = imageTime;
                                    }
                                    newCheckin["image"] = {
                                        id: newImageDoc.id,
                                        filename: newImageDoc.filename
                                    };
                                    var checkinsEndPoint = house.api.getEndPointByName("checkins");
                                    checkinsEndPoint({session: req.session, method: 'POST', url: '', fields: newCheckin}, {end:function(){}, data:function(newCheckinData){
                                        newCheckinData = _.first(newCheckinData);
                                        
                                        if(!updateImageDoc.hasOwnProperty("$set")) {
                                            updateImageDoc["$set"] = {};
                                        }
                                        updateImageDoc["$set"]['checkin'] = {
                                            id: newCheckinData["id"]
                                        };
                                        doImageUpdate = true;
                                        processThumbnailsFromExifAndPath(exif, fullTmpPath);
                                    },writeHead:function(){}});
                                } else {
                                    processThumbnailsFromExifAndPath(exif, fullTmpPath);
                                }
                            });
                        });
                    }
                });
            }
        } else if(req.method == 'PUT') {
            var query = {};
            query['owner.id'] = req.session.data.user;
            if(docId) {
                query._id = docId;
            
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
            var query = {};
            query['owner.id'] = req.session.data.user;
            if(docId) {
                query._id = docId;
                ds.remove(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
                    }
                });
                
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
