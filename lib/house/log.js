//
// # Logger
//
// This module should provice a simple logger interface
// and expose events to extend log handling
//
(exports = module.exports = function(config){
var util = require('util');
var log = {};

log.levels = {
  'system': -1
, 'emergency': 0
, 'alert': 1
, 'critical': 2
, 'error': 3
, 'warning': 4
, 'notice': 5
, 'info': 6
, 'debug': 7
, 'client': 8
}

//
// ## Usage
//
// You can insert a message to the log at any of the levels like
//
// > log.critical('something happened');
//
// > log.debug(myVar);
//

for(var name in log.levels) {
    (function(name) {
    log[name] = function(msg) {
        log.insert(msg, log.levels[name]);
    }
    })(name);
}

// Some have a short hand
log.dev = function(msg) {
    log.debug(msg);
}
log.err = function(msg) {
	log.error(msg);
}
log.warn = function(msg) {
	log.warning(msg);
}
log.crit = function(msg) {
    log.critical(msg);
}
log.sys = function(msg) {
    log.system(msg);
}

var env = config.env || 'dev';
log.insert = function(msg, level, code) {
    
    //
    // Don't log debug level and higher in production
    //
    //  TODO make this more configurable with *config.log.level* or something
    if(env === 'prod') {
        if(level > 6) {
            return;
        }
    }


    /*
     *  For Errors, lets see if it was the error object itself and try printing it nicely somehow.
     */
    if (typeof msg === 'object' && level == log.levels["error"]) {
      var new_msg = '';
      if (msg.hasOwnProperty('message')) {
          if (msg.hasOwnProperty('stack')) {
            new_msg += msg.stack;
          } else {
            new_msg += msg.message;
          }
      } else {
          new_msg = JSON.stringify(msg, null, 4);
      }
      msg = new_msg;
      
    } else if(typeof msg === 'object') {
        
        /*
         *  Try to output objects in a readable format
         */
        
        msg = util.inspect(msg, false, 5);
    }

    if(level == null) {
    	level = 6;
    }
    
    //
    // Quick and dirty output for now
    //
    if(code) {
        msg = msg+' '+code;
    }
    
    msg = new Date().toString()+' - '+level+' - '+msg;

    if(console.warn && level == log.levels["warning"]) {
        console.warn(msg);
    } else if(console.err && level == log.levels["error"]) {
        console.error(msg);
    } else {
        console.log(msg);
    }
    
    // TODO trigger events log.insert and log.$level with our msg
}

//
// Grab any uncaught exceptions
//
process.on('uncaughtException', function (err) {
    log.err('uncaughtException:');
    log.err(err);
});

return log;
});