// # Static File Filter
//
// ## visionmedia/send Static File Delivery
//
// This filter requires a value for the option *publicFolder* to deliver files from
//
exports = module.exports = function(house, options) {
    if(!options) {
        var filter = _.find(house.config.filters, function(f) {
            return(f.hasOwnProperty('static'));
        });
        options = (filter.static && filter.static.hasOwnProperty('send')) ? filter.static.send : {};
    }
    var child = require('child_process');
    var spawn = child.spawn;
    var requirejs = require('requirejs');
    var less = require('less');
    var send = require('send');
    if(!house.jsCache) {
        house.jsCache = {};
    }
    if(!house.cssCache) {
        house.cssCache = {};
        house.cssCacheWatch = {};
    }
    var handleReq = function(req, res, next) {
        //house.log.debug(req.url);
        var optJs = false;
        if(req.urlRouted) {
            req.url = req.urlRouted;
        }
        var compileFromUrl = function(url, callback) {
            if(house.forkedOptimizer) {
                try {
                    house.forkedOptimizer.send({
                        "optimizeUrl": {
                            "url": url,
                            "publicFolder": options.publicFolder
                        }
                    });
                } catch(e) {
                    if(e.message.indexOf('channel closed') !== -1) {
                        // restart process
                        house.log.info('channel closed with forked optimizer.js.. restarting');
                        forkOptimizer();
                    }
                }
                return;
            }
            house.log.info('no forked optimizer for compileUrl');

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
                                //jstr = options.publicFolder+'/'+jstr;
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
                        delete house.jsCache[url];
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
                            delete house.jsCache[url];
                        });
                    }
                } catch(err) {
                    house.log.err(err);
                }
                config.out = function(data) {
                    console.log('out')
                    //console.log(config.deps)
                    for(var i in config.include) {
                        var include = config.include[i];
                        //console.log(include);
                        data = data.replace('define("' + include, 'define("/' + include + '.js');
                    }
                    data = data.replace('define("' + config.name, 'define("/' + config.name + '.js');
                    house.jsCache[url] = data;
                    callback(null, data);
                }
                house.log.info(config)
                requirejs.optimize(config, function(buildResponse) {
                    house.log.info('buildResponse');
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
        var lessCssStr = '.less.css';
        var getFileData = function(filePath, callback) {
            console.log(filePath);
            fs.readFile(filePath, function(err, data) {
                if(err) {
                    house.log.debug('error with fs.readFile: ' + filePath);
                    if(callback) {
                        callback(err);
                    }
                } else if(data) {
                    var dataStr = data.toString();
                    callback(null, dataStr);
                }
            });
        }
        
        var isRoot = options.publicFolder == 'web'; // TODO 
        var baseUrl = (isRoot) ? process.cwd() + '/' + options.publicFolder + '' : options.publicFolder + '';
        house.log.debug(options.publicFolder);
        house.log.debug(baseUrl);
        
        var getLessFromString = function(lessString, filename, callback) {
            var lessOpts = {}
            if(house.config.env === 'dev') {
                // lessOpts.inline = true;
                lessOpts.sourceMap = filename;
                lessOpts.filename = filename;
            }

            var parentFolder = filename.substr(0, filename.indexOf(lessCssStr));
            var parentFolderI = parentFolder.lastIndexOf('/');
            parentFolder = baseUrl+parentFolder.substr(0, parentFolderI);
            lessOpts.paths = [parentFolder]; // Specify search paths for @import directives
            // dataStr = dataStr + '\n\n@body-bg: red;';
            var parser = new(less.Parser)(lessOpts);
                parser.parse(lessString, function(e, tree) {
                    if(e) {
                        house.log.err(e);
                        if(callback) {
                            callback(e);
                        }
                    } else {
                        var toCssOpts = {};
                        if(house.config.env === 'prod') {
                            toCssOpts.compress = true; // Minify CSS output
                        }
                        try {
                            var css = tree.toCSS(toCssOpts);
                            if(house.config.env !== 'dev') {
                                house.cssCache[filename] = css;
                            }
                            if(callback) {
                                callback(e, css);
                            }
                        } catch(e) {
                            if(callback) {
                                callback(e);
                            }
                        }
                    }
                });
        }

        var getCssFromLessPath = function(lessPath, callback) {
            var filename = lessPath;
            var cssPaths = lessPath.split(lessCssStr);
            var lessString = '';
            for(var p in cssPaths) {
                var lessPath = cssPaths[p];
                if(lessPath && lessPath !== '') {
                    house.log.debug(p + ' ~~~ ' + lessPath);
                    if(p > 0) {
                        if(lessPath.lastIndexOf('/') === 0) {
                            lessPath = process.cwd() + '/' + 'web' + lessPath + '.less';
                        } else {
                            lessPath = baseUrl.substr(0,baseUrl.lastIndexOf('/')) + lessPath + '.less';
                        }
                    } else {
                        lessPath = baseUrl + lessPath + '.less';
                    }
                    house.log.debug(lessPath);
                    dataStr = fs.readFileSync(lessPath);
                    if(dataStr) {
                        lessString = lessString + '\n\n\n' + dataStr;
                        // Watch for changes and delete the rendered less
                        if(!house.cssCacheWatch.hasOwnProperty(lessPath)) {
                            house.cssCacheWatch[lessPath] = true;
                            try {
                                fs.watch(lessPath, function(event, watchFilename) {
                                    delete house.cssCache[lessPath];
                                });
                            } catch(err) {
                                house.log.err(err);
                            }
                        }
                    } else {
                        house.log.debug('no data from file path: ' + lessPath);
                        if(callback) {
                            callback(e);
                        }
                    }
                }
            }
            getLessFromString(lessString, filename, callback);
        }





        if(req.url.indexOf('require.js?/') !== -1) {
            var jsUrl = req.url;
            var desktopStr = '/desktop';
            if(jsUrl.indexOf(desktopStr) === 0) {
                jsUrl = jsUrl.substr(desktopStr.length);
            }
            if(house.jsCache.hasOwnProperty(jsUrl)) {
                res.setHeader('Content-Type', 'application/javascript');
                res.end(house.jsCache[jsUrl]);
                return;
            }
            if(house.config.env === 'dev') {
                if(req.url.indexOf('desktop/require.js?/') !== -1) {
                    req.urlRouted = req.url.substr(0, req.url.indexOf('desktop/require.js')) + 'desktop/require.js';
                } else {
                    if(req.urlRouted) {
                        req.urlRouted = req.url.substr(0, req.url.indexOf('require.js')) + 'require.js'; // 
                    } else {
                        req.urlRouted = req.url.substr(0, req.url.indexOf('require.js')) + 'desktop/require.js'; // 
                    }
                }
                handleReq(req, res, next);
            } else {
                compileFromUrl(req.url, function(err, data) {
                    if(err) {
                        house.log.err(err);
                    } else {
                        // res.setHeader('Content-Type', 'application/javascript');
                        // res.end(data);
                    }
                });
                if(req.url.indexOf('desktop/require.js?/') !== -1) {
                    req.urlRouted = req.url.substr(0, req.url.indexOf('require.js')) + 'require.js';
                } else {
                    if(req.urlRouted) {
                        req.urlRouted = req.url.substr(0, req.url.indexOf('require.js')) + 'require.js'; // 
                    } else {
                        req.urlRouted = req.url.substr(0, req.url.indexOf('require.js')) + 'desktop/require.js'; // 
                    }
                }
                handleReq(req, res, next);
            }
        } else if(req.url.indexOf('.less.css') !== -1) {
            house.log.debug('Try to compile the less to css');

            var lessPath = req.url;
            if(house.cssCache.hasOwnProperty(lessPath)) {
                res.setHeader('Content-Type', 'text/css');
                res.end(house.cssCache[lessPath]);
                return;
            }
            house.log.debug('getCssFromLessPath: ' + lessPath);
            getCssFromLessPath(lessPath, function(err, css) {
                if(err) {
                    house.log.debug('getCssFromLessPath error: ');
                    house.log.err(err);
                    res.setHeader('Content-Type', 'text/plain');
                    res.end(err.message);
                } else {
                    res.setHeader('Content-Type', 'text/css');
                    res.end(css);
                }
            });
        } else {
            var path = url.parse(req.url).pathname;
            var publicFolder = req.cachedHtml || options.publicFolder;
            send(req, path)
                .root(publicFolder)
                .on('error', function(err) {
                    //house.log.debug('error on '+path);
                    house.log.info(req.ip + ' ' + req.userAgent + ' ' + (err.status || 500) + ' ' + path);
                    //house.log.debug(err.message);
                    req.url = req.urlOrig;
                    if(options.otherwise && !req.otherwiseTry) {
                        if(req.cachedHtml) {
                            delete req.cachedHtml;
                            req.urlRouted = options.otherwise;
                            req.otherwiseTry = true;
                        } else if(options.cachedHtml) {
                            req.cachedHtml = options.cachedHtml;
                            req.urlRouted = req.url + '.html';
                        } else {
                            req.urlRouted = options.otherwise;
                            req.otherwiseTry = true;
                        }
                        handleReq(req, res, next);
                    } else {
                        if(next) next();
                    }
                })
                .on('directory', function() {
                    house.log.debug('folder');
                })
                .pipe(res);
        }
    };

    var forkOptimizer = function() {
        if(house.config.forkedFeedFetcher) {
            house.log.debug('forked house subs feed fetcher, dont fork optimizer');
            return;
        }
        house.log.info('forking js optimizer');
        house.forkedOptimizer = child.fork(__dirname + "/optimizer.js");
        house.forkedOptimizer.send({
            "test": {
                'test': 'test'
            }
        });
        house.forkedOptimizer.on('message', function(m) {
            if(m.hasOwnProperty('optimizedUrl')) {
                house.log.info('optimizedUrl ' + m.optimizedUrl.url);

                house.jsCache[m.optimizedUrl.url] = m.optimizedUrl.data;
            } else if(m.hasOwnProperty('clearUrl')) {
                house.log.info('url changed ' + m.clearUrl.url);
                delete house.jsCache[m.clearUrl.url];
            }
            //   console.log(js)
            //   _.each(js, function(v,k,l) {
            //       console.log('k');
            //       console.log(k);
            //   });
        });
        house.forkedOptimizer.on('close', function() {
            house.log.info('forking js optimizer closed, restart..');
            forkOptimizer();
        });
    }
    if(!house.forkedOptimizer) {
        forkOptimizer();
    } else {
        // house.forkedOptimizer;
    }

    return handleReq;
};