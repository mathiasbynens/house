(function() {
    var pageSize = 24;

    var AppView = Backbone.View.extend({
        tagName: 'body',
        className: 'news',
        initialize: function() {
            var self = this;
            this.$app = $('<div class="app"></div>');
            self.editForms = {};
            require(['/desktop/jquery.scrollTo.min.js'], function(){
                //require(['articles.js'], function(ModelBackbone){
                    //window.ArticlesBackbone = ModelBackbone;
                    //window.articlesCollection = new ModelBackbone.Collection(); // collection
                    require(['/news/news.js'], function(ModelBackbone){
                        window.NewsBackbone = ModelBackbone;
                        window.newsCollection = new ModelBackbone.Collection(); // collection
                        require(['/news/subs.js'], function(ModelBackbone){
                            window.SubsBackbone = ModelBackbone;
                            window.subsCollection = new ModelBackbone.Collection(); // collection
                            require(['/files/backbone-files.js'], function(FilesBackbone){
                                window.FilesBackbone = FilesBackbone;
                                window.filesCollection = new FilesBackbone.Collection(); // collection
                                
                                self.$subsList = $('<div class="subs-list container"></div>');
                                self.$subsViewer = $('<div class="subs-viewer container"></div>');
                                self.$newsList = $('<div class="news-list container"></div>');
                                self.$newsViewer = $('<div class="news-viewer container"></div>');
                                window.newsCollection.pageSize = pageSize;
                                window.subsCollection.pageSize = 1000;
                                
                                self.listView = new window.NewsBackbone.List({el: self.$newsList, collection: window.newsCollection});
                                self.listView.on('select', function(row) {
                                    if(self.$newsList.css('position') == 'fixed') {
                                        self.$newsList.scrollTo(row.$el);
                                    } else {
                                        $(window).scrollTo(row.$el, 0, {offset:-50});
                                    }
                                    if(row.model.has('read')) {
                                    } else {
                                        row.markAsRead();
                                    }
                                    self.router.navigate(row.model.getNavigatePath(), {trigger: true});
                                });
                                self.listView.on('deselect', function() {
                                    self.router.navigate('', {trigger: true});
                                });
                                self.listView.on('goToProfile', function(user){
                                    self.router.navigate('from/'+user.get('name'), {trigger: true});
                                });
                                
                                self.subListView = new window.SubsBackbone.List({el: self.$subsList, collection: window.subsCollection, rowOptions: {actions: true}});
                                self.subListView.on('select', function(row) {
                                    self.router.navigate(row.model.getNavigatePath(), {trigger: true});
                                });
                                self.subListView.on('deselect', function(row) {
                                    self.router.navigate('/', {trigger: true});
                                });
                                self.subListView.on('goToProfile', function(user){
                                    self.router.navigate('from/'+user.get('name'), {trigger: true});
                                });
                                
                                var loadCollections = function() {
                                    window.subsCollection.load(null, function(){
                                        window.newsCollection.load(null, function(){
                                            self.initialized = true;
                                            self.trigger('initialized');
                                        });
                                    });
                                }
                                if(window.account) {
                                    window.account.on('loggedIn', function(loginView){
                                        loadCollections();
                                    });
                                }
                                loadCollections();
                            });
                        });
                    });
                //});
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
        render: function() {
            var self = this;
            //this.$el.html('');
            if(!this.initialized) {
                this.on('initialized', function(){
                    self.render();
                });
                return this;
            }
            
            this.$app.append(self.subListView.render().$el);
            this.$app.append(self.listView.render().$el);
            this.$app.append(this.$postViewer);
            this.$el.append(this.$app);
            this.setElement(this.$el);
            return this;
        },
        events: {
            'click a[target="_new"]:not([rel="external"])': "clickExternalLink"
        },
        findSubById: function(id, callback) {
            window.subsCollection.getOrFetch(id, callback);
        },
        findNewsStoryById: function(id, callback) {
            window.newsCollection.getOrFetch(id, callback);
        },
        findSubByUrl: function(id, callback) {
            window.subsCollection.getOrFetchUrl(id, callback);
        },
        userIs: function(userId) {
            return (this.user && this.user.id == userId);
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
            self.trigger('refreshUser', user);
        },
        bindNav: function(nav) {
            this.nav = nav;
            nav.list.on('home', function(){
                nav.router.navigate('', true);
            });
            this.bindRouter(nav.router);
            //nav.col.add({title:"News", navigate:""});
            if(window.account && (account.isUser() || account.isAdmin())) {
                //nav.col.add({title:"Subscribe", navigate:"subscribe"});
                //nav.col.add({title:"Feeds", navigate:"feeds"});
            }
            
            var appsNav = new nav.col.model({
                id: 'AppNav',
                glyphicon: 'list-alt',
                subNav: true
            });
            nav.col.add(appsNav);
            appsNav.subNavCol.add({
                glyphicon: 'list',
                title: "Feed Subscriptions",
                navigate: "feeds"
            });
            appsNav.subNavCol.add({
                glyphicon: 'plus',
                title: "Subscribe to Feed",
                navigate: "subscribe"
            });
            appsNav.subNavCol.list.on('selected', function(navRow) {
            });
        },
        bindRouter: function(router) {
            var self = this;
            var routerReset = function() {
                $('body').attr('class', '');
                router.reset();
            }
            self.router = router;
            router.on('title', function(title){
                $('header .pageTitle.navbar-brand').html(title);
            });
            router.on('reset', function(){
                self.$el.removeAttr('data-nav');
                self.nav.unselect();
            });
            router.on('root', function(){
                self.listView.filter();
                self.listView.$el.show().siblings().hide();
                // self.subListView.$el.show();
                router.setTitle('News');
                $('body')[0].scrollTop = 0;
                self.$newsList.find('.list-filters').html('');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route('for/:userName', 'userNews', function(name){
                routerReset();
                router.setTitle('News for '+name);
                self.nav.selectByNavigate('');
                
                usersCollection.getOrFetchName(name, function(user){
                    if(user) {
                        self.listView.filter(function(model) {
                          if (user.id !== model.get('owner').id) return false;
                          return true;
                        });
                        self.listView.$el.siblings().hide();
                        self.listView.$el.show();
                        router.trigger('loadingComplete');
                    }
                });
            });
            router.route('subs/url/*path', 'subsByUrl', function(path){
                console.log('subs url')
                console.log(path)
                path = decodeURIComponent(path);
                routerReset();
                self.listView.filter({fromUrl: path});
                self.listView.$el.show().siblings().hide();
                //self.subListView.$el.show();
                router.setTitle('News from '+path);
                $('body')[0].scrollTop = 0;
                self.findSubByUrl(path, function(doc){
                    if(doc) {
                        if(doc.has('urlDoc')) {
                            if(doc.get('urlDoc').channel) {
                                self.router.setTitle(doc.get('urlDoc').channel.title);
                            }
                        }
                        //self.$newsList.find('.list-filters').html(doc.getNewAvatar({actions: true}).render().$el);
                    } else {
                        console.log('subscribe to the path instead: '+path);
                        self.subscribeForm = new window.SubsBackbone.Form({
                            collection: window.subsCollection
                        });
                        self.subscribeForm.$inputUrl.val(path);
                        self.subscribeForm.submit();
                        self.subscribeForm.on("saved", function(doc) {
                            //self.subscribeForm.remove();
                            self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
                        });
                        //router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
                self.nav.selectByNavigate('news');
            });
            router.route('feeds', 'feeds', function(){
                routerReset();
                //self.listView.filter({fromUrl: path});
                self.subListView.$el.show().siblings().hide();
                self.$el.attr('data-nav', 'feeds')
                self.subListView.$el.show();
                router.setTitle('News Feeds');
                $('body')[0].scrollTop = 0;
                self.nav.selectByNavigate('feeds');
            });
            router.route('anews/:id', 'newsStory', function(id){
                routerReset();
                self.$newsViewer.siblings().hide();
                self.$newsViewer.show();
                self.findNewsStoryById(id, function(doc){
                    if(doc) {
                        if(doc.has('title')) {
                            self.router.setTitle(doc.get('title'));
                        }
                        self.$newsViewer.append(doc.getFullView({list: self.listView}).render().$el);
                    } else {
                        router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('subscribe', 'subscribe', function(){
                routerReset();
                self.subscribeForm = new window.SubsBackbone.Form({
                    collection: window.subsCollection
                });
                self.subscribeForm.on("saved", function(doc) {
                    self.subscribeForm.remove();
                    self.subModal.remove();
                    self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
                    
                });
                var $form = self.subscribeForm.render().$el;
                $form.show();
                //self.$el.append($form);
                
                self.subModal = utils.appendLightBox($form, 'Subscribe to a feed:');
                
                self.subModal.$el.on('hide.bs.modal', function () {
                    self.subscribeForm.remove();
                    self.subModal.remove();
                    self.router.back();
                });
                router.setTitle('Subscribe to a News Feed');
                self.subscribeForm.focus();
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('subscribe');
            });
        },
        clickExternalLink: function(e) {
            //var origEl = e.srcElement || e.originalTarget;
            //var destUrl = $(origEl).attr('href');
            var destUrl = $(e.currentTarget).attr('href');
            var msg = 'EXIT ' + window.location.href + ' TO ' + destUrl;
            //'EXIT '+window.location.toString()+' TO '+url
            if (window.ActionsBackbone) {
                var action = new ActionsBackbone.Model({});
                action.set({
                    a: msg
                }, {
                    silent: true
                });
                action.save();
            } else {
                require(['/analytics/backbone-actions.js'], function(ActionsBackbone) {
                    window.ActionsBackbone = ActionsBackbone;
                    var action = new ActionsBackbone.Model({});
                    action.set({
                        a: msg
                    }, {
                        silent: true
                    });
                    action.save();
                    setTimeout(function() {
                        window.location = destUrl;
                    }, 100);
                });
                return false;
            }
        }
    });
    
    
    if(define) {
        define(function () {
            return AppView;
        });
    }
    
})();
