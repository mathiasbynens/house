// # API Enpoints
//
// Configure the API endpoints that you want enabled here
//
(exports = module.exports = function(house){
    var endpoints = [];
    
    // TODO fix this with config
    var mongoDs = house.dataSources.mongo;
    
    var updateEndPointsList = function(endpoints) {
        house.api.endPointsList = [];
        for(var i in endpoints) {
            for(var name in endpoints[i]) {
                house.api.endPointsList.push({name: name, id: name});
            }
        }
    }
    endpoints.push({"echo": require('./echo')(house)});
    
    // A simple endpoint to serve information about applications
    endpoints.push({"apps": require('./apps')(house)});
    
    // File system 
    endpoints.push({"fs": require('./fs')(house, {
        ds: house.dataSources.fileSystem, 
        path: process.cwd()
    })});
    
    // ## Mongo Collections
    //
    // Information about the collections
    //
    endpoints.push({"collections": require('./collections')(house, {ds: mongoDs})});
    
    // Posts Collection
    //
    endpoints.push({"posts": require('./posts')(house, {ds: mongoDs, collection: "posts"})});
    
    // Sessions Collection
    //
    //endpoints.push({"sessions": require('./sessions')({ds: mongoDs, collection: "sessions"})});
    
    // Mongo GridFs
    //endpoints.push({"files": require('./mongoGridFs')({ds: mongoDs})});
    
    // Log collection
    //endpoints.push({"log": require('./log')({ds: mongoDs})});
    
    
    updateEndPointsList(endpoints);
    
    return endpoints;
});

// TODO allow dynamic configuration of endpoints