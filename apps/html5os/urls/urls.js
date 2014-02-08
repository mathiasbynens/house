(function() {
    var WidgetView = Backbone.View.extend({
        tagName: 'widget',
        initialize: function() {
            var self = this;
            this.collection.on('selected', function(doc){
                self.selectedDoc = doc;
                self.render();
            });
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.setElement(this.$el);
            return this;
        },
        events: {
        }
    });
    
    var ViewToggler = Backbone.View.extend({
        tagName: 'div',
        className: 'toggler',
        initialize: function() {
            var self = this;
        },
        render: function() {
            var self = this;
            this.$el.html('<div class="btn-group filters">\
            <button title="Filter" type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="filterIcon glyphicon glyphicon-filter"></span></button>\
            <ul class="dropdown-menu" role="menu">\
            <li class="image"><a href="#" class="glyphicon glyphicon-picture"> Image</a></li>\
            <li class="audio"><a href="#" class="glyphicon glyphicon-music"> Audio</a></li>\
            <li class="video"><a href="#" class="glyphicon glyphicon-film"> Video</a></li>\
            <li class="text"><a href="#" class="glyphicon glyphicon-font"> Text</a></li>\
            <li class="divider"></li>\
            <li class="none"><a href="#" class="glyphicon glyphicon-unchecked"> No Filter</a></li>\
            </ul>\
            </div>\
            \
            <div class="btn-group" data-toggle="buttons">\
  <label class="btn btn-default list active">\
    <input type="radio" name="options" id="list"><span class="glyphicon glyphicon-list"> </span>\
  </label>\
  <label class="btn btn-default avatar">\
    <input type="radio" name="options" id="avatar"><span class="glyphicon glyphicon-th-large"> </span>\
  </label>\
</div>');
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click label.list": "clickList",
            "click label.avatar": "clickAvatar",
            "click .filters .image": "clickFilterImage",
            "click .filters .audio": "clickFilterAudio",
            "click .filters .video": "clickFilterVideo",
            "click .filters .text": "clickFilterText",
            "click .filters .none": "clickFilterNone"
        },
        clickList: function(e) {
            var self = this;
            this.trigger('toggled', 'list');
        },
        clickAvatar: function(e) {
            var self = this;
            this.trigger('toggled', 'avatar');
        },
        clickFilterImage: function(e) {
            var self = this;
            this.trigger('filtered', 'image');
            e.preventDefault();
        },
        clickFilterAudio: function(e) {
            var self = this;
            this.trigger('filtered', 'audio');
            e.preventDefault();
        },
        clickFilterVideo: function(e) {
            var self = this;
            this.trigger('filtered', 'video');
            e.preventDefault();
        },
        clickFilterText: function(e) {
            var self = this;
            this.trigger('filtered', 'text');
            e.preventDefault();
        },
        clickFilterNone: function(e) {
            var self = this;
            this.trigger('filtered', '');
            e.preventDefault();
        },
    });
    
    
    var UrlsApp = Backbone.View.extend({
        tagName: 'body',
        className: 'urlApp',
        initialize: function() {
            var self = this;
            require(['/analytics/backbone-actions.js'], function(ActionsBackbone){
                window.ActionsBackbone = ActionsBackbone;
                require(['/files/backbone-files.js'], function(FilesBackbone){
                    window.FilesBackbone = FilesBackbone;
                    require(['/images/backbone-images.js'], function(ImagesBackbone){
                        window.ImagesBackbone = ImagesBackbone;
                        require(['/urls/backbone-urls.js'], function(UrlsBackbone){
                            window.UrlsBackbone = UrlsBackbone;
                            
                            self.collection = window.urlsCollection = new UrlsBackbone.Collection(); // collection
                            self.listView = self.collection.getView();
                            
                            self.listView.on('selected', function(avatar){
                                self.listView.trigger('detail', avatar.model);
                            });
                            
                            self.viewToggler = new ViewToggler({el: $('header .toggler')[0]});
                            self.viewToggler.on('toggled', function(viewMode){
                                if(viewMode == 'avatar') {
                                    self.listView.setLayout('avatar');
                                } else if(viewMode == 'list') {
                                    self.listView.setLayout('table');
                                }
                            });
                            self.viewToggler.on('filtered', function(filter){
                                if(filter) {
                                    self.listView.filter(function(model){
                                        console.log(model);
                                        if(model.has('file') && model.get('file').contentType.indexOf(filter) !== -1) {
                                            return true;
                                        }
                                        return false;
                                    });
                                } else {
                                    self.listView.filter();
                                }
                            });
                            self.searchView = self.collection.getSearchView({el: $('header.navbar .navbar-header .searchUrls')[0]});
                            self.collection.load(null, function(){
                                self.initialized = true;
                                self.trigger('initialized');
                            });
                            self.searchView.on('search', function(query){
                                console.log(query);
                                self.listView.search(query, function(){
                                    self.searchView.trigger('searchComplete');
                                });
                            });
                            self.searchView.on('submit', function(query){
                                console.log(query);
                                //self.listView.search(query);
                                
                                self.collection.newUrl(query, function(err, urlModel){
                                    if(err) {
                                        if(err.message && err.message.indexOf('Please login') !== -1) {
                                            if(account) {
                                                account.on('login', function(loginView){
                                                    self.searchView.trigger('submit', query);
                                                });
                                                account.getView().login();
                                            }
                                        }
                                    } else {
                                        self.searchView.trigger('searchComplete');
                                    }
                                });
                            });
                            self.listView.on('share', function(urlModel){
                                var gotoUrl = urlModel.getShareUrl();
                                if(gotoUrl.indexOf(window.location.protocol) === -1) {
                                    window.location = gotoUrl;
                                } else {
                                    self.nav.router.navigate(urlModel.getSharePath(), {trigger: true});
                                }
                            });
                            self.listView.on('detail', function(urlModel){
                                self.nav.router.navigate(urlModel.getNavigatePath(), {trigger: true});
                            });
                            if(window.account) {
                                window.account.on('loggedIn', function(loginView){
                                    console.log('refresh collection');
                                    self.collection.load(null, function(){
                                    });
                                });
                            }
                        });
                    });
                });
            });
            
            /*require(['../desktop/jquery.idle-timer.js'], function() {
                var idleTimer = $(document).idleTimer(4200);
                $(document).bind("idle.idleTimer", function(e){
                    $('body').addClass('idle');
                });
                $(document).bind("active.idleTimer", function(){
                    $('body').removeClass('idle');
                });
            });*/
        },
        renderList: function() {
            $('body').prepend(this.listView.render().$el);
        },
        render: function() {
            $('header.navbar .navbar-header').append(this.searchView.render().$el);
            $('header.navbar .navbar-collapse').append(this.viewToggler.render().$el);
            this.searchView.focus();
        },
        userIsAdmin: function() {
            return (this.user && this.user.has('groups') && this.user.get('groups').indexOf('admin') !== -1);
        },
        bindAuth: function(auth) {
            var self = this;
            self.auth = auth;
        },
        bindUser: function(user) {
            var self = this;
            self.user = user;
        },
        bindNav: function(nav) {
            this.nav = nav;
            this.bindRouter(nav.router);
            //nav.col.add({title:"URLs", navigate:""});
            //nav.col.add({title:"Bookmarklet", href:''});
        },
        renderMetaTagsForDoc: function(doc) {
            var self = this;
            $('head [property="fb:page_id"]').remove();
            //var baseHref = $('head [rel="canonical"]').attr('data-href');
            var baseHref = $('head base[href]').attr('href');
            var hostName = window.location.host || window.location.hostname;
            var hostOrigin = window.location.protocol+'//'+hostName;
            var baseUrl = hostOrigin+baseHref;
            var apiFilePath = hostOrigin+'/api/files/';
            
            $('head [rel="canonical"]').attr('href', doc.getShareUrl());
            $('head meta[property="og:url"]').attr('content', doc.getShareUrl());
            $('head [name="twitter:domain"]').attr('content', hostName);
            $('head [name="twitter:url"]').attr('content', doc.getShareUrl());
            
            $('head [property="og:type"]').attr('content', 'article');
            $('head [name="twitter:card"]').attr('content', 'photo');
            var title = '';
            if(doc.has('title')) {
                title = doc.get('title');
            } else {
                title = 'URL: '+doc.get('url');
            }
            self.router.setTitle(title);
            $('head [property="og:title"]').attr('content', title);
            $('head [name="twitter:title"]').attr('content', title);
            
            var desc = '';
            if(doc.has('desc')) {
                //self.router.setTitle(doc.get('title'));
                desc = doc.get('desc');
                $('head meta[property="og:description"]').attr('content', desc);
                $('head meta[name="twitter:description"]').attr('content', desc.substr(0,130));
                $('head meta[name="description"]').attr('content', desc);
            }
            
            if(doc.has('ogImage')) {
                var imageDoc = doc.get('ogImage');
                console.log(imageDoc);
                var ogImage = apiFilePath+encodeURIComponent(imageDoc.filename);
                if(imageDoc.sizes && imageDoc.sizes.square) {
                    ogImage = apiFilePath+encodeURIComponent(imageDoc.sizes.square.filename);
                } else if(imageDoc.sizes && imageDoc.sizes.full) {
                    ogImage = apiFilePath+encodeURIComponent(imageDoc.sizes.full.filename);
                }
                // console.log('update og:image with post avatar');
                $('head [property="og:image"]').attr('content', ogImage);
                $('head [name="twitter:image"]').attr('content', ogImage);
            } else if(doc.has('image')) {
                var imageDoc = doc.get('image');
                console.log(imageDoc);
                var ogImage = apiFilePath+encodeURIComponent(imageDoc.filename);
                if(imageDoc.sizes && imageDoc.sizes.square) {
                    ogImage = apiFilePath+encodeURIComponent(imageDoc.sizes.square.filename);
                } else if(imageDoc.sizes && imageDoc.sizes.full) {
                    ogImage = apiFilePath+encodeURIComponent(imageDoc.sizes.full.filename);
                }
                // console.log('update og:image with post avatar');
                $('head [property="og:image"]').attr('content', ogImage);
                $('head [name="twitter:image"]').attr('content', ogImage);
            }
            
            if(window.config && config.fb) {
                if(config.fb.page_id) {
                    $('head meta[property="fb:page_id"]').remove();
                    $('head').append('<meta property="fb:page_id" content="'+config.fb.page_id+'" />');
                }
                if(config.fb.app_id) {
                    $('head meta[property="fb:app_id"]').remove();
                    $('head').append('<meta property="fb:app_id" content="'+config.fb.app_id+'" />');
                }
                if(config.fb.admins) {
                    $('head meta[property="fb:admins"]').remove();
                    var adminsArr = config.fb.admins.split(',');
                    for(var i in adminsArr) {
                        var admin_id = adminsArr[i].trim();
                        $('head').append('<meta property="fb:admins" content="'+admin_id+'" />');
                    }
                }
            }
            if(!$('head meta[property="fb:app_id"]').attr('content')) {
                $('head meta[property="fb:app_id"]').remove();
            }
            
            var matches = doc.get('url').match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
            if(matches && matches.length > 1) {
                var youtubeId = matches[5];
                if(youtubeId) {
                    var ythumb = 'http://i.ytimg.com/vi/'+youtubeId+'/hqdefault.jpg';
                    // console.log('update og tag');
                    $('head [property="og:image"]').attr('content', ythumb);
                    $('head [name="twitter:image"]').attr('content', ythumb);
                    
                    $('head [property="og:video"]').remove();
                    var $ogVideo = $('<meta property="og:video" content="http://www.youtube.com/v/'+youtubeId+'">');
                    //$('head').append($ogVideo);
                    //$('head [property="og:type"]').attr('content', 'video');
                }
                //this.$el.find('.youtube').fitVids();
            } else if(doc.get('url').indexOf('twitter.com') !== -1) {
            } else {
            }
            
            if(doc.has('msg')) {
                var msgText = doc.get('msg');
                msgText = $('<span>'+msgText+'</span>').text();
                if(msgText.length > 300) {
                    msgText = msgText.substr(0,295);
                    var si = msgText.lastIndexOf(' ');
                    msgText = msgText.substr(0,si)+'...';
                }
                $('head [property="og:description"]').attr('content', msgText);
            }
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.on('reset', function(){
                self.collection.getView().$el.hide();
                self.nav.unselect();
                $('body > .shareView').remove();
                $('body > .fullView').remove();
            });
            router.on('root', function(){
                router.setTitle('URLs');
                self.collection.getView().$el.show();
                self.nav.selectByNavigate('');
                self.renderList();
                router.trigger('loadingComplete');
            });
            var windowLocationHost = window.location.host || window.location.hostname;
            var bindShareViewRoutes = function(shareView) {
                shareView.on('details', function(){
                    if(window == top) {
                        self.nav.router.navigate(shareView.model.getNavigatePath(), {trigger: true});
                    } else {
                        window.parent.postMessage("go_to_"+window.location.protocol + '//' + windowLocationHost + '/urls/' + shareView.model.getNavigatePath(),"*");
                    }
                });
                shareView.on('home', function(){
                    if(window == top) {
                        self.nav.router.navigate('', {trigger: true});
                    } else {
                        window.parent.postMessage("go_to_"+window.location.protocol + '//' + windowLocationHost + '/',"*");
                    }
                });
                shareView.on('back', function(){
                    if(window == top) {
                        self.nav.router.navigate('', {trigger: true});
                    } else {
                        window.parent.postMessage("go_to_"+window.location.protocol + '//' + windowLocationHost + '/urls/',"*");
                    }
                });
                shareView.on('close', function(){
                    //self.nav.router.navigate('', {trigger: true});
                    if(window == top) {
                        self.nav.router.navigate('', {trigger: true});
                    } else {
                        window.parent.postMessage("destroy_bookmarklet","*");
                    }
                });
            }
            router.route('save/public/:url', 'saveUrl', function(url){
                router.reset();
                router.setTitle('Save URL Publicly');
                self.searchView.trigger('searchLoading', url);
                
                self.collection.newUrl(url, {groups: ['public']}, function(err, urlModel){
                    if(err) {
                        if(err.message && err.message.indexOf('Please login') !== -1) {
                            if(window != top) {
                                window.top.location.href = window.location.href;
                            } else {
                                if(account) {
                                    account.on('login', function(loginView){
                                        router.navigate('save/public/'+encodeURIComponent(url), {trigger: true});
                                    });
                                    account.getView().login();
                                }
                            }
                        }
                    } else {
                        var shareOpts = {iframe: false};
                        if(window == top) {
                            shareOpts.iframe = true;
                        }
                        router.navigate(urlModel.getSharePath(), {trigger: false});
                        //self.renderMetaTagsForDoc(doc);
                        if(urlModel.has('title')) {
                            router.setTitle(urlModel.get('title'));
                        }
                        var shareView = urlModel.getNewShareView(shareOpts);
                        bindShareViewRoutes(shareView);
                        $('body').append(shareView.render().$el);
                    }
                    router.trigger('loadingComplete');
                    self.searchView.trigger('searchComplete');
                });
            });
            router.route('save/:url', 'saveUrl', function(url){
                router.reset();
                router.setTitle('Save URL');
                //self.searchView.
                
                self.searchView.trigger('searchLoading', url);
                
                self.collection.newUrl(url, function(err, urlModel){
                    if(err) {
                        if(err.message && err.message.indexOf('Please login') !== -1) {
                            if(window != top) {
                                window.top.location.href = window.location.href;
                            } else {
                                if(account) {
                                    account.on('login', function(loginView){
                                        router.navigate('save/'+encodeURIComponent(url), {trigger: true});
                                    });
                                    account.getView().login();
                                }
                            }
                        }
                    } else {
                        var shareOpts = {iframe: false};
                        if(window == top) {
                            shareOpts.iframe = true;
                        }
                        ////parent.postMessage('destroy_bookmarklet', parent.location.origin);
                        //window.parent.postMessage("destroy_bookmarklet","*")
                        router.navigate(urlModel.getSharePath(), {trigger: false});
                        //self.renderMetaTagsForDoc(doc);
                        if(urlModel.has('title')) {
                            router.setTitle(urlModel.get('title'));
                        }
                        var shareView = urlModel.getNewShareView(shareOpts);
                        bindShareViewRoutes(shareView);
                        $('body').append(shareView.render().$el);
                        router.trigger('loadingComplete');
                        self.searchView.trigger('searchComplete');
                    }
                });
            });
            router.route('share/:id', 'shareUrl', function(id){
                router.reset();
                self.findById(id, function(doc){
                    if(doc) {
                        var url = doc.get('url');
                        url = decodeURIComponent(url);
                        self.trackUrlView(url);
                        //self.$urlViewer.append(doc.getFullView().render().$el);
                        self.renderMetaTagsForDoc(doc);
                        if(doc.has('title')) {
                            router.setTitle(doc.get('title'));
                        }
                        var shareView = doc.getNewShareView();
                        bindShareViewRoutes(shareView);
                        $('body').append(shareView.render().$el);
                    } else {
                        console.log(url);
                        //router.navigate('', {replace: true, trigger: true});
                        
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('id/:id', 'id', function(id){
                self.collection.getOrFetch(id, function(doc){
                    if(doc) {
                        router.navigate('url/'+encodeURIComponent(doc.get('url')), {trigger: true, replace: true});
                    }
                });
            });
            router.route('url/:url', 'url', function(url){
                url = decodeURIComponent(url);
                router.reset();
                self.findByUrl(url, function(doc){
                    if(doc) {
                        //self.$urlViewer.append(doc.getFullView().render().$el);
                        self.renderMetaTagsForDoc(doc);
                        if(doc.has('title')) {
                            router.setTitle(doc.get('title'));
                        } else {
                            router.setTitle(doc.get('url'));
                        }
                        var fullView = doc.getFullView();
                        $('body').append(fullView.render().$el);
                        
                        var shareView = doc.getNewShareView({iframe: false});
                        bindShareViewRoutes(shareView);
                        $('body').append(shareView.render().$el);
                    } else {
                        console.log(url);
                        //router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('new', 'new', function(){
                var form = new UrlsBackbone.Form({
                    collection: self.collection
                });
                form.on("saved", function(doc) {
                    $light.trigger("close");
                });
                var $light = utils.appendLightBox(form.render().$el);
                form.focus();
                $light.on("close", function() {
                    if (history) {
                        history.back();
                    }
                });
                router.reset();
                router.setTitle('New');
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('new');
            });
        },
        getListView: function() {
            return this.collection.getView();
        },
        getWidgetView: function() {
            if(!this.hasOwnProperty('widgetView')) {
                this.widgetView = new WidgetView({collection: this.collection});
            }
            return this.widgetView;
        },
        findById: function(id, callback) {
            this.collection.getOrFetch(id, callback);
        },
        findByUrl: function(url, callback) {
            this.collection.getOrFetchUrl(url, callback);
        },
        trackUrlView: function(destUrl) {
            var msg = 'VIEW '+destUrl+' FROM '+window.location.href;
            //'EXIT '+window.location.toString()+' TO '+url
            if(window.ActionsBackbone) {
                var action = new ActionsBackbone.Model({});
                action.set({a:msg},{silent:true});
                action.save();
            } else {
                require(['/analytics/backbone-actions.js'], function(ActionsBackbone){
                    window.ActionsBackbone = ActionsBackbone;
                    var action = new ActionsBackbone.Model({});
                    action.set({a:msg},{silent:true});
                    action.save();
                });
                return false;
            }
        },
        events: {
            'click a[target="_new"]:not([rel="external"])': "clickExternalLink"
        },
        clickExternalLink: function(e) {
            //var origEl = e.srcElement || e.originalTarget;
            //var destUrl = $(origEl).attr('href');
            var destUrl = $(e.currentTarget).attr('href');
            var msg = 'EXIT '+window.location.href+' TO '+destUrl;
            //'EXIT '+window.location.toString()+' TO '+url
            if(window.ActionsBackbone) {
                var action = new ActionsBackbone.Model({});
                action.set({a:msg},{silent:true});
                action.save();
            } else {
                require(['/analytics/backbone-actions.js'], function(ActionsBackbone){
                    window.ActionsBackbone = ActionsBackbone;
                    var action = new ActionsBackbone.Model({});
                    action.set({a:msg},{silent:true});
                    action.save();
                    setTimeout(function(){
                        window.location = destUrl;
                    },100);
                });
                return false;
            }
        },
    });
    
    if(define) {
        define(function () {
            return UrlsApp;
        });
    }
})();
