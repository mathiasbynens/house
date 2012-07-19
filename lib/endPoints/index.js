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
    
    // Authentication 
    endpoints.push({"auth": require('./auth')(house, {
        ds: mongoDs,
        collection: 'users',
        twitter: {
            key: "ITfhDNl1L06YJuwzLbHzgg",
            secret: "hYcohRI4cSkp0Aax1smYESUR8kWYmyZagfuIXoMXx0",
            urls: {
                callback: "https://www.jeffshouse.com/jeffshouse/auth/twitter",
                requestToken: "https://api.twitter.com/oauth/request_token",
                accessToken: "https://api.twitter.com/oauth/access_token",
                authorize: "https://api.twitter.com/oauth/authorize"
            }
        },
        facebook: {
            
        }
    })});
    
    // Users
    endpoints.push({"users": require('./users')(house, {
        ds: mongoDs,
        collection: 'users'
    })});
    
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
    //
    endpoints.push({"files": require('./files')(house, {ds: mongoDs, collection: "f"})});
    
    // Log collection
    //endpoints.push({"log": require('./log')({ds: mongoDs})});
    
    
    updateEndPointsList(endpoints);
    
    return endpoints;
});

// TODO allow dynamic configuration of endpoints