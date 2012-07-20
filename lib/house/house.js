// # House.Js
// 
// To install house.js just run.
//
// > sudo npm install -g house
//
// **Warning** - You might have fun.
//

global._ = require('underscore')._; // Thanks to great open source
global.util = require('util');
global.url = require('url');
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
    
    var http = require('http'); // <3 node.js
    
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
        
        // Listen on the port specified via config
        house.httpServer.listen(house.config.webPort);
        console.log('Server running at http://127.0.0.1:'+house.config.webPort+'/');
        
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
    
        // Create the HTTP server with our request handler
    house.httpServer = http.createServer(function(){
        house.frontDoor.apply(this, arguments);
    });

    // Socket IO
    house.io = require('socket.io').listen(house.httpServer);
    house.io.sockets.on('connection', function (socket) {
        house.log.debug('socket connection ');
    });
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
