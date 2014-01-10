var requirejs = require('requirejs');
global._ = require('underscore')._;
global.util = require('util');
global.url = require('url');
global.fs = require('fs');
var optimizeUrl = function(url, publicFolder) {

    var isRoot = publicFolder == 'web'; // TODO 
    //var baseUrl = (isRoot) ? '.' : publicFolder+'/../';
    var baseUrl = (isRoot) ? process.cwd() + '/' + publicFolder + '/' : publicFolder + '/../';
    var deps = (isRoot) ? ['/desktop/require.js'] : ['/desktop/require.js'];
    var config = {
        baseUrl: baseUrl, //'apps/html5os/', 
        include: [],
        deps: deps,
        uglify: {
            beautify: false
        },
        generateSourceMaps: false,
        paths: {}
        //, excludeShallow: ['js/config']
    };
    var jses = url.substr(url.indexOf('?')).split('.js');
    if(jses.length > 1) {
        var combinedScript = '';
        for(var i in jses) {
            var jstr = jses[i];
            if(i === jses.length - 1 || jstr === '') {} else {
                //console.log(jstr+' -')
                if(!config.hasOwnProperty('name')) {
                    config.name = jstr.substr(2);

                    if(config.name.indexOf('/') !== -1 && isRoot) {
                        config.name = config.name;
                    } else if(isRoot) {
                        config.name = config.name;
                    }
                } else {
                    jstr = jstr.substr(1);
                    if(jstr.indexOf('/') !== -1 && isRoot) {
                        //jstr = 'apps/html5os/'+jstr;
                    } else if(isRoot) {
                        //jstr = publicFolder+'/'+jstr;
                    }
                    if(jstr.indexOf('/') === -1) {
                        //config.paths[jstr] = process.cwd() + '/web/'+jstr;
                        //config.paths['/'+jstr+'.js'] = process.cwd() + '/web/'+jstr;
                    } else {
                        //config.paths[jstr] = process.cwd() + '/apps/html5os/'+jstr;
                    }
                    //console.log(jstr)
                    config.include.push(jstr);
                }
            }
        }
        var filename = config.name;
        //console.log(config.baseUrl+filename)
        try {
            fs.watch(config.baseUrl + filename + '.js', function(event, filename) {
                //console.log('event is: ' + event);
                if(filename) {
                    //console.log('filename provided: ' + filename);
                } else {
                    //console.log('filename not provided');
                }
                delete js[url];
            });
            for(var i in config.include) {
                var include = config.include[i];
                //console.log(include);
                fs.watch(config.baseUrl + include + '.js', function(event, filename) {
                    //console.log('event is: ' + event);
                    if(filename) {
                        //console.log('filename provided: ' + filename);
                    } else {
                        //console.log('filename not provided');
                    }
                    delete js[url];
                });
            }
        } catch(err) {
            console.log(err);
        }
        config.out = function(data) {
            //console.log('out')
            //console.log(config.deps)
            for(var i in config.include) {
                var include = config.include[i];
                //console.log(include);
                data = data.replace('define("' + include, 'define("/' + include + '.js');
            }
            data = data.replace('define("' + config.name, 'define("/' + config.name + '.js');
            
            process.send({ "optimizedUrl": {url: url, data: data} });
        }
        // console.log(config)
        requirejs.optimize(config, function(buildResponse) {
            // console.log('buildResponse');
            //console.log(buildResponse)
            //buildResponse is just a text output of the modules
            //included. Load the built file for the contents.
            //Use config.out to get the optimized file contents.
        }, function(err) {
            console.log(err);
        });
    }
}


process.on('message', function(m) {
    if(m.hasOwnProperty('optimizeUrl')) {
        optimizeUrl(m.optimizeUrl.url, m.optimizeUrl.publicFolder);
    }
});