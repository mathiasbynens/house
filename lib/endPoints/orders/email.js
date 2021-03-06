//
// # Actions Emails Module
//
(exports = module.exports = function(house, options){
    var filesize = require("filesize");
    var ds = options.ds;
    var colActions = options.collection;
    var email = require("emailjs-plus/email");
    var moment = require("moment");
    var emailOpts = {
        user: house.config.email.user,
        password: house.config.email.pass,
        host: house.config.email.smtp,
    };
    if(house.config.email.hasOwnProperty('ssl') && house.config.email.ssl) {
        emailOpts.ssl = house.config.email.ssl;
    }
    if(house.config.email.hasOwnProperty('tls')) {
        emailOpts.tls = house.config.email.tls;
    }
    if(house.config.email.hasOwnProperty('domain')) {
        emailOpts.domain = house.config.email.domain;
    }
    if(house.config.email.port) {
        emailOpts.port = house.config.email.port;
    }
    // console.log(emailOpts)
    var emailServer = email.server.connect(emailOpts);
    var digestSubscribers = [];
    
    var getDigestText = function(callback) {
        var dayStart = new Date();
        dayStart.setMilliseconds(0);
        dayStart.setSeconds(0);
        dayStart.setMinutes(0);
        dayStart.setHours(0);
        dayStart.setDate(dayStart.getDate()-1);
        // dayStart.setDate(1);
        // var aggregateCmd = 'db.bandwidth.aggregate([{$match:{day: {$gte: ISODate("'+isoStr+'")}}},{$group:{_id: "sum", total: { "$sum": "$t" }, count: {"$sum": 1}}}]).result[0].total;';
        var dbCollectionBandwidth = ds.db.collection('bandwidth');
        dbCollectionBandwidth.aggregate([{$match:{day: dayStart}},{$group:{_id: "sum", total: { "$sum": "$t" }, count: {"$sum": 1}}}], function(err, result){
            // house.log.debug(result);
            var doc = _.first(result);
            var str = 'Bandwith used: '+filesize(doc.total)+' \n\n';
            var bandwidthQuery = {
                day: dayStart
                , sort: {t: -1}
                , limit: 10
            };
            ds.find('bandwidth', bandwidthQuery, function(err, data){
                str = str+'Top requests by bandwidth - \n\n';
                // console.log(data);
                var n = 1;
                for(var i in data) {
                    str = str+'  '+n+'. '+data[i].name+' requested '+data[i].c+' times totaling '+filesize(data[i].t)+' \n';
                    n = n + 1;
                }
                
                // SESSIONS 
                var sessionsQuery = {
                    lastAt: {
                        $gt: dayStart
                    },
                    sort: {
                        c: -1
                    }
                }
                ds.find('sessions', sessionsQuery, function(err, data){
                    
                    var totalSessions = data.length;
                    str = str+'\n\nTotal Sessions: '+totalSessions+'  \n\n';
                    
                    var newSessions = 0;
                    _.each(data, function(doc) {
                        var timestamp = doc.id.toString().substring(0,8);
                        var date = new Date( parseInt( timestamp, 16 ) * 1000 );
                        if(date > dayStart) {
                            newSessions++;
                        }
                    });
                    
                    str = str+'New Sessions: '+newSessions+' ';
                    
                    str = str+'\n\nTop New Sessions by requests - \n\n';
                    // house.log.debug(data);
                    var n = 1;
                    _.each(data, function(doc) {
                        if(n > 10) return;
                        var timestamp = doc.id.toString().substring(0,8);
                        var date = new Date( parseInt( timestamp, 16 ) * 1000 );
                        if(date > dayStart) {
                            if(doc.d) {
                                var momentDuration = moment().subtract(doc.d);
                                str = str+ ' '+momentDuration.fromNow(true)+''; // doc.d.toLocaleString()
                            }
                            if(doc.geo) {
                                str = str+ ' from ';
                                if(doc.geo.city) {
                                    str = str+ doc.geo.city;
                                }
                                if(doc.geo.state) {
                                    str = str+ ', '+doc.geo.state+' ';
                                } else if(doc.geo.country) {
                                    str = str+ ' '+doc.geo.country+' ';
                                } else if(doc.geo.zip) {
                                    str = str+ ' '+doc.geo.zip+' ';
                                }
                            }
                            if(doc.agent) {
                                str = str+ ' on ';
                                if(doc.agent.family) {
                                    str = str+ doc.agent.family;
                                }
                            }
                            if(doc.host) {
                                if(doc.host.name) {
                                    str = str+ ' via '+doc.host.name;
                                }
                            }
                            str = str + ' ' + doc.name+ ' '+ doc.c.toLocaleString()+ ' requests';
                            str = str+ '\n';
                            n = n + 1;
                        }
                    });
                    
                    str = str+'\n\nTop Existing Sessions by requests - \n\n';
                    // house.log.debug(data);
                    var n = 1;
                    _.each(data, function(doc) {
                        if(n > 10) return;
                        var timestamp = doc.id.toString().substring(0,8);
                        var date = new Date( parseInt( timestamp, 16 ) * 1000 );
                        if(date <= dayStart) {
                            if(doc.d) {
                                var momentDuration = moment().subtract(doc.d);
                                str = str+ ' '+momentDuration.fromNow(true)+''; // doc.d.toLocaleString()
                            }
                            if(doc.geo) {
                                str = str+ ' from ';
                                if(doc.geo.city) {
                                    str = str+ doc.geo.city;
                                }
                                if(doc.geo.state) {
                                    str = str+ ', '+doc.geo.state+' ';
                                } else if(doc.geo.country) {
                                    str = str+ ' '+doc.geo.country+' ';
                                } else if(doc.geo.zip) {
                                    str = str+ ' '+doc.geo.zip+' ';
                                }
                            }
                            if(doc.agent) {
                                str = str+ ' on ';
                                if(doc.agent.family) {
                                    str = str+ doc.agent.family;
                                }
                            }
                            if(doc.host) {
                                if(doc.host.name) {
                                    str = str+ ' via '+doc.host.name;
                                }
                            }
                            str = str + ' ' + doc.name+ ' '+ doc.c.toLocaleString()+ ' requests';
                            str = str+ '\n';
                            n = n + 1;
                        }
                    });
                    
                    callback(str);
                });
            });
        });
        // cursor.on('data', function(data){
        //     console.log(data);
        // });
        // cursor.on('end', function() {
        //     callback('bandwith used: '+data);
        // });
    }
    
    var sendReceipt = function(toEmail, orderDoc, userDoc) {
        var sendEmailOpts = {
            from: '<'+house.config.email.user+'>',
            to: toEmail,
            subject: 'Order Placed',
            text: ''
        };
        if(house.config.site.title) {
            sendEmailOpts.subject = house.config.site.title + ' - ' + sendEmailOpts.subject;
        }
        
        if(userDoc) {
            sendEmailOpts.text = userDoc.name;
        } else {
            if(orderDoc.session_name) {
                sendEmailOpts.text = orderDoc.session_name;
            } else {
                sendEmailOpts.text = 'Guest';
            }
        }
        sendEmailOpts.text = sendEmailOpts.text + '\n\
        \n\
This order has been receive and is being processed.';

        if(orderDoc.itemSkus) {
            for(var i in orderDoc.itemSkus) {
                var itemSku = orderDoc.itemSkus[i];
                var itemSkuStr = itemSku.item.name;
                if(itemSku.sku && itemSku.sku.name) {
                    itemSkuStr = itemSkuStr + ' ' + itemSku.sku.name;
                }
                if(itemSku.sku && itemSku.sku.price) {
                    itemSkuStr = itemSkuStr + ' $' + itemSku.sku.price;
                }
                if(itemSku.sku && itemSku.sku.qty) {
                    itemSkuStr = itemSkuStr + ' qty ' + itemSku.sku.qty;
                }
                sendEmailOpts.text = sendEmailOpts.text + '\n\n\
'+itemSkuStr;
            }
        }
        
        var paymentMethod = '';
        if(orderDoc.paid) {
            if(orderDoc.paid.cash) {
                paymentMethod = 'cash';
            } else if(orderDoc.paid.credit) {
                paymentMethod = 'credit';
            } else if(orderDoc.paid.points) {
                paymentMethod = 'points';
            } else if(orderDoc.paid.bitcoin) {
                paymentMethod = 'bitcoin';
            }
        }

        if(orderDoc.status >= 30) {
            if(orderDoc.gross) {
                sendEmailOpts.text = sendEmailOpts.text + '\n\n\n\
Total paid by '+paymentMethod+': $'+orderDoc.gross;
            }
        }

        emailServer.send(sendEmailOpts, function(err, message) {
            if(err) {
                house.log.err(err);
            } else {
                house.log.debug('sysadmin receipt email sent!');
            }
        });
    }
    
    var sendThankYou = function(orderDoc, userDoc) {
        var sendEmailOpts = {
            from: '<'+house.config.email.user+'>',
            to: userDoc.email,
            subject: 'Order Placed',
            text: ''
        };
        if(house.config.site.title) {
            sendEmailOpts.subject = house.config.site.title + ' - ' + sendEmailOpts.subject;
        }
        
        sendEmailOpts.text = userDoc.name;
        sendEmailOpts.text = sendEmailOpts.text + '\n\
        \n\
Thank you for your business!  Your order has been receive and is being processed.';

        if(orderDoc.itemSkus) {
            for(var i in orderDoc.itemSkus) {
                var itemSku = orderDoc.itemSkus[i];
                var itemSkuStr = itemSku.item.name;
                if(itemSku.sku && itemSku.sku.name) {
                    itemSkuStr = itemSkuStr + ' ' + itemSku.sku.name;
                }
                if(itemSku.sku && itemSku.sku.price) {
                    itemSkuStr = itemSkuStr + ' $' + itemSku.sku.price;
                }
                if(itemSku.sku && itemSku.sku.qty) {
                    itemSkuStr = itemSkuStr + ' qty ' + itemSku.sku.qty;
                }
                sendEmailOpts.text = sendEmailOpts.text + '\n\n\
'+itemSkuStr;
            }
        }
        
        var paymentMethod = '';
        if(orderDoc.paid) {
            if(orderDoc.paid.cash) {
                paymentMethod = 'cash';
            } else if(orderDoc.paid.credit) {
                paymentMethod = 'credit';
            } else if(orderDoc.paid.points) {
                paymentMethod = 'points';
            } else if(orderDoc.paid.bitcoin) {
                paymentMethod = 'bitcoin';
            }
        }

        if(orderDoc.status >= 30) {
            if(orderDoc.gross) {
                sendEmailOpts.text = sendEmailOpts.text + '\n\n\n\
Total paid by '+paymentMethod+': $'+orderDoc.gross;
            }
        }

        emailServer.send(sendEmailOpts, function(err, message) {
            if(err) {
                house.log.err(err);
            } else {
                house.log.debug('thank you email sent!');
            }
        });
    }
    
    var sendDailyDigest = function() {
        var sub = digestSubscribers.pop();
        var sendEmailOpts = {
            from: '<'+house.config.email.user+'>',
            to: sub.email,
            subject: 'Order Summary',
            text: ''
        };
        if(house.config.site.title) {
            sendEmailOpts.subject = house.config.site.title + ' ' + sendEmailOpts.subject;
        }
        var now = new Date();
        now.setDate(now.getDate()-1);
        sendEmailOpts.subject = sendEmailOpts.subject+' for '+now.toDateString();
        getDigestText(function(txt){
            
            sendEmailOpts.text = sendEmailOpts.text + '\n' + txt;
            
            emailServer.send(sendEmailOpts, function(err, message) {
                if(err) {
                    house.log.err(err);
                } else {
                    house.log.debug('email sent!');
                }
                if(digestSubscribers.length > 0) {
                    sendDailyDigest();
                }
            });
        });
    }
    var Email = {
        initDailyDigest: function(){
            // console.log(timeUntilMidnight() + ' until midnight');
            this.setMidnightTimer();
        },
        subscribeToDailyDigest: function(subscriber) {
            digestSubscribers.push(subscriber);
        },
        setMidnightTimer: function() {
            var self = this;
            if(this.midnightTimeout) {
                clearTimeout(this.midnightTimeout);
            }
            this.midnightTimeout = setTimeout(function(){
                sendDailyDigest();  // send the digest
                self.setMidnightTimer();  // reset the timer
            }, timeUntilMidnight() + 10); // timeUntilMidnight()
            
            // test send email on startup
            var testSend = false;
            if(testSend) {
                setTimeout(function(){
                    sendDailyDigest();
                }, 1000);
            }
        },
        sendThankYou: function(orderDoc, userDoc) {
            sendThankYou(orderDoc, userDoc);
        },
        sendReceipt: function(toEmail, orderDoc, userDoc) {
            sendReceipt(toEmail, orderDoc, userDoc);
        }
    }
    
    var timeUntilMidnight = function() {
        var midnight = new Date();
        midnight.setHours( 24 );
        midnight.setMinutes( 0 );
        midnight.setSeconds( 0 );
        midnight.setMilliseconds( 0 );
        return midnight.getTime() - new Date().getTime();
    }
    
    return {
        email: Email
    };
});
