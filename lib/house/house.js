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
        
        if(house.config.requireSsl) {
            // Listen on the port specified via config
            var sport = house.config.webPortSecure || 443;
            house.httpsServer.listen(sport);
            
            http.createServer(function(req, res){
                var h = req.headers.host;
                var i = h.indexOf(':');
                if(i !== -1) {
                    h = h.substr(0, i);
                }
                var p = (sport === 443) ? '' : ':'+sport;
                house.utils.response.redirect(res, 'https://'+h+p+req.url);
            }).listen(house.config.webPort);
            
            console.log('Server running at https://127.0.0.1:'+sport+'/');
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
    house.httpServer = http.createServer(function(){
        house.frontDoor.apply(this, arguments);
    });
    if(house.config.ssl) {
        house.httpsServer = https.createServer({key: sslKey, cert: sslCert}, function(){
            house.frontDoor.apply(this, arguments);
        });
        socketOpts = {key:sslKey,cert:sslCert,ca:sslCa};
    }

    // Socket IO
    if(house.config.requireSsl) {
        house.io = require('socket.io').listen(house.httpsServer, socketOpts);
        house.io.sockets.on('connection', function (socket) {
            house.log.debug('secure socket connection ');
        });
    } else {
        var listenTo = house.config.socketPort || house.httpServer;
        house.io = require('socket.io').listen(listenTo, socketOpts);
        house.io.sockets.on('connection', function (socket) {
            house.log.debug('socket connection ');
        });
    }
    house.io.configure(function(){
        house.io.set('log level', 1);
    });
    //
    // ## Filters
    //
    // The requset handler passes the request and response through the filter chain that you define in config
    //
    house.frontDoor = require('./requestHandler.js')(house);
    
    return house;
});
