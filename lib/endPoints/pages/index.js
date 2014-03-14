//
// # Pages Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
var mkdirp = require('mkdirp');
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var colFiles = options.collectionFiles || 'files.files';
    var filesRoot = 'files';
    var usersCol = 'users';
    var imagesCol = 'images';
    //var feedEndPoint = house.api.getEndPointByName("feed");
    var featurePrefix = '/features';
    var sectionPrefix = '/sections';
    
    var slugStr = function(str) {
        return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
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
    var incUserField = function(userId, field, b) {
        b = b || 1;
        var updateDoc = {"$inc":{}};
        updateDoc["$inc"][field] = b;
        updateUserIdWithDoc(userId, updateDoc);
    }
    var incUserPages = function(userId, field, b) {
        incUserField(userId, 'pagesCount', b);
    }
    var insertDefaultPage = function(callback) {
	house.log.info('insert default page');
        var newDoc = {
            path: "/",
            title: "My Page",
            features: [{
                id: "about",
                title: "Welcome to House.JS",
                desc: "Get started by editing this page.",
                a: "Go",
                href: "about",
                rank: 1
            }, {
                id: "contact",
                title: "Say Hello!",
                desc: "Get in touch.",
                a: "Contact",
                href: "contact",
                rank: 2
            }, {
                id: "info",
                title: "Make it your own.",
                desc: "Learn more about customizing your site.",
                a: "More inof",
                href: "info",
                rank: 3
            }],
            sections: [
                {
                    id: "about",
                    name: "About",
                    rank: 1,
                    html: "<p>Easily edit your own website.</p>"
                },
                {
                    id: "info", 
                    name: "Information",
                    rank: 2,
                    html: "<p>More information available.</p>"
                },
                {
                    id: "contact", 
                    name: "Contact",
                    rank: 3,
                    html: '<div class="col-md-10 col-md-offset-1">[[feedback|modal=true|title=Send us a message|subjectLabel=Your name|msgLabel=Leave us your info|subjectPlaceholder=Your name|msgPlaceholder=For information, give us your best contact method and we will get back to you.]]</div>'
                }
            ]
        };
        if(house.config.site) {
            if(house.config.site.title) {
                newDoc.title = house.config.site.title;
            }
            if(house.config.site.desc) {
                newDoc.desc = house.config.site.desc;
            }
        }
        newDoc.at = new Date();
        ds.insert(col, newDoc, function(err, data){
            var query = {_id: data.id};
            ds.find(col, query, function(err, docs) {
                if (err) {
                    house.log.err(err);
                } else {
                    if(callback) {
                        callback(docs);
                    }
                }
            });
        });
    }
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        var emitToRoomIn = function(col, verb, doc) {
            console.log(doc)
            var colVerb = verb+col.charAt(0).toUpperCase() + col.substr(1);
            house.ioi.ofInRoomEmit('io', col, colVerb, doc);
            return;
            
            // house.ioi.emitDocToRoomOwnerGroup(col, verb, doc, doc.owner.id, doc.groups);
            if(_.isArray(doc)) {
                _.each(doc, function(doc) {
                    emitToRoomIn(col, verb, doc);
                });
                return;
            }
            
            house.io.rooms.in(col).emit(colVerb, doc);
            house.ioi.rooms.in(col).emit(colVerb, doc);
            
            return;
            if(verb == 'deleted') {
                house.io.rooms.in(col).emit(colVerb, doc);
                return;
            }
            var groups = doc.groups || [];
            if(groups.indexOf('public') !== -1) {
                house.io.rooms.in(col).emit(colVerb, doc);
            } else {
                var ioRoomManager = house.io.rooms.in(col).manager;
                for(var id in ioRoomManager.handshaken) {
                    var handshake = ioRoomManager.handshaken[id];
                    var idSocket = house.io.rooms.socket(id);
                    if(handshake.session.groups && handshake.session.groups.length > 0) {
                        if(handshake.session.groups.indexOf('admin') !== -1) {
                            idSocket.in(col).emit(colVerb, doc);
                        } else {
                           for(var g in groups) {
                               if(handshake.session.groups.indexOf(groups[g]) !== -1) {
                                   idSocket.in(col).emit(colVerb, doc);
                                   break;
                               }
                           }
                        }
                    }
                }
            }
        }
        
        var countQuery = function(query) {
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            } else if(req.session.data.user) {
            } else {
            }
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else {
                    res.setHeader('X-Count', data);
                    res.data({});
                }
            });
        }
        var filterData = function(data) {
            /*if(!_.isArray(data)) {
                if(data.hasOwnProperty('updates')) {
                    _.each(data.updates, function(doc,ii){
                        delete data.updates[ii].src;
                    });
                }
            } else {
                _.each(data, function(doc, i){
                    if(doc.hasOwnProperty('updates')) {
                        _.each(doc.updates, function(doc,ii){
                            delete data[i].updates[ii].src;
                        });
                    }
                });
            }*/
            return data;
        }
        var findQuery = function(query) {
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
            
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    if(data.length > 0) {
                        data = filterData(data);
                        res.data(data);
                    } else {
                        insertDefaultPage(function(data){
                            data = filterData(data);
                            res.data(data);
                        });
                    }
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var docId;
        var subPath = false;
        
        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            var subSlashI = docId.indexOf('/');
            if(subSlashI !== -1) {
                docId = docId.substr(0, subSlashI);
                docId = new ObjectID(docId);
                subPath = path.substr(subSlashI+1);
            } else {
                docId = new ObjectID(docId);
            }
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
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            house.log.debug('post');
            
            if(subPath && subPath === featurePrefix) {
                var newObj = req.fields;
                ds.find(col, {_id: docId}, function(err, docs) {
                    if(err) {
                        house.log.err(err);
                    } else {
                        if(_.isArray(docs)) {
                            var doc = _.first(docs);
                            var features = doc.features;
                            if(!newObj.hasOwnProperty('id')) {
                               var d = new Date();
                               newObj.id = d.getTime().toString();
                            }
                            if(!newObj.hasOwnProperty('rank')) {
                               newObj.rank = features.length;
                            }
                            
                            ds.update(col, {_id: docId}, {$push: {features: newObj}}, function(err, data){
                                res.data(newObj);
                            });
                        }
                    }
                });
            } else if(subPath && subPath === sectionPrefix) {
               var newObj = req.fields;
                ds.find(col, {_id: docId}, function(err, docs) {
                    if(err) {
                        house.log.err(err);
                    } else {
                        if(_.isArray(docs)) {
                            var doc = _.first(docs);
                            var sections = doc.sections;
                            if(!newObj.hasOwnProperty('id')) {
                               //var d = new Date();
                               //newObj.id = d.getTime().toString();
                               
                               newObj.id = slugStr(newObj.name);
                            }
                            if(!newObj.hasOwnProperty('rank')) {
                               newObj.rank = sections.length;
                            }
                            
                            ds.update(col, {_id: docId}, {$push: {sections: newObj}}, function(err, data){
                                res.data(newObj);
                            });
                        }
                    }
                });
            } else if(path == '') {
                var newDoc = req.fields;
                newDoc.at = new Date();
                newDoc.owner = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                ds.insert(col, newDoc, function(err, data){
                    var respondWithFind = function(docId) {
                        var query = {_id: docId};
                        ds.find(col, query, function(err, docs) {
                            if (err) {
                                house.log.err(err);
                            } else {
                                var resWithDoc = _.first(docs);
                                resWithDoc = filterData(resWithDoc);
                                res.data(resWithDoc);
                                emitToRoomIn(col, 'inserted', resWithDoc);
                            }
                        });
                    }
                    incUserPages(req.session.data.user, 1);
                    respondWithFind(data.id);
                });
            }
        } else if(req.method == 'PUT') {
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            var respondWithFind = function(query) {
                // console.log(col)
                // console.log(query)
                ds.find(col, query, function(err, docs) {
                    if (err) {
                        house.log.err(err);
                    } else {
                        // console.log(docs)
                        var data = _.first(docs);
                        // house.log.debug(data);
                        res.data({});
                        house.log.debug('io emit pages updated');
                        emitToRoomIn(col, 'updated', data);
                    }
                });
            }
            var query = {};
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query['owner.id'] = req.session.data.user;
            }
            
            if(subPath && subPath.indexOf(featurePrefix) === 0) {
                house.log.debug('subPath of featurePrefix');
                // pull out the given group
                var featuresPathId = subPath.substr(featurePrefix.length+1);
                house.log.debug(featuresPathId);
                
                query['features.id'] = featuresPathId;
                var updateDoc = {};
                
                if(req.fields.hasOwnProperty('$set')) {
                    updateDoc = {"$set": {}};
                    for(var i in req.fields['$set']) {
                        if(i !== 'id') {
                            updateDoc['$set']['features.$.'+i] = req.fields['$set'][i];
                        }
                    }
                }
                if(updateDoc == {}) return;
                ds.update(col, query, updateDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        // house.log.debug(data);
                        // house.log.debug('io emit pages updated feature');
                        // emitToRoomIn(col, 'updated', data);
                        respondWithFind(query);
                    }
                });
            } else if(subPath && subPath.indexOf(sectionPrefix) === 0) {
                house.log.debug('subPath of sectionPrefix');
                // pull out the given group
                var sectionPathId = subPath.substr(sectionPrefix.length+1);
                house.log.debug(sectionPathId);
                
                query['sections.id'] = sectionPathId;
                var updateDoc = {};
                
                if(req.fields.hasOwnProperty('$set')) {
                    updateDoc = {"$set": {}};
                    for(var i in req.fields['$set']) {
                        if(i !== 'id') {
                            updateDoc['$set']['sections.$.'+i] = req.fields['$set'][i];
                        } else {
                            if(sectionPathId !== req.fields['$set'][i]) {
                                // change the ID
                                updateDoc['$set']['sections.$.'+i] = req.fields['$set'][i];
                                house.log.debug('update section id');
                            }
                        }
                    }
                }
                if(updateDoc == {}) return;
                ds.update(col, query, updateDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        respondWithFind(query);
                    }
                });
            } else {
                if(docId) {
                    query._id = docId;
                    var putDoc = req.fields;
                    var updateGroups = false;
                    for(var k in putDoc) {
                        if(putDoc.hasOwnProperty(k) && k.substr(0,1) == '$') {
                            for(var colName in putDoc[k]) {
                                if(colName == 'groups') {
                                    updateGroups = true;
                                }
                                if(colName == 'owner') {
                                    
                                }
                            }
                        }
                    }
                    var doProc = false;
                    if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('proc')) {
                        doProc = true;
                    }
                    
                    if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('publish')) {
                        house.log.debug('publish site');
                        // phantom the page and write the html to index.html
                        var phantomUrl = function(url, callback) {
                            console.log('pantom url '+url)
                            var html = ''
                            , title = ''
                            , desc = '';
                            var fullPath = '/tmp/'+encodeURIComponent(url)+'.png';
                            var screenRes = '1024x768x24'; // 640x480x24
                            //var phantomjs = spawn('xvfb-run', ['-as', '-screen 0 '+screenRes, 'phantomjs', __dirname+'/phantom.js', url]);
                            var phantomjs = spawn('phantomjs', ['--ignore-ssl-errors=yes', '--load-images=no', __dirname+'/phantom.js', url]);
                            phantomjs.stdout.on('data', function (data) {
                              //console.log('phantomjs.stdout: ' + data);
                              html += data.toString();
                            });
                              
                            phantomjs.stderr.on('data', function (data) {
                              console.log('!phantomjs stderr: ' + data);
                            });
                              
                            phantomjs.on('exit', function (code) {
                                house.log.debug('phantomjs process exited with code ' + code);
                                callback(null, fullPath, html, title);
                            });
                        }
                        house.log.debug(putDoc["$set"].publish);
                        var parsedUrl = url.parse(putDoc["$set"].publish);
                        house.log.debug(parsedUrl);
                        house.log.debug('cache'+parsedUrl.path);
                        
                        //var publishPath = process.cwd()+'/web/'+docId+'.html';
                        var publishPath = process.cwd()+'/cache'+parsedUrl.path;
                        var publishPathLastSlash = publishPath.lastIndexOf('/');
                        var pathFile = publishPath.substr(publishPathLastSlash);
                        if(pathFile === '/') {
                            pathFile = '/index';
                            publishPath = publishPath.substr(0, publishPathLastSlash) + pathFile;
                        }
                        //pathFile = pathFile+'.html';
                        var pathFolder = publishPath.substr(0, publishPathLastSlash);
                        
                        fs.unlink(publishPath+'.html', function(err){
                            if(err) {
                                house.log.err(err);
                                // res.data({}); // file doesnt exist
                            }
                            phantomUrl(putDoc["$set"].publish, function(err, phantomImagePath, html, title) {
                                mkdirp(pathFolder, function (err) {
                                    if(err) {
                                        house.log.err(err);
                                        res.data({});
                                    } else{
                                        fs.writeFile(publishPath+'.html', html, function(err){
                                            if(err) {
                                                house.log.err(err);
                                                res.data({});
                                            } else{
                                                res.data({publish: putDoc["$set"].publish});
                                            }
                                        });
                                    }
                                });
                            });
                        });
                        
                        return;
                    }
                    
                    ds.update(col, query, putDoc, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            house.log.debug(data);
                            ds.find(col, query, function(err, data) {
                                var updatedDoc = _.first(data);
                                house.log.debug(data);
                                if(updateGroups) {
                                }
                                var putRespond = function(data) {
                                    data = filterData(data);
                                    res.data(data);
                                    house.log.debug('io emit pages update');
                                    emitToRoomIn(col, 'updated', data);
                                }
                                if(doProc) {
                                    //processPages(data, function(err, data){
                                        putRespond(data);
                                    //});
                                } else {
                                    putRespond(data);
                                }
                            });
                        }
                    });
                }
            }
        } else if(req.method == 'DELETE') {
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            var query = {};
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query['owner.id'] = req.session.data.user;
            }
            if(docId) {
                if(subPath && subPath.indexOf(featurePrefix) === 0) {
                    // pull out the given group
                    var featureId = subPath.substr(featurePrefix.length+1);
                    console.log(featureId);
                    ds.update(col, {"_id": docId}, {"$pull": {"features": {"id": featureId}}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                        } else {
                            house.log.debug(data);
                        }
                        res.data(featureId);
                    });
                } else if(subPath && subPath.indexOf(sectionPrefix) === 0) {
                    // pull out the given group
                    var sectionId = subPath.substr(sectionPrefix.length+1);
                    console.log(sectionId);
                    ds.update(col, {"_id": docId}, {"$pull": {"sections": {"id": sectionId}}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                        } else {
                            house.log.debug(data);
                        }
                        res.data(sectionId);
                    });
                } else {
                    query._id = docId;
                    ds.find(col, query, function(err, data) {
                        var doc = _.first(data);
                        incUserPages(req.session.data.user, -1);
                        ds.remove(col, query, function(err, data){
                            if(err) {
                                house.log.err(err);
                                res.end('error');
                            } else {
                                res.data(data);
                                emitToRoomIn(col, 'deleted', docId);
                            }
                        });
                    });
                }
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    
    return handleReq;
});
