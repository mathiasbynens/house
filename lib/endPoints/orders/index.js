//
// # Orders Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
var mkdirp = require('mkdirp');
var moment = require('moment');
var schedule = require('node-schedule');

(exports = module.exports = function(house, options){
    
    var ds = options.ds;
    var col = options.collection;
    var colItems = options.collectionMenuItems;
    var usersCol = options.collectionUsers || 'users';
    
    var ensureIndexes = function() {
        var collection = ds.db.collection(col);
        collection.ensureIndex({"status": 1, "at": -1, "user.id": 1}, function(){
            house.log.debug('index ensured for orders status at user.id');
        });
    };
    ds.connected(function(){
        ensureIndexes();
    });
    
    if(!house.config.forkedFeedFetcher) {
        // if(house.config.site.sysadmin && house.config.site.sysadmin.dailyDigest && house.config.site.sysadmin.email) {
        var email = require('./email')(house, options).email;
        // email.initDailyDigest();
        // email.sendReceipt({email: house.config.site.sysadmin.email});
        // }
    }
    
    var procOrder = function(order, callback) {
        console.log(order);
        if(!order) {
            house.log.err('procOrder - no order');
            if(callback) {
                callback();
            }
            return;
        }
        procRepeated(order, function(){
            procDurationEnd(order, function(){
                var now = new Date();
                var newProcArr = [];
                for(var d in order.procAt) {
                    var procAtTime = order.procAt[d];
                    if(procAtTime > now) {
                        newProcArr.push(procAtTime);
                    }
                }
                var updateOrder;
                if(newProcArr.length > 0) {
                    updateOrder = {
                        "$set": {
                            procAt: newProcArr
                        }
                    }
                } else {
                    updateOrder = {
                        "$unset": {
                            procAt: true
                        }
                    }
                }
                ds.update(col, {_id: order.id}, updateOrder, function(err, data) {
                    house.log.debug('proc order complete.')
                    if(callback) {
                        callback();
                    }
                });
            });
        });
    }
    var procRepeated = function(order, callback) {
        var now = new Date();
        var itemSkus = [];
        for(var s in order.itemSkus) {
            var itemSku = order.itemSkus[s];
            if(itemSku && itemSku.repeatAt && itemSku.repeatAt < now) {
                itemSkus.push(itemSku);
            }
        }
        
        if(itemSkus.length > 0) {
            // create new order
            
            house.log.debug('create new order from repeating order');
            
            var newDoc = {
                at: new Date(),
            }
            if(order.user) {
                newDoc.user = order.user;
            }
            if(order.payment) {
                newDoc.payment = order.payment;
            }
            newDoc.itemSkus = [];
            newDoc.repeat_order_id = order.id;
            
            newDoc.status = 10; // TODO 
            
            for(var i in itemSkus) {
                var itemSku = itemSkus[i];
                var newItemSku = {
                    id: new ObjectID(),
                    qty: itemSku.qty
                };
                if(itemSku.item) {
                    newItemSku.item = itemSku.item;
                }
                if(itemSku.sku) {
                    newItemSku.sku = itemSku.sku;
                }
                
                newDoc.itemSkus.push(newItemSku);
            }
            
            ds.insert(col, newDoc, function(err, newOrder){
                if(err) {
                    house.log.err(err);
                    res.end('error');
                } else {
                    console.log(newOrder);
                    var updateOrderDoc = {"$push": {
                        "repeated_order_ids": newOrder.id
                    }};
                    // updateOrderDoc["$set"][""] = newOrder.id;
                    ds.update(col, {_id: order.id}, updateOrderDoc, function(err, data){
                        
                        house.log.debug('updated orig order after procRepeat');
                        
                        
                        // process payment automatically like the previous way
                        if(order.payment && order.payment.credit) {
                            // TODO
                        }
                        
                        findOrderById(order.id, function(data){
                            if(data.user.id) {
                                house.ioi.emitDocToRoomOwnerGroup(col, 'inserted', data, data.user.id);
                            } else {
                                house.ioi.emitDocToRoomOwnerGroup(col, 'inserted', data);
                            }
                        });
                        
                        if(callback) {
                            callback();
                        }
                    });
                }
            });
            
        } else {
            if(callback) {
                callback();
            }
        }
    }
    
    // TODO give a grace period between repeating and duration ending the membership
    var procDurationEnd = function(order, callback) {
        var now = new Date();
        var itemSkus = [];
        for(var s in order.itemSkus) {
            var itemSku = order.itemSkus[s];
            if(itemSku && itemSku.durationAt && itemSku.durationAt < now) {
                itemSkus.push(itemSku);
            }
        }
        
        if(itemSkus.length > 0) {
            // 
            house.log.debug('has itemskus with ending durations - '+itemSkus.length);
            var nextDuration = function(callback) {
                house.log.debug('proc itemsku with durationAt')
                var itemSku = itemSkus.pop();
                console.log(itemSku);
                if(itemSku.durationAt && itemSku.item && itemSku.item.membership) {
                    house.log.debug('revoke membership')
                    house.log.debug(itemSku.item.membership)
                    revokeGroupMembershipsFromUserId(itemSku.item.membership, order.user.id, function() {
                        var orderSkuItemQuery = {
                            "_id": order.id,
                            "itemSkus.id": itemSku.id
                        }
                        var updateOrderSkuItemDoc = {
                            "$set": {
                                "durationEndAt": new Date()
                            }
                        }
                        ds.update(col, orderSkuItemQuery, updateOrderSkuItemDoc, function(err, data) {
                            if(itemSkus.length > 0) {
                                nextDuration(callback);
                            } else {
                                if(callback) {
                                    callback();
                                }
                            }
                        });
                    });
                } else {
                    if(itemSkus.length > 0) {
                        nextDuration(callback);
                    } else {
                        if(callback) {
                            callback();
                        }
                    }
                }
            }(callback);
            
        } else {
            if(callback) {
                callback();
            }
        }
    }
    var processOrders = function(callback) {
        var query = {
            procAt: {
                $lt: new Date()
            },
        };
        var orders = [];
        console.log(query);
        ds.find(col, query, function(err, data){
            _.each(data, function(order){
                orders.push(order);
            });
            console.log('orders')
            console.log(orders)
            
            var procNextOrder = function(callback) {
                var order = orders.pop();
                procOrder(order, function(){
                    if(orders.length > 0) {
                        procNextOrder(callback);
                    } else {
                        if(callback) {
                            callback();
                        }
                    }
                });
            }
            if(orders.length > 0) {
                procNextOrder(callback);
            } else {
                if(callback) {
                    callback();
                }
            }
        });
    }
    
    
    if(!house.config.forkedFeedFetcher) {
    
        var nightlyRule = new schedule.RecurrenceRule();
        nightlyRule.hour = 0;
        nightlyRule.minute = 5;
    
        var nightlyJob = schedule.scheduleJob({hour: 0, minute:1}, function(){
            house.log.debug('run nightly process to check repeat/duration orders');
            processOrders();
        });
         
         
        var test = false; 
        if(test) {
            // var testJob = schedule.scheduleJob({hour: 21, minute:31}, function(){
            setTimeout(function(){
                house.log.debug('run test process to check repeat/duration orders');
                processOrders(function(){
                    house.log.debug('processing orders complete.');
                });
            }, 2000);
            // });
        }
    }
    var getUserDoc = function(id, callback) {
        ds.find(usersCol, {_id: id}, function(err, data){
            if(err) {
                house.log.err(err);
                if(callback) {
                    callback();
                }
            } else {
                if(callback) {
                    callback(_.first(data));
                }
            }
        });
    }
    var updateUserIdWithDoc = function(userId, doc, cb) {
        ds.update(usersCol, {
            _id: userId
        }, doc, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                if (cb) cb();
            }
        });
    }
    var incUserField = function(userId, field, b) {
        b = b || 1;
        var updateDoc = {
            "$inc": {}
        };
        updateDoc["$inc"][field] = b;
        updateUserIdWithDoc(userId, updateDoc);
    }
    var incUserOrders = function(userId, field, b) {
        incUserField(userId, 'ordersCount', b);
    }
    
    var grantGroupMembershipsToUserId = function(membershipArr, userId, callback) {
        house.log.debug('grand user '+userId+' to groups:')
        house.log.debug(membershipArr);
        var updateDoc = {
            "$pushAll": {
                "groups": membershipArr
            }
        };
        updateUserIdWithDoc(userId, updateDoc, function(){
            getUserDoc(userId, function(userDoc){
                console.log('emit user update to socket io')
                house.ioi.emitDocToRoomOwnerGroup(usersCol, 'updated', userDoc, userId);
            });
            if(callback) {
                callback();
            }
        });
    }
    var revokeGroupMembershipsFromUserId = function(membershipArr, userId, callback) {
        var updateDoc = {
            "$pullAll": {
                "groups": membershipArr
            }
        };
        updateUserIdWithDoc(userId, updateDoc, function(){
            getUserDoc(userId, function(userDoc){
                console.log('emit user group loss to socket io')
                house.ioi.emitDocToRoomOwnerGroup(usersCol, 'updated', userDoc, userId);
            });
            if(callback) {
                callback();
            }
        });
    }
    
    var processItemSkusSales = function(orderDoc, callback) {
        console.log(orderDoc)
        // console.log(orderDoc._id)
        var orderId = orderDoc.id;
        var itemSkus = orderDoc.itemSkus;
        // for(var i in itemSkus) {
        //     var itemSku = itemSkus[i];
        //     incItemSkuSales(itemSku);
        // }
        var itemSkusStack = _.clone(itemSkus);
        var procItemSku = function() {
            var itemSku = itemSkusStack.pop();
            incItemSkuSales(itemSku, function(){
                procRepeat(orderDoc, itemSku, function(){
                    procDuration(orderDoc, itemSku, function(){
                        procMemberships(orderDoc, itemSku, function(){
                            if(itemSkusStack.length > 0) {
                                procItemSku();
                            } else {
                                house.log.debug('finished processing sku-items');
                                var doProcess = false;
                                // house.log.debug(orderDoc.itemSkus);
                                // Determine if we should consider the order auto processed
                                //  ie. electronic delivery of site "group" memberships
                                for(var i in orderDoc.itemSkus) {
                                    var itemSku = orderDoc.itemSkus[i];
                                    if(itemSku.item && itemSku.item.membership && itemSku.item.membership.length > 0) {
                                        doProcess = true;
                                    }
                                }
                                
                                if(doProcess) {
                                    var updateOrderStatus = {
                                        "$set": {
                                            "status": 100,
                                            "processed": {
                                                at: new Date()
                                            },
                                            "complete": {
                                                at: new Date()
                                            }
                                        },
                                    }
                                    house.log.debug(orderDoc.id);
                                    console.log(orderId);
                                    ds.update(col, {_id: orderId}, updateOrderStatus, function(err, data) {
                                        // house.log.debug('order processed');
                                        // house.log.debug(data);
                                        if(callback) {
                                            callback();
                                        }
                                    });
                                } else {
                                    if(callback) {
                                        callback();
                                    }
                                }
                            }
                        });
                    });
                });
            });
        }
        procItemSku();
        // dec Item Inventory TODO
    }
    var getDateFromNow = function(durationObj) {
        var now = moment();
        var fromNow;
        if(durationObj.days) {
            fromNow = now.add('days', durationObj.days);
        } else if(durationObj.weeks) {
            fromNow = now.add('weeks', durationObj.weeks);
        } else if(durationObj.months) {
            fromNow = now.add('months', durationObj.months);
        } else if(durationObj.years) {
            fromNow = now.add('years', durationObj.years);
        }
        return fromNow.toDate();
    }
    var procRepeat = function(orderDoc, itemSku, callback) {
        console.log(itemSku)
        if(itemSku.sku && itemSku.sku.repeat) {
            var repeatOn = getDateFromNow(itemSku.sku.repeat);
            var updateOrderDoc = {$push: {procAt: repeatOn}};
            ds.update(col, {_id: orderDoc.id}, updateOrderDoc, function(err, data) {
                
                var orderSkuItemQuery = {
                    "_id": orderDoc.id,
                    "itemSkus.id": itemSku.id
                }
                var updateOrderSkuItemDoc = {
                    "$set": {
                        "itemSkus.$.repeatAt": repeatOn
                    }
                }
                
                ds.update(col, orderSkuItemQuery, updateOrderSkuItemDoc, function(err, data) {
                    if(callback) {
                        callback();
                    }
                });
            });
        } else {
            if(callback) {
                callback();
            }
        }
    }
    var procDuration = function(orderDoc, itemSku, callback) {
        if(itemSku.sku.duration) {
            var procAt = getDateFromNow(itemSku.sku.duration);
            var updateOrderDoc = {$push: {procAt: procAt}};
            ds.update(col, {_id: orderDoc.id}, updateOrderDoc, function(err, data) {
                var orderSkuItemQuery = {
                    "_id": orderDoc.id,
                    "itemSkus.id": itemSku.id
                }
                var updateOrderSkuItemDoc = {
                    "$set": {
                        "itemSkus.$.durationAt": procAt
                    }
                }
                ds.update(col, orderSkuItemQuery, updateOrderSkuItemDoc, function(err, data) {
                    if(callback) {
                        callback();
                    }
                });
            });
        } else {
            if(callback) {
                callback();
            }
        }
    }
    var procMemberships = function(orderDoc, itemSku, callback) {
        console.log(orderDoc);
        console.log(itemSku);
        if(itemSku.item.membership) {
            // grant group membership to order user
            if(orderDoc.user) {
                grantGroupMembershipsToUserId(itemSku.item.membership, orderDoc.user.id, function(){
                    if(callback) {
                        callback();
                    }
                });
            } else {
                house.log.err('not a user to give group to')
            }
        } else {
            if(callback) {
                callback();
            }
        }
    }
    var incItemSkuSales = function(itemSku, callback) {
        // itemSku
        var itemId = itemSku.item.id;
        var skuId = itemSku.sku.id;
        
        // menuItems item:id sold $inc
        // menuItems item:id skus.$.sold $inc
        
        var updateItemDoc = {
            "$inc": {
                sold: itemSku.qty
            }
        }
        ds.update(colItems, {_id: itemId}, updateItemDoc, function(){
            house.log.debug('updated item qty sold');
            var updateItemSkuDoc = {
                "$set": {
                    "sku.$": itemSku.qty
                }
            }
            ds.update(colItems, {_id: itemId, "sku.id": skuId}, updateItemSkuDoc, function(){
                if(callback) {
                    callback();
                }
            });
        });
    }
    
    var setRepeatEnd = function() {
        // $set skuItems.$.repeatEnd
    }
    var setDurationEnd = function() {
        // $set skuItems.$.durationEnd
    }
    
    var findOrderById = function(id, callback) {
        ds.find(col, {_id: id}, function(err, data) {
            if(callback) {
                callback(_.first(data));
            }
        });
    }
    
    var sendOrderNotifications = function(orderDoc) {
        // send payment email to sysadmin
        // send thank you email to customer
        
        getUserDoc(orderDoc.user.id, function(userDoc) {
            if(!userDoc) {
                house.log.err('no user found for the order');
            } else {
                email.sendThankYou(orderDoc, userDoc);
            }
            if(house.config.site && house.config.site.sysadmin && house.config.site.sysadmin.email) {
                house.log.debug('send sysadmin receipt')
                email.sendReceipt(house.config.site.sysadmin.email, orderDoc, userDoc);
            }
        });
    }
    
    var processSaleOrderId = function(id, callback) {
        ds.find(col, {_id: id}, function(err, data){
            if(err) {
                house.log.err(err);
            } else if(data) {
                var orderDoc = _.first(data);
                if(orderDoc) {
                    console.log('orderDoc');
                    console.log(orderDoc)
                    processItemSkusSales(orderDoc, function(){
                        findOrderById(orderDoc.id, function(doc){
                            if(doc) {
                                // if(doc.membership)
                                // house.log.debug('order processed');
                                house.log.debug(doc);
                                callback(doc);
                                
                                // send notifications, thank you
                                sendOrderNotifications(doc);
                            } else {
                                house.log.err('order not found');
                                callback(false);
                            }
                        });
                        // if group memberships granted, advance to processed status
                    });
                }
            } else {
                house.log.err(new Error('no data from mongo'));
            }
        });
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        var reqCanCashier = function() {
            return (req.session.data.hasOwnProperty('groups') && ((req.session.data.groups.indexOf('admin') !== -1) || (req.session.data.groups.indexOf('cashier') !== -1)));
        }
        var reqIsAdmin = function() {
            return (req.session.data.hasOwnProperty('groups') && ((req.session.data.groups.indexOf('admin') !== -1) ));
        }
        var parseQuery = function(query) {
            console.log('parse query:');
            console.log(query);
            
            for(var i in query) {
                var xi = i.indexOf('[$exists]');
                if(xi !== -1) {
                    var v = query[i];
                    if(v === 'false') v = false;
                    query[i.substr(0,xi)] = {"$exists": v};
                    delete query[i];
                }
            }
            
            if(query.status) {
                query.status = parseInt(query.status);
            }
            if(query["user.id"]) {
                query["user.id"] = new ObjectID(query["user.id"]);
            }
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                if(req.session.data.user) {
                    query["$or"] = [
                        {session_id : req.session.data.id}, 
                        {"user.id": req.session.data.user}
                    ];
                } else {
                    query.session_id = req.session.data.id;
                }
            }
            
            console.log(query);
            return query;
        }
        var countQuery = function(query) {
            //query["owner.id"] = req.session.data.user;
            query = parseQuery(query);
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    res.setHeader('X-Count', data);
                    res.data({});
                } else {
                    house.log.err(new Error('no data from mongo'));
                    res.setHeader('X-Count', 0);
                    res.data({});
                }
            });
        }
        var findQuery = function(query) {
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
        
        var docId;
        var subPath = false;
        var itemSkusStr = 'itemSkus';
        var itemSkusPrefix = '/'+itemSkusStr;
        
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
            console.log('subPath')
            console.log(subPath)
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
                house.log.debug('subPath '+subPath);
                house.log.debug('subPath docId '+docId);
                if(subPath && subPath.indexOf(itemSkusPrefix) === 0) {
                    // if(req.query) {
                    //     query = req.query;
                    // }
                    // ds.find(col, {_id: docId, fields: {'skus': true}}, function(err, data){
                    //     if(err) {
                    //         house.log.err(err);
                    //         res.setHeader('X-Count', 0);
                    //         res.data({});
                    //     } else if(data) {
                    //         var doc = _.first(data);
                    //         var skus = _.first(data).skus || [];
                    //         res.setHeader('X-Count', skus.length);
                    //         res.data({});
                    //     } else {
                    //         house.log.err(new Error('no data from mongo'));
                    //         res.setHeader('X-Count', 0);
                    //         res.data({});
                    //     }
                    // });
                } else {
                    query._id = docId;
                    countQuery(query);
                }
            } else {
                if(req.query) {
                    query = req.query;
                }
                countQuery(query);
            }
        } else if(req.method == 'POST') {
            house.log.debug('post');
            console.log(path)
            console.log(req.fields)
            
            if(subPath && subPath === itemSkusPrefix) {
                var newItemSku = req.fields;
                if(newItemSku.hasOwnProperty('item_id')) {
                    newItemSku.item_id = new ObjectID(newItemSku.item_id);
                }
                
                if(newItemSku._id) {
                    newItemSku.id = new ObjectID(newItemSku._id);
                    delete newItemSku._id;
                } else if(newItemSku.id) {
                    newItemSku.id = new ObjectID(newItemSku.id);
                } else {
                    newItemSku.id = new ObjectID();
                }
                
                if(newItemSku.sku) {
                    if(newItemSku.sku.id) {
                        newItemSku.sku.id = newItemSku.sku.id;
                    }
                }
                if(newItemSku.item) {
                    if(newItemSku.item.id) {
                        newItemSku.item.id = new ObjectID(newItemSku.item.id);
                    }
                }
                
                // grab full info from menuItems
                ds.find(colItems, {_id: newItemSku.item.id}, function(err, data){
                    
                    var itemDoc = _.first(data);
                    if(itemDoc.membership) {
                        newItemSku.item.membership = itemDoc.membership;
                    }
                
                    ds.update(col, {_id: docId}, {$push: {itemSkus: newItemSku}}, function(err, data){
                        res.data(newItemSku);
                        
                        findOrderById(docId, function(doc){
                            house.ioi.emitDocToRoomOwnerGroup(col, 'updated', doc, req.session.data.user);
                        });
                    });
                });
            } else {
                var newDoc = req.fields;
                newDoc.at = new Date();
                
                newDoc["session_id"] = req.session.data.id;
                if(req.session.data.user) {
                    newDoc.user = {
                        id: req.session.data.user,
                        name: req.session.data.name
                    }
                } else if(req.session.data.name) {
                    newDoc["session_name"] = req.session.data.name;
                }
                
                console.log(req.session);
                
                if(path == '') {
                    ds.insert(col, newDoc, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            house.ioi.emitDocToRoomOwnerGroup(col, 'inserted', data, req.session.data.user);
                            res.data(data);
                        }
                    });
                }
            }
        } else if(req.method == 'PUT') {
            var query = {};
            if(docId) {
                query._id = docId;
                
                if(reqCanCashier()){
                } else {
                    if(req.session.data.user) {
                        query["user.id"] = req.session.data.user;
                    } else {
                        query.session_id = req.session.data.id;
                    }
                }
            
                if(subPath && subPath.indexOf(itemSkusPrefix) === 0) {
                    console.log('subPath of itemSkus prefix');
                    // pull out the given image
                    var pathId = subPath.substr(itemSkusPrefix.length+1);
                    console.log(pathId);
                    query['itemSkus.id'] = new ObjectID(pathId);
                    var updateDoc = {};
                    
                    if(req.fields.hasOwnProperty('$set')) {
                        updateDoc = {"$set": {}};
                        for(var i in req.fields['$set']) {
                            if(i !== 'id') {
                                updateDoc['$set']['itemSkus.$.'+i] = req.fields['$set'][i];
                            }
                        }
                    } else if(req.fields.hasOwnProperty('$unset')) {
                        updateDoc = {"$unset": {}};
                        for(var i in req.fields['$unset']) {
                            if(i !== 'id') {
                                updateDoc['$unset']['itemSkus.$.'+i] = req.fields['$unset'][i];
                            }
                        }
                    }
                    if(updateDoc == {}) return;
                    ds.update(col, query, updateDoc, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            house.log.debug(data);
                            res.data(data);
                            
                            findOrderById(docId, function(doc){
                                house.log.debug('put updated order');
                                house.log.debug(doc);
                                if(doc.user && doc.user.id) {
                                    house.ioi.emitDocToRoomOwnerGroup(col, 'updated', doc, doc.user.id);
                                } else {
                                    house.ioi.emitDocToRoomOwnerGroup(col, 'updated', doc);
                                }
                            });
                        }
                    });
                } else {
                    
                    // TODO set status
                    var updateObject = req.fields;
                    console.log(updateObject);
                    var procSale = false;
                    
                    if(updateObject.hasOwnProperty('$set')) {
                        
                        if(updateObject['$set'].hasOwnProperty('user')) {
                            console.log('set user');
                            if(reqCanCashier()){
                                updateObject['$set']['user']['id'] = new ObjectID(updateObject['$set']['user']['id']);
                            } else {
                                updateObject['$set']['user'] = {
                                    id: req.session.data.user,
                                    name: req.session.data.name
                                }
                                
                                if(query["user.id"]) {
                                    query.session_id = req.session.data.id;
                                    delete query["user.id"];
                                }
                            }
                        }
                        console.log(updateObject['$set']);
                        
                        if(updateObject['$set'].hasOwnProperty('paid')) {
                        }
                        if(updateObject['$set'].hasOwnProperty('status')) {
                            console.log(updateObject['$set']['status']);
                            var statusCode = updateObject['$set']['status'];
                            if(statusCode === 20) { // PLACED
                                // intent of customer to pay via payment field ex {cash: true}
                            } else if(statusCode === 30) { // PAID
                                // cashier tender of cash payments
                                if(reqCanCashier()){
                                    
                                    // APPROVED PAYMENT
                                    if(updateObject['$set'].hasOwnProperty('paid') && updateObject['$set']['paid'].hasOwnProperty('cash')) {
                                        // updateObject['$set']['totalupdateObject['$set']['paid']['cash'];
                                        updateObject['$set']['gross'] = updateObject['$set']['paid']['cash'];
                                        updateObject['$set']['paid']['cashier'] = {
                                            id: req.session.data.user,
                                            name: req.session.data.name
                                        }
                                        updateObject['$set']['paid']['at'] = new Date();
                                    }
                                    
                                    // trigger did payment -> process -> processed.
                                    procSale = true;
                                    
                                } else {
                                    updateObject['$set']['status'] = 25; // DECLINED
                                    updateObject['$set']['declined'] = {reason: 'Only a cashier can tender cash from the register.'};
                                }
                            }
                        }
                    }
                    
                    house.log.debug('order updateObject');
                    house.log.debug(updateObject);
                    house.log.debug(query);
                    
                    ds.update(col, query, updateObject, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            house.log.debug(data);
                            if(procSale) {
                                processSaleOrderId(docId, function(doc){
                                    if(doc) {
                                        res.data(doc);
                                        if(doc.user.id) {
                                            house.ioi.emitDocToRoomOwnerGroup(col, 'updated', doc, doc.user.id);
                                        } else {
                                            house.ioi.emitDocToRoomOwnerGroup(col, 'updated', doc);
                                        }
                                    } else {
                                        res.data({});
                                    }
                                });
                            } else {
                                findOrderById(docId, function(doc){
                                    if(doc) {
                                        res.data(doc);
                                        if(doc.user && doc.user.id) {
                                            house.ioi.emitDocToRoomOwnerGroup(col, 'updated', doc, doc.user.id);
                                        } else {
                                            house.ioi.emitDocToRoomOwnerGroup(col, 'updated', doc);
                                        }
                                    } else {
                                        res.data({});
                                    }
                                });
                            }
                        }
                    });
                }
            }
        } else if(req.method == 'DELETE') {
            var query = {};
            if(!reqIsAdmin()) {
                if(req.session.data.user) {
                    query["user.id"] = req.session.data.user;
                } else {
                    query.session_id = req.session.data.id;
                }
            }
            if(docId && subPath && subPath.indexOf(itemSkusPrefix) === 0) {
                console.log('pull out itemsku');
                // pull out the given image
                var pathSku = '';
                var pathItemId = subPath.substr(itemSkusPrefix.length+1);
                console.log(pathItemId);
                var pathItemIdi = pathItemId.indexOf('/');
                if(pathItemIdi !== -1) {
                    console.log(pathItemIdi)
                    console.log(pathItemId)
                    console.log(pathItemId);
                    pathSku = pathItemId.substr(pathItemIdi+1);
                    pathItemId = pathItemId.substr(0,pathItemIdi);
                    console.log(pathSku);
                }
                var itemId = new ObjectID(pathItemId);
                var updoc = {"$pull": {}};
                updoc["$pull"][itemSkusStr] = {
                    id: itemId
                }
                if(pathSku !== '') {
                    updoc["$pull"][itemSkusStr]['id'] = pathSku;
                }
                console.log(updoc);
                ds.update(col, {"_id": docId}, updoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                        findOrderById(docId, function(doc){
                            if(doc) {
                                house.ioi.emitDocToRoomOwnerGroup(col, 'updated', doc, req.session.data.user);
                            }
                        });
                    }
                    res.data(data);
                });
                return;
            }
            
            if(docId) {
                query._id = docId;
                ds.remove(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
                        findOrderById(docId, function(doc){
                            if(doc) {
                                house.ioi.emitDocToRoomOwnerGroup(col, 'deleted', docId, req.session.data.user);
                            }
                        });
                    }
                });
                
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
