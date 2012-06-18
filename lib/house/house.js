// # House.Js
// 
// To install house.js just run.
//
// > sudo npm install -g house
//
// **Warning** - You might have fun.
//

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
    // >  env: "dev", webPort: 8000, webPath: 'web', apiPrefix: 'api'
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
        
        // Reference to our http server
        house.httpServer = http.createServer(house.frontDoor);
        
        // Listen on the port specified in the config
        if(isSecure) {
        } else {
          house.httpServer.listen(house.config.webPort);
          console.log('Server running at http://127.0.0.1:'+house.config.webPort+'/');
        }
        
        // Define our request filters
        house.requestFilters = [
            house.form,
            house.session,
            house.router,
            house.backDoor
        ];
        
        if(cb) cb();
    }
    
    // ### Welcome HTTP Request! 
    //
    // Our request handler simply passes the request through our filters
    //
    house.frontDoor = function(req, res) {
        var x = 0;
        var getNextFilter = function(){ var f = house.requestFilters[x]; x++; return f; }
        var nextFilter = function() {
            if(house.requestFilters.length > x) {
                var nextFilterFn = getNextFilter();
                if(nextFilterFn) {
                    nextFilterFn(req, res, nextFilter);
                }
            }
        };
        nextFilter();
    };
    
    // ### Just in case you end up somewhere you shouldn't be, we kick you out the back.
    //
    house.backDoor = function(req, res, next) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end("Error 404: File not found");
    };
    
    // ## Routing
    house.router = function(req, res, next){
        
        // 
        //  Route the requst to our API, or static files.
        //
        if(req.url.indexOf(house.config.apiPrefix) === 1) {
            house.rest(req, res, next);
        } else {
            house.paper(req, res, next); // our static web folder
        }
    };
    
    // ## Utilities
    //
    //
    house.utils = {
    };
    
    // ## Logger
    house.log = null;
    
    // ## Request Sessions
    //
    // Parse the request for a returning visitor, user, or first time guest!
    //
    house.session = function(req, res, next){
        // TODO 
        next();
    };
    
    // ## Request Form Parse
    //
    // Parse the requset for encoded data. Beep beep.
    //
    house.form = function(req, res, next){
        // TODO use formidable
        next();
    };

    var paperboy = require('paperboy');
    
    // ## Static Files
    //
    //  Anything url that doesn't begin with the *apiPrefix* will attempt to be served from the *webRoot* you specify in the config.
    //
    house.paper = function(req, res, next){
        paperboy
            .deliver(house.config.webRoot, req, res)
            .addHeader('Expires', 300)
            .addHeader('X-House', 'Node')
            .before(function() {
            })
            .after(function(statCode) {
            })
            .error(function(statCode, msg) {
              res.writeHead(statCode, {'Content-Type': 'text/plain'});
              res.end("Error " + statCode);
            })
            .otherwise(function(err) {
              if(next) next();
            });
    };

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
    
    // ## API Server
    //
    // URLs beginning with config.apiPrefix will be served from the rest API.
    //
    house.rest = function(req, res, next){
        res.end('RESTful api');
    };
    
    // ## Socket.IO
    //
    // TODO serve up socket.io access to the data source in a common way to the rest api
    //
    house.socketio = null;

    return house;
});
