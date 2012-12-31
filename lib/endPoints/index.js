// # API Enpoints
//
// Configure the API endpoints that you want enabled here
//
(exports = module.exports = function(house){
    var endpoints = [];
    
    // TODO fix this with config
    var mongoDs = house.dataSources.mongo;
    house.api.getEndPointFromList = function(name) {
        for(var i in house.api.endPointsList) {
            if(house.api.endPointsList[i].hasOwnProperty('name') && house.api.endPointsList[i]['name'] == name) {
                return house.api.endPointsList[i];
            }
        }
    }
    house.api.getEndPointByName = function(name) {
        for(var i in endpoints) {
            for(var n in endpoints[i]) {
                if(n == name) {
                    return endpoints[i][n];
                }
            }
        }
    }
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
    var authConfig = {
        ds: mongoDs,
        collection: 'users'
    }
    if(house.config.hasOwnProperty('twitter')) {
        authConfig.twitter = {
            key: house.config.twitter.key,
            secret: house.config.twitter.secret,
            urls: {
                callback: house.config.twitter.callback,
                requestToken: "https://api.twitter.com/oauth/request_token",
                accessToken: "https://api.twitter.com/oauth/access_token",
                authorize: "https://api.twitter.com/oauth/authorize",
                endPoint: house.config.twitter.endPoint
            }
        }
    }
    endpoints.push({"sessions": require('./sessions')(house, {ds: mongoDs, collection: "sessions"})});
    endpoints.push({"actions": require('./actions')(house, {ds: mongoDs, collection: "actions"})});
    endpoints.push({"auth": require('./auth')(house, authConfig)});
    
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

    // Feed
    //
    endpoints.push({"feed": require('./feed')(house, {ds: mongoDs, collection: "feed"})});
    
    // Posts Collection
    //
    endpoints.push({"posts": require('./posts')(house, {ds: mongoDs, collection: "posts"})});
    
    // Mongo GridFs
    //
    endpoints.push({"files": require('./files')(house, {ds: mongoDs, collection: "files"})});
    
    endpoints.push({"images": require('./images')(house, {ds: mongoDs, collection: "images"})});
    endpoints.push({"wallpaper": require('./wallpaper')(house, {ds: mongoDs, collection: "wallpaper"})});
    endpoints.push({"urls": require('./urls')(house, {ds: mongoDs, collection: "urls"})});

    // Chat!
    //
    endpoints.push({"io": require('./io')(house, {
        ds: mongoDs
    })});
    
    // Log collection
    //endpoints.push({"log": require('./log')({ds: mongoDs})});
    
    // TODOs
    //
    endpoints.push({"todos": require('./todos')(house, {ds: mongoDs, collection: "todos"})});
    endpoints.push({"todoLists": require('./todoLists')(house, {ds: mongoDs, collection: "todoLists"})});
 
    endpoints.push({"checkins": require('./checkins')(house, {ds: mongoDs, collection: "checkins"})});
   
    updateEndPointsList(endpoints);
    
    return endpoints;
});

// TODO allow dynamic configuration of endpoints
