// # House.Js
// 
// To install house.js just run.
//
// > sudo npm install -g house
//
// **Warning** - You might have fun.
//

global._ = require('underscore')._; // Thanks to great open source

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
        var http = require('http'); // <3 node.js
        
        // Create the HTTP server with our request handler
        house.httpServer = http.createServer(house.frontDoor);
        
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
    
    //
    // ## Filters
    // The requset handler passes the request and response through the filter chain that you define in config
    //
    house.frontDoor = require('./requestHandler.js')(house);
    
    // ## Socket.IO
    //
    // TODO serve up socket.io access to the data source in a common way to the rest api
    //
    house.socketio = null;

    return house;
});
