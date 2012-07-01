//
// # Apps
//
// 
//
//
(exports = module.exports = function(house){
    var fs = require('fs');
    var apps = {
    };
    
    // load apps from each folder in the path
    // apps should load themselves including their config
    // with the ability to add a static delivery path using house.addStaticPath
    
    apps.loadPath = function(path) {
        // list path and require each folder
        fs.readdir(path, function(err, files){
            if(err) {
                house.log.err(err);
            } else if(files) {
                for(var i in files) {
                    console.log(path+'/'+files[i])
                    apps[files[i]] = require(path+'/'+files[i])(house);
                }
            }
        });
    }
    return apps;
});