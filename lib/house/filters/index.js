// # Filters
//
// ## Setup Filters via Config
//
//
//
(exports = module.exports = function(config){
    var filters = [];
    
    // Define the filters and strategies you want to use via config array *filters*
    // 
    // Filters have the following structure
    //
    // > { filterType:
    // >   { filterTypeStrategy: filterOptions } }
    //
    // If a filterTypeStrategy is not included, the default will be used for that filterType
    //
    // Filters are structured as lib/house/filters/[filteType]/[filterTypeStrategy]/index.js
    // with the default strategy for a filterType at lib/house/filters/[filterType]/index.js
    //
    for(var f in config.filters) {
        var filterAtF = config.filters[f];
        for(var filterType in filterAtF) {
            var filterTypeName = '';
            var filterTypeOptions = {};
            for(var filterName in filterAtF[filterType]) {
                filterTypeName = '/'+filterName;
                filterTypeOptions = filterAtF[filterType][filterName];
            }
            var reqPath = './'+filterType+filterTypeName;
            var filter = require(reqPath)(filterTypeOptions);
            
            filters.push(filter);
        }
    }
    
    return filters;
});