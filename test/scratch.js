var assert = require("assert");
var querystring = require('querystring');

describe("test mocha", function() {
    it("assert equal", function() {
        var a = true;
        assert.equal(true, a);
    });
});
var config = require("./config/config.js").config;

var bootup = function(callback) {
    describe("require house.js", function() {
        it("should load", function() {
            var housejs = require("../index.js");
            describe("check config exists", function() {
                it("should have a webPort", function() {
                    assert.equal(config.hasOwnProperty("webPort"), true);
                });
            });
            var testHouse = new housejs(config);
            describe("housejs", function() {
                it("should start", function(started) {
                    testHouse.start(function() {
                        started();
                        if (callback) callback(testHouse);
                    });
                });
            });
        });
    });
};

var basicHttpTests = function(callback) {
    var http = require('http');
    describe("house http api echo", function() {
        it("should respond 200", function(echoed) {
            var options = {
              host: 'localhost',
              port: config.webPort,
              path: '/api'
            };
            http.get(options, function(res) {
              //console.log("Got response: " + res.statusCode);
              assert.equal(res.statusCode, 200);
              echoed();
            }).on('error', function(e) {
              console.log("Got error: " + e.message);
              echoed(e);
            });
        });
    });
    
    describe("house http api 404", function() {
        it("should 404", function(done) {
            var options = {
              host: 'localhost',
              port: config.webPort,
              path: '/404'
            };
            
            http.get(options, function(res) {
              //console.log("Got response: " + res.statusCode);
              assert.equal(res.statusCode, 404);
              done();
            }).on('error', function(e) {
              console.log("Got error: " + e.message);
              done(e);
            });
        });
    });
    
    describe("house http api post echo", function() {
        it("should echo back", function(done) {
            var o = {
                "test": "msg"
                , "test2": "msg2"
            };
            var data = querystring.stringify(o);
            var dataJson = JSON.stringify(o);
            
            var options = {
              host: 'localhost',
              port: config.webPort,
              path: '/api/echo',
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Content-Length': data.length
              }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                //console.log("Got response: " + res.statusCode);
              res.on('data', function (chunk) {
                //console.log('BODY: ' + chunk);
                assert.equal(chunk, dataJson);
                done();
                callback();
              });
            }).on('error', function(e) {
              console.log("Got error: " + e.message);
              done(e);
            });
            req.write(data);
            req.end();
        });
    });
}

var apiFsTests = function(callback) {
    var http = require('http');
    describe("house rest api fs", function() {
        it("should respond 200", function(done) {
            var options = {
              host: 'localhost',
              port: config.webPort,
              path: '/api/fs'
            };
            http.get(options, function(res) {
                
                res.on('data', function (chunk) {
                  console.log('BODY: ' + chunk);
                  describe("house rest api fs", function() {
                    it("should respond data", function(done) {
                      //assert.equal(chunk, dataJson);
                      done();
                    });
                  });
                });
                
              console.log("Got response from /api/fs/: " + res.statusCode);
              assert.equal(res.statusCode, 200);
              done();
            }).on('error', function(e) {
              console.log("Got error: " + e.message);
              done(e);
            });
        });
    });
    
    describe("house rest api fs", function() {
        it("should respond 200", function(done) {
            var options = {
              host: 'localhost',
              port: config.webPort,
              path: '/api/fs/package.json'
            };
            http.get(options, function(res) {
                
                res.on('data', function (chunk) {
                  console.log('BODY: ' + chunk);
                  describe("house rest api fs", function() {
                    it("should respond data", function(done) {
                      //assert.equal(chunk, dataJson);
                      done();
                    });
                  });
                });
                
              console.log("Got response from /api/fs/: " + res.statusCode);
              assert.equal(res.statusCode, 200);
              done();
            }).on('error', function(e) {
              console.log("Got error: " + e.message);
              done(e);
            });
        });
    });
    callback();
    return;
    
    
    describe("house rest api put fs", function() {
        it("should respond back", function(done) {
            var o = {
                "test": "msg"
                , "test2": "msg2"
            };
            var data = querystring.stringify(o);
            var dataJson = JSON.stringify(o);
            
            var options = {
              host: 'localhost',
              port: config.webPort,
              path: '/api/fs',
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Content-Length': data.length
              }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                //console.log("Got response: " + res.statusCode);
              res.on('data', function (chunk) {
                //console.log('BODY: ' + chunk);
                assert.equal(chunk, dataJson);
                done();
              });
            }).on('error', function(e) {
              console.log("Got error: " + e.message);
              done(e);
            });
            req.write(data);
            req.end();
        });
    });
}

bootup(function(house) {
    describe("house instance started", function() {
        it("should be here", function(done) {
            done();
            describe("check config exists", function() {
                it("should have a webPort", function() {
                    assert.equal(house.config.webPort, "8888");
                    
                    basicHttpTests(function(){
                        apiFsTests(function(){
                        });
                    });
                });
            });
        });
    });
});