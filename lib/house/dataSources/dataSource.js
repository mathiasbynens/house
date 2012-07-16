//
// # Data Source
//
// 

(exports = module.exports = function(house){
    var ds = function(config) {
        var dataSource;
        for(var dataSourceType in config) {
            dataSource = require('./'+dataSourceType)(config[dataSourceType], house);
        }
        return dataSource;
    };
    return ds;
});