// # Static File Filter
//
// ## visionmedia/send Static File Delivery
//
// This filter requires a value for the option *publicFolder* to deliver files from
//
exports = module.exports = function(house, options) {
    if (!options) {
        var filter = _.find(house.config.filters, function(f) {
            return (f.hasOwnProperty('static'));
        });
        options = (filter.static && filter.static.hasOwnProperty('send')) ? filter.static.send : {};
    }
    var child = require('child_process');
    var spawn = child.spawn;
    var requirejs = require('requirejs');
    var send = require('send');
    var js = {};
    var handleReq = function(req, res, next) {
        //house.log.debug(req.url);
        var optJs = false;
        if (req.urlRouted) {
            req.url = req.urlRouted;
        }
        if (js.hasOwnProperty(req.url)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(js[req.url]);
            return;
        }

        var compileFromUrl = function(url, callback) {
            
            if(forkedOptimizer) {
                forkedOptimizer.send({"optimizeUrl": {"url": url, "publicFolder": options.publicFolder}});
                return;
            }
            
            var isRoot = options.publicFolder == 'web'; // TODO 
            //var baseUrl = (isRoot) ? '.' : options.publicFolder+'/../';
            var baseUrl = (isRoot) ? process.cwd() + '/' + options.publicFolder + '/' : options.publicFolder + '/../';
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
            if (jses.length > 1) {
                var combinedScript = '';
                for (var i in jses) {
                    var jstr = jses[i];
                    if (i === jses.length - 1 || jstr === '') {} else {
                        //console.log(jstr+' -')
                        if (!config.hasOwnProperty('name')) {
                            config.name = jstr.substr(2);

                            if (config.name.indexOf('/') !== -1 && isRoot) {
                                config.name = config.name;
                            } else if (isRoot) {
                                config.name = config.name;
                            }
                        } else {
                            jstr = jstr.substr(1);
                            if (jstr.indexOf('/') !== -1 && isRoot) {
                                //jstr = 'apps/html5os/'+jstr;
                            } else if (isRoot) {
                                //jstr = options.publicFolder+'/'+jstr;
                            }
                            if (jstr.indexOf('/') === -1) {
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
                        if (filename) {
                            //console.log('filename provided: ' + filename);
                        } else {
                            //console.log('filename not provided');
                        }
                        delete js[url];
                    });
                    for (var i in config.include) {
                        var include = config.include[i];
                        //console.log(include);
                        fs.watch(config.baseUrl + include + '.js', function(event, filename) {
                            //console.log('event is: ' + event);
                            if (filename) {
                                //console.log('filename provided: ' + filename);
                            } else {
                                //console.log('filename not provided');
                            }
                            delete js[url];
                        });
                    }
                } catch (err) {
                    house.log.err(err);
                }
                config.out = function(data) {
                    //console.log('out')
                    //console.log(config.deps)
                    for (var i in config.include) {
                        var include = config.include[i];
                        //console.log(include);
                        data = data.replace('define("' + include, 'define("/' + include + '.js');
                    }
                    data = data.replace('define("' + config.name, 'define("/' + config.name + '.js');
                    js[url] = data;
                    callback(null, data);
                }
                house.log.debug(config)
                requirejs.optimize(config, function(buildResponse) {
                    house.log.debug('buildResponse');
                    //console.log(buildResponse)
                    //buildResponse is just a text output of the modules
                    //included. Load the built file for the contents.
                    //Use config.out to get the optimized file contents.
                }, function(err) {
                    //optimization err callback
                    house.log.err(err);
                    callback(err);
                });
            }
        }

        if (req.url.indexOf('require.js?/') !== -1) {
            if(house.config.env === 'dev') {
                req.urlRouted = req.url.substr(0, req.url.indexOf('require.js'))+'desktop/require.js';
                handleReq(req, res, next);
            } else {
                compileFromUrl(req.url, function(err, data) {
                    if (err) {
                        house.log.err(err);
                    } else {
                        // res.setHeader('Content-Type', 'application/javascript');
                        // res.end(data);
                    }
                });
                req.urlRouted = req.url.substr(0, req.url.indexOf('require.js'))+'desktop/require.js';
                handleReq(req, res, next);
            }
        } else {
            var path = url.parse(req.url).pathname;
            var publicFolder = req.cachedHtml || options.publicFolder;
            send(req, path)
                .root(publicFolder)
                .on('error', function(err) {
                    //house.log.debug('error on '+path);
                    house.log.debug(req.ip + ' ' + req.userAgent + ' ' + (err.status || 500) + ' ' + path);
                    //house.log.debug(err.message);
                    req.url = req.urlOrig;
                    if (options.otherwise && !req.otherwiseTry) {
                        if (req.cachedHtml) {
                            delete req.cachedHtml;
                            req.urlRouted = options.otherwise;
                            req.otherwiseTry = true;
                        } else if (options.cachedHtml) {
                            req.cachedHtml = options.cachedHtml;
                            req.urlRouted = req.url + '.html';
                        } else {
                            req.urlRouted = options.otherwise;
                            req.otherwiseTry = true;
                        }
                        handleReq(req, res, next);
                    } else {
                        if (next) next();
                    }
                })
                .on('directory', function() {
                    house.log.debug('folder');
                })
                .pipe(res);
        }
    };
    
    var forkedOptimizer;
    var forkOptimizer = function() {
        forkedOptimizer = child.fork(__dirname+"/optimizer.js");
        forkedOptimizer.send({"test": {'test': 'test'}});
        forkedOptimizer.on('message', function(m) {
        //   console.log('got message from fork');
          if(m.hasOwnProperty('optimizedUrl')) {
            js[m.optimizedUrl.url] = m.optimizedUrl.data;
          }
        });
    }();
    
    return handleReq;
};
