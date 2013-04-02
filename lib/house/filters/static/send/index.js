// # Static File Filter
//
// ## visionmedia/send Static File Delivery
//
// This filter requires a value for the option *publicFolder* to deliver files from
//
exports = module.exports = function(house, options) {
    if(!options) {
        var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('static')); });
        options = (filter.static && filter.static.hasOwnProperty('send')) ? filter.static.send : {};
    }
    var requirejs = require('requirejs');
    var send = require('send');
    var js = {};
    var handleReq = function(req, res, next) {
        house.log.debug(req.url);
        var optJs = false;
        if(req.urlRouted) {
            req.url = req.urlRouted;
        }
        if(js.hasOwnProperty(req.url)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(js[req.url]);
            return;
        }
        
        var compileFromUrl = function(url, callback) {
            var config = {
                baseUrl: options.publicFolder+'/../', //'apps/html5os/', 
                include: [],
                deps: ['/desktop/require.js'],
                uglify: { beautify: false },
                generateSourceMaps: false,
                //paths: {'js/config': ':empty'}
                //, excludeShallow: ['js/config']
            };
            var jses = url.substr(url.indexOf('?')).split('.js');
            if(jses.length > 1) {
                var combinedScript = '';
                for(var i in jses) {
                    var jstr = jses[i];
                    if(i === jses.length -1 || jstr === '') {
                    } else {
                        console.log(jstr)
                        if(!config.hasOwnProperty('name')) {
                            config.name = jstr.substr(2);
                        } else {
                            config.include.push(jstr.substr(1));
                        }
                    }
                }
                var filename = config.name;
                //console.log(config.baseUrl+filename)
                fs.watch(config.baseUrl+filename+'.js', function(event, filename){
                    console.log('event is: ' + event);
                      if (filename) {
                        //console.log('filename provided: ' + filename);
                      } else {
                        //console.log('filename not provided');
                      }
                      delete js[url];
                });
                for(var i in config.include) {
                    var include = config.include[i];
                    //console.log(include);
                    fs.watch(config.baseUrl+include+'.js', function(event, filename){
                        //console.log('event is: ' + event);
                          if (filename) {
                            //console.log('filename provided: ' + filename);
                          } else {
                            //console.log('filename not provided');
                          }
                          delete js[url];
                    });
                }
                config.out = function(data){
                    //console.log('out')
                    //console.log(config.deps)
                    for(var i in config.include) {
                        var include = config.include[i];
                        //console.log(include);
                        data = data.replace('define("'+include, 'define("/'+include+'.js');
                    }
                    data = data.replace('define("'+config.name, 'define("/'+config.name+'.js');
                    js[url] = data;
                    callback(null, data);
                }
                house.log.debug(config)
                requirejs.optimize(config, function (buildResponse) {
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
        
        if(req.url.indexOf('require.js?/') !== -1) {
            compileFromUrl(req.url, function(err, data){
                if(err) {
                    house.log.err(err);
                } else {
                    res.setHeader('Content-Type', 'application/javascript');
                    res.end(data);
                }
            });
        } else {
            var path = url.parse(req.url).pathname;
            send(req, path)
              .root(options.publicFolder)
              .on('error', function(err){
                  house.log.debug('error on '+path);
                  house.log.debug(err.status || 500);
                  house.log.debug(err.message);
                req.url = req.urlOrig;
                if(options.otherwise) {
                    req.urlRouted = options.otherwise;
                    handleReq(req, res);
                } else {
                    if (next) next();
                }
              })
              .on('directory', function(){
                  house.log.deubg('folder');
              })
              .pipe(res);
        }
    };
    return handleReq;
};
