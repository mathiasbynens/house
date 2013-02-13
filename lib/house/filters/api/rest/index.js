// # API Filter
//
// ## REST API
//
var ent = require('ent');
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
                      try {
                          var json = JSON.parse(i);
                          req.query = json;
                      } catch(e) {
                          house.log.err(e);
                      }
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
        res.data = function(data, fmt, mediaFormat){
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
                    
                    var str = '';
                    
                    if(it.hasOwnProperty('itunes')) {
                        var itunes = it.itunes;
                        if(itunes.hasOwnProperty('keywords')) {
                            str = str + '<itunes:keywords>'+itunes.keywords+'</itunes:keywords>';
                        }
                        if(itunes.hasOwnProperty('subtitle')) {
                            str = str + '<itunes:subtitle>'+itunes.subtitle+'</itunes:subtitle>';
                        }
                        if(itunes.hasOwnProperty('summary')) {
                            str = str + '<itunes:summary>'+itunes.summary+'</itunes:summary>';
                        }
                        if(itunes.hasOwnProperty('author')) {
                            str = str + '<itunes:author>'+itunes.author+'</itunes:author>';
                        }
                        if(itunes.hasOwnProperty('explicit')) {
                            str = str + '<itunes:explicit>'+itunes.explicit+'</itunes:explicit>';
                        }
                        if(itunes.hasOwnProperty('duration')) {
                            str = str + '<itunes:duration>'+itunes.duration+'</itunes:duration>';
                        }
                       if(itunes.hasOwnProperty('order')) {
                            str = str + '<itunes:order>'+itunes.order+'</itunes:order>';
                        }
                        
                    }
                    if(it.hasOwnProperty('media')) {
                        var media = it.media;
                        console.log('me')
                        console.log(media)
                        str = str + '<enclosure url="'+house.config.site.url+'api/files/'+media.filename+'" fileSize="'+media.length+'" type="'+ent.encode(media.contentType)+'" />';
                        console.log(str)
                    }
    	//<itunes:summary>There wasn't a big enough swear jar! Live from RockSpace, Jason talks with Dave McClure of 500 Startups. Dave opens up about his initial investments, the SEC and diversity in funding startups.</itunes:summary>
		//<itunes:author>ThisWeekIn.com</itunes:author>
		//<itunes:explicit>no</itunes:explicit>
		//<itunes:duration>1:39:42</itunes:duration>
                    
                    items += '<item>\
    <title>'+it.title+'</title>\
    <link>'+it.url+'</link>\
    <guid isPermaLink="true">'+it.url+'</guid>\
    <comments>'+it.url+'</comments>\
    <description><![CDATA['+it.desc+']]></description>\
    <author>'+it.author+'</author>\
    <pubDate>'+it.pubDate+'</pubDate>'+str+'\
</item>';
                }
                
                var title = '';
                var link = '';
                var desc = '';
                var author = '';
                
                if(house.config.site.title) {
                    var t = '';
                    if(mediaFormat) {
                        t = ' - '+mediaFormat.charAt(0).toUpperCase()+mediaFormat.substr(1);
                    }
                    title = '<title>'+house.config.site.title+t+'</title>';
                }
                if(house.config.site.subtitle) {
                    title = title + '<itunes:subtitle>'+house.config.site.subtitle+'</itunes:subtitle>';
                }
                if(house.config.site.url) {
                    link = '<link>'+house.config.site.url+'</link>';
                    if(house.config.site.logo) {
                        link = link + '<itunes:image href="'+house.config.site.url+house.config.site.logo+'" />';
                    }
                }
                if(house.config.site.desc) {
                    desc = '<description>'+ent.encode(house.config.site.desc)+'</description>';
                    desc = desc + '<itunes:summary>'+ent.encode(house.config.site.desc)+'</itunes:summary>';
                }
                if(house.config.site.owner) {
                    author = '<itunes:author>'+ent.encode(house.config.site.owner.name)+'</itunes:author>';
                    author = author + '<itunes:owner><itunes:name>'+ent.encode(house.config.site.owner.name)+'</itunes:name><itunes:email>'+ent.encode(house.config.site.owner.email)+'</itunes:email></itunes:owner>';
                    author = author + '<copyright>&#x2117; &amp; &#xA9; '+ent.encode(house.config.site.owner.name)+'</copyright>';
                }
                
                if(house.config.site.category) {
                    if(_.isObject(house.config.site.category)) {
                        for(var i in house.config.site.category) {
                            desc = desc + '<itunes:category text="'+i+'"><itunes:category text="'+house.config.site.category[i]+'"/></itunes:category>';
                        }
                    } else {
                        desc = desc + '<itunes:category text="'+house.config.site.category+'"></itunes:category>';
                    }
                }
                
                var xml = '<?xml version="1.0" encoding="UTF-8"?><rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0"><channel><language>en-us</language>';
                xml = xml + title + desc + author + link;
                xml = xml + items+'</channel></rss>';
                
                res.setHeader('Content-Type', 'application/rss+xml');
                res.end(xml);
                console.log('ended')
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
