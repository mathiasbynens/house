//
// # Data Sources
//
// *config.dataSources* should contain objects in the format
//
// > { dataSourceName: { dataSourceType: dataSourceOptions } }
//
(exports = module.exports = function(house){
    var dataSources = {};
    
    var config = house.config;
    var configDs = config.dataSources;
    
    var DataSource = require('./dataSource.js')(house);
    
    for(var dataSourceName in configDs) {
        var ds = new DataSource(configDs[dataSourceName], house);
        dataSources[dataSourceName] = ds;
    }
    
    return dataSources;
});