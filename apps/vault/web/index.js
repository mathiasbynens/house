//
// Vault
//
//
//
//
(function(){

    var vault = {};
    
    vault.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                require(['backbone-house.js'], function(){
                    require(['vault.js'], function(apps) {
                        if(callback) callback(apps);
                    });
                });
            });
        });
    }
    
    if(define) {
        define(function () {
            return vault;
        });
    }
})();