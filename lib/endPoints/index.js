// # API Enpoints
//
// Configure the API endpoints that you want enabled here
//
(exports = module.exports = function(house){
    
    var subs = 'subs';
    var news = 'news';
    var articles = 'articles';
    
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
    house.api.updateEndPointsList = function(array) {
        if(!array) {
            console.log('no endpoints to update with =[');
        } else {
            house.api.endPointsList = [];
            for(var i in array) {
                for(var name in array[i]) {
                    house.api.endPointsList.push({name: name, id: name});
                }
            }
        }
    }
    
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
    if(house.config.hasOwnProperty('facebook')) {
        authConfig.facebook = house.config.facebook;
    }
    if(house.config.hasOwnProperty('google')) {
        authConfig.google = house.config.google;
    }
    endpoints.push({"sessions": require('./sessions')(house, {ds: mongoDs, collection: "sessions"})});
    endpoints.push({"actions": require('./actions')(house, {ds: mongoDs, collection: "actions"})});
    endpoints.push({"auth": require('./auth')(house, authConfig)});
    
    // Users
    endpoints.push({"users": require('./users')(house, {
        ds: mongoDs,
        collection: authConfig.collection
    })});
    
    // A simple endpoint to serve information about applications
    endpoints.push({"apps": require('./apps')(house)});
    
    // File system
    endpoints.push({"fs": require('./fs')(house, {
        ds: house.dataSources.fileSystem
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
    endpoints.push({"pages": require('./pages')(house, {ds: mongoDs, collection: "pages"})});
    
    // Email
    var msgsConfig = {ds: mongoDs, collection: "msgs"};
    if(house.config.hasOwnProperty('email')) {
        msgsConfig.email = house.config.email;
    }
    endpoints.push({"msgs": require('./msgs')(house, msgsConfig)});
    
    // Mongo GridFs
    //
    var filesCol = "files";
    if(mongoDs.options && mongoDs.options.filesCol) {
        filesCol = mongoDs.options.filesCol;
    }
    endpoints.push({"files": require('./files')(house, {ds: mongoDs, collection: filesCol})});
    endpoints.push({"images": require('./images')(house, {ds: mongoDs, collection: "images"})});
    endpoints.push({"wallpaper": require('./wallpaper')(house, {ds: mongoDs, collection: "wallpaper"})});
    endpoints.push({news: require('./'+news)(house, {ds: mongoDs, collection: news})});
    endpoints.push({articles: require('./'+articles)(house, {ds: mongoDs, collection: articles})});
    endpoints.push({"urls": require('./urls')(house, {ds: mongoDs, collection: "urls"})});
    endpoints.push({subs: require('./'+subs)(house, {ds: mongoDs, collection: subs})});

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
    endpoints.push({"reviews": require('./reviews')(house, {ds: mongoDs, collection: "reviews"})});
    
    endpoints.push({"comments": require('./comments')(house, {ds: mongoDs, collection: "comments"})});
    endpoints.push({"tags": require('./tags')(house, {ds: mongoDs, collection: "tags"})});
   
   // Offer default app exlusions 
    if(house.config.excludeApps) {
        for(var i in house.config.excludeApps) {
            var excludedApp = house.config.excludeApps[i];
            for(var e in endpoints) {
                for(var k in endpoints[e]) {
                    if(k == excludedApp) {
                        delete endpoints[e][k];
                    }
                }
            }
        }
    }
   
    house.api.updateEndPointsList(endpoints);
    
    return endpoints;
});

// TODO allow dynamic configuration of endpoints
