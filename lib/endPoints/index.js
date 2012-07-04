// # API Enpoints
//
// Configure the API endpoints that you want enabled here
//
(exports = module.exports = function(house){
    var endpoints = [];
    
    // TODO fix this with config
    var mongoDs = house.dataSources.testMongo;
    
    
    
    endpoints.push({"echo": require('./echo')(house)});
    
    // A simple endpoint to serve information about applications
    endpoints.push({"apps": require('./apps')(house)});
    
    endpoints.push({"fs": require('./fs')(house, {
        ds: house.dataSources.fileSystem, 
        path: process.cwd()
    })});
    //endpoints.push({"collections": require('./mongoCollections')({ds: mongoDs})});
    //endpoints.push({"log": require('./mongoLog')({ds: mongoDs})});
    //endpoints.push({"files": require('./mongoGridFs')({ds: mongoDs})});
    //endpoints.push({"sessions": require('./mongoGridFs')({ds: mongoDs})});
    
    return endpoints;
});

// TODO allow dynamic configuration of endpoints