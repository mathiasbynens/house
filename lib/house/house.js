// # House.Js
// 
// To install house.js just run.
//
// > sudo npm install -g house
//
// **Warning** - You might have fun.
//

global.http = require('http');
global.https = require('https');
global._ = require('underscore')._;
global.util = require('util');
global.url = require('url');
global.fs = require('fs');
global.querystring = require('querystring');

(exports = module.exports = function(config){
    var house = this;
    global.house = house;
    // ## Configuration
    //
    //  Start a project in a new folder by running
    //
    // > house --init
    //
    //  Modify the file at config/config.js similar to
    //
    // > module.exports.config = { 
    // >  env: "dev", webPort: 8000, customOption: 'example'
    // >  , filters: []
    // > }
    //
    //
    
    house.setConfig = function(config) {
        this.config = config;
    }
    
    if(config) {
        this.setConfig(config);
    }
    
    if(house.config.ssl) {
        console.log('config includes ssl');
        var sslKey = fs.readFileSync(house.config.ssl.key).toString();
        var sslCert = fs.readFileSync(house.config.ssl.crt).toString();
        var sslCa = fs.readFileSync(house.config.ssl.ca).toString();
    }
    
    var serverRequestHandler = function(req, res, next, secure) {
        if(req.hasOwnProperty('headers') && req.headers.hasOwnProperty('host')) {
            if((house.config.requireWww && req.headers.host.indexOf('www') !== 0) || house.config.requireSsl) {
                var secure_port = house.config.webPortSecure || 443;
                var h = req.headers.host;
                var i = h.indexOf(':');
                if(i !== -1) {
                    h = h.substr(0, i);
                }
                var p = (secure_port === 443) ? '' : ':'+secure_port;
                var proto = 'http';
                if(house.config.requireSsl) {
                    proto = 'https';
                }
                house.utils.response.redirect(res, proto+'://www.'+h+p+req.url);
                return;
            }
        }
        house.frontDoor.apply(this, arguments);
    }
    
    //
    // ## Running House
    //
    // From your project folder run 
    //
    // > house --start
    //
    house.start = function(cb) {
        if(!this.config) {
            throw new Error("Config required!");
        }
        
        if(house.config.ssl) {
            // Listen on the port specified via config
            var secure_port = house.config.webPortSecure || 443;
            house.httpsServer.listen(secure_port);
            console.log('Secure Server running at https://127.0.0.1:'+secure_port+'/');
            house.httpServer.listen(house.config.webPort);
            console.log('Server running at http://127.0.0.1:'+house.config.webPort+'/');
        } else {
            // Listen on the port specified via config
            house.httpServer.listen(house.config.webPort);
            console.log('Server running at http://127.0.0.1:'+house.config.webPort+'/');
        }
        if(cb) cb();
    }
    
    house.useApps = function(path) {
        var apps = require('./apps')(this, path);
    }
    
    //
    // ## Utilities
    //
    //
    house.utils = require('./utils');
    
    //
    // ## Logger
    //
    // The logger is available via the global *log*
    //
    module.exports.log = house.log = require('./log.js')(house.config);
    module.exports.log.info('logger loaded');

    //
    // ## Data Source
    //
    // Connection to the data sources and services
    //
    house.dataSources = require('./dataSources')(house);
    
    var socketOpts = {};
    
    // Create the HTTP server with our request handler
    house.httpServer = http.createServer(serverRequestHandler);
    if(house.config.ssl) {
        house.httpsServer = https.createServer({key: sslKey, cert: sslCert}, serverRequestHandler);
        socketOpts = {key:sslKey,cert:sslCert,ca:sslCa};
    }

    // Socket IO
    var socketio = require('socket.io');
    if(house.config.requireSsl) {
        house.io = socketio.listen(house.httpsServer, socketOpts);
        house.io.sockets.on('connection', function (socket) {
            house.log.debug('secure socket connection ');
        });
    } else {
        var listenTo = house.config.socketPort || house.httpServer;
        house.io = socketio.listen(listenTo, socketOpts);
        /*house.io.sockets.on('connection', function (socket) {
            house.log.debug('socket connection ');
        });*/
    }
    house.io.configure(function(){
        house.io.set('log level', 10);
        //house.log.debug('socket io '+socketio.version);
        //house.io.set('transports', ['websocket', 'xhr-polling', 'flashsocket']);
    });
    //
    // ## Filters
    //
    // The requset handler passes the request and response through the filter chain that you define in config
    //
    house.frontDoor = require('./requestHandler.js')(house);
    
    return house;
});
