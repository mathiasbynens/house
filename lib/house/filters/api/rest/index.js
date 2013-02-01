// # API Filter
//
// ## REST API
//

(exports = module.exports = function(house, options){
    house.api = {};
    if(!options) {
        var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('api')); });
        options = (filter && filter.api && filter.api.hasOwnProperty('rest')) ? filter.api.rest : {};
    }
        
    if(options.hasOwnProperty('endPoints')) {
        house.api.endPoints = require(options.endPoints)(house);
    } else {
        house.api.endPoints = require(process.cwd()+'/endPoints')(house);
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        //house.log.debug('api req url: '+path);
        req.urlParsed = url.parse(path, true);
        if(req.urlParsed.search) {
          req.query = req.urlParsed.query; //querystring.parse(req.urlParsed.query);
          if(_.size(req.query) === 1) {
              for(var i in req.query) {
                  if(req.query[i] === '') {
                      var json = JSON.parse(i);
                      req.query = json;
                  }
              }
          }
        }
        var acceptType = req.headers.accept;
        if(acceptType) {
            if(acceptType.indexOf('json') !== -1) {
                req.acceptFormat = 'json';
            } else if(acceptType.indexOf('html') !== -1) {
                req.acceptFormat = 'html';
            } else if(acceptType.indexOf('rss') !== -1) {
                req.acceptFormat = 'rss';
            } else {
                req.acceptFormat = 'html';
            }
        } else {
            req.acceptFormat = 'html';
        }
        //
        // endpoints can respond using this method to handle the common rest request,
        // taking the accept type into consideration
        //
        res.data = function(data, fmt){
            var sendResHtml = function() {
                if(!data._html) {
                    sendResJson();
                    return;
                }
                res.setHeader('Content-Type', 'text/html');
                var head = data._html.head || '';
                var body = data._html.body || '';
                var headTags = '';
                if(house.config.facebook.app.id) {
                    headTags = '<meta property="fb:app_id" content="'+house.config.facebook.app.id+'" />';
                }
                var str = '<html><head>'+headTags+head+'</head><body>'+body+'</body></html>';
                res.end(str);
            }
            var sendResJson = function() {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
            }
            var sendResText = function() {
                if(typeof data !== 'string') {
                    data = JSON.stringify(data, null, 4);
                }
                res.end(data);
            }
            var sendResRss = function() {
                var items = '';
                for(var i in data) {
                    var it = data[i];
                    items += '<item>\
    <title>'+it.title+'</title>\
    <link>'+it.url+'</link>\
    <comments>'+it.url+'</comments>\
    <description><![CDATA['+it.desc+']]></description>\
    <author>'+it.author+'</author>\
    <pubDate>'+it.pubDate+'</pubDate>\
</item>';
                }
                
                var xml = '<rss version="2.0"><channel><title>'+house.config.site.title+'</title><link>'+house.config.site.url+'</link><description>'+house.config.site.desc+'</description>\
    '+items+'\
</channel></rss>';
                
                res.setHeader('Content-Type', 'application/rss+xml');
                res.end(xml);
            }
            if(req.method == 'HEAD') {
                sendResJson();
            } else {
                fmt = fmt || req.acceptFormat;
                if(fmt == 'rss') {
                    sendResRss();
                } else if(fmt == 'html') {
                    sendResHtml();
                } else if(fmt == 'json') {
                    sendResJson();
                } else {
                    sendResText();
                }
            }
        }
        
        //
        // Describe our api endpoints
        //
        if(path === '/') {
            res.data(house.api.endPointsList);
            return;
        }
        
        // route to known endpoints
        
        for(var i in house.api.endPoints) {
            for(var routePath in house.api.endPoints[i]) {
                //house.log.debug('api routePath '+routePath);
                if(path.indexOf(routePath) === 1) {
                    
                    //house.log.debug('api endpoint '+path);
                    
                    req.urlRouted = path.substr(routePath.length+1);
                    
                    //house.log.debug('modified req.urlRouted '+req.urlRouted);
                    
                    house.api.endPoints[i][routePath].apply(this, arguments);
                    return;
                }
            }
        }
        next();
    };
    return handleReq;
});
