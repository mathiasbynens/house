var assert = require("assert");

describe("test mocha", function() {
    it("assert equal", function() {
        var a = true;
        assert.equal(true, a);
    });
});

var bootup = function(callback) {
    describe("require house.js", function() {
        it("should load", function() {
            var housejs = require("../index.js");
            var config = require("./config/config.js").config;
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

bootup(function(house) {
    describe("house instance started", function() {
        it("should be here", function(done) {
            done();
            describe("check config exists", function() {
                it("should have a webPort", function() {
                    assert.equal(house.config.webPort, "8888");
                });
            });
        });
    });
});