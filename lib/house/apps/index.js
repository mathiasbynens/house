//
// # Apps
//
// 
//
//
(exports = module.exports = function(house, path){
    var fs = require('fs');
    var apps = {
    };
    house.appsList = [];
    // load apps from each folder in the path
    // apps should load themselves including their config
    // with the ability to add a static delivery path using house.addStaticPath
    
    var loadPath = function(path) {
        // list path and require each folder
        fs.readdir(path, function(err, files){
            if(err) {
                house.log.err(err);
            } else if(files) {
                for(var i in files) {
                    apps[files[i]] = require(path+'/'+files[i])(house);
                }
                var appFavIcon = 'favicon.ico';
                var appIosIcon = 'iosicon.png';
                for(var j in apps[files[i]].config.routes) {
                    for(var k in apps[files[i]].config.routes[j]) {
                        house.appsList.push({
                            "id": k,
                            "name": k,
                            "url": '/'+k+'/',
                            "favicon": appFavIcon,
                            "iosicon": appIosIcon
                        });
                    }
                }
                //house.apps = apps;
                //updateAppsList(apps);
            }
        });
    }
    
    var updateAppsList = function() {
        var appsList = [];
        for(var app in house.apps) {
            if(house.apps.hasOwnProperty(app)) {
                var appUrl = '/';
                if(house.apps[app].config.hasOwnProperty('favicon')) {
                    appFavIcon = house.apps[app].config.favicon;
                }
                if(house.apps[app].config.hasOwnProperty('iosicon')) {
                    appIosIcon = house.apps[app].config.iosicon;
                }
                for(var i in house.apps[app].config.routes) {
                    for(var routePath in house.apps[app].config.routes[i]) {
                        appUrl = '/'+routePath+'/';
                        break;
                    }
                }
                appsList.push({
                    "id": app,
                    "name": app,
                    "url": appUrl,
                    "favicon": appFavIcon,
                    "iosicon": appIosIcon
                }); //house.apps[app];
                house.apps[app].url = appUrl;
            }
        }
        house.appsList = appsList;
    }
    
    loadPath(path);
    
    return apps;
});