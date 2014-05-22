//
// # Payment Proxy Adapter
//
(exports = module.exports = function(house, options){
    var self = this;
    this.paymentProcessor = {}; // proxy class that interfaces basic payment functions
    
    if(house.config.stripe) {
        this.paymentProcessor = require('./stripe')(house, options);
    }
    
    return this.paymentProcessor;
});
