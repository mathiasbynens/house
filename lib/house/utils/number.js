(function(){
    var number = module.exports = {};
    
    number.pad = function(n){
        return n > 9 ? ''+n : '0'+n;
    }
})();