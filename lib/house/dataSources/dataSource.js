//
// # Data Source
//
// 

(exports = module.exports = function(){
    var ds = function(config) {
        var dataSource;
        for(var dataSourceType in config) {
            dataSource = require('./'+dataSourceType)(config[dataSourceType]);
        }
        return dataSource;
    };
    return ds;
});