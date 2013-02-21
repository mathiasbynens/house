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
    var handleReq = function(req, res, next) {
        house.log.debug(req.url);
        if(req.urlRouted) {
            req.url = req.urlRouted;
        }
        var jses = req.url.split('.js');
        if(jses.length > 2) {
            var config = {
                baseUrl: options.publicFolder+'/',
                deps: [],
                uglify: {
                    beautify: true,
                }
            };
            var combinedScript = '';
            for(var i in jses) {
                var jstr = jses[i];
                if(i === jses.length -1 || jstr === '') {
                     
                } else {
                    var n = jstr.substr(1);
                    jstr = options.publicFolder + jstr;
                    if(i>0) {
                    }
                    jstr = jstr+'.js';
                    console.log(jstr)
                    if(!config.hasOwnProperty('name')) {
                        config.name = n; 
                    } else {
                        config.deps.push(n);
                    }
                    //}
                    //combinedScript = combinedScript + fs.readFileSync(jstr, "utf8") + '\n\n';
                    
                }
            }
            config.out = function(data){
                console.log('out')
                //console.log(arguments)
                res.setHeader('Content-Type', 'application/javascript');
                res.end(data);
            }//options.publicFolder + '/main.js';//req.url;
            console.log(config)
            requirejs.optimize(config, function (buildResponse) {
                house.log.debug('buildResponse');
                console.log(buildResponse)
                //buildResponse is just a text output of the modules
                //included. Load the built file for the contents.
                //Use config.out to get the optimized file contents.
            }, function(err) {
                //optimization err callback
                house.log.err(err);
            });
            
            //res.setHeader('Content-Type', 'application/javascript');
            //res.end(combinedScript);
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
