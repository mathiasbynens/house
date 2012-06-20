// # House.Js
// 
// To install house.js just run.
//
// > sudo npm install -g house
//
// **Warning** - You might have fun.
//

global._ = require('underscore')._;

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
        
        var isSecure = false;
        
        //
        // ## Request Handler
        //
        house.frontDoor = require('./requestHandler.js')(house);
        
        // Create the HTTP server with our request handler
        house.httpServer = http.createServer(house.frontDoor);
        
        // Listen on the port specified via config
        if(isSecure) {
        } else {
          house.httpServer.listen(house.config.webPort);
          console.log('Server running at http://127.0.0.1:'+house.config.webPort+'/');
        }
        
        if(cb) cb();
    }
    
    // ## Utilities
    //
    //
    //
    house.utils = {
    };
    
    
    //
    // ## Logger
    //
    // The logger is available via the global *log*
    module.exports.log = house.log = require('./log.js')(this.config);
    module.exports.log.info('logger loaded');

    // ## Data Source
    //
    // Connection to the data
    //
    house.ds = null;

    // ## Collections
    //
    // Data type logic. Ex, posts, files, urls, etc.
    //
    house.collections = null;
    
    // ## Socket.IO
    //
    // TODO serve up socket.io access to the data source in a common way to the rest api
    //
    house.socketio = null;

    return house;
});
