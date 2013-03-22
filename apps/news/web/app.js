(function() {
    var pageSize = 24;

    var AppView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            self.editForms = {};
            require(['/desktop/jquery.scrollTo.min.js'], function(){
                //require(['articles.js'], function(ModelBackbone){
                    //window.ArticlesBackbone = ModelBackbone;
                    //window.articlesCollection = new ModelBackbone.Collection(); // collection
                    require(['news.js'], function(ModelBackbone){
                        window.NewsBackbone = ModelBackbone;
                        window.newsCollection = new ModelBackbone.Collection(); // collection
                        require(['subs.js'], function(ModelBackbone){
                            window.SubsBackbone = ModelBackbone;
                            window.subsCollection = new ModelBackbone.Collection(); // collection
                            require(['/files/backbone-files.js'], function(FilesBackbone){
                                window.FilesBackbone = FilesBackbone;
                                window.filesCollection = new FilesBackbone.Collection(); // collection
                                
                                self.$subsList = $('<div class="subs-list"></div>');
                                self.$subsViewer = $('<div class="subs-viewer"></div>');
                                self.$newsList = $('<div class="news-list"></div>');
                                self.$newsViewer = $('<div class="news-viewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
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
                                    self.router.navigate(row.model.getNavigatePath(), true);
                                });
                                self.listView.on('goToProfile', function(user){
                                    self.router.navigate('from/'+user.get('name'), true);
                                });
                                
                                self.subListView = new window.SubsBackbone.List({el: self.$subsList, collection: window.subsCollection});
                                self.subListView.on('select', function(row) {
                                    self.router.navigate(row.model.getNavigatePath(), true);
                                });
                                self.subListView.on('deselect', function(row) {
                                    self.router.navigate('/', true);
                                });
                                self.subListView.on('goToProfile', function(user){
                                    self.router.navigate('from/'+user.get('name'), true);
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
            this.$el.html('');
            this.setElement(this.$el);
            if(!this.initialized) {
                this.on('initialized', function(){
                    self.render();
                });
                return this;
            }
            this.$el.append('<button class="subscriptions">Subscriptions</button><button class="addSubscription">+</button>');
            this.$el.append(self.subListView.render().$el);
            this.$el.append(self.listView.render().$el);
            this.$el.append(this.$postViewer);
            return this;
        },
        events: {
            "click .subscriptions": "subscriptions",
            "click .addSubscription": "addSubscription"
        },
        addSubscription: function() {
            this.router.navigate('subscribe', true);
            return false;
        },
        subscriptions: function() {
            if(this.$el.attr('data-nav') == 'feeds') {
                this.router.navigate('', true);
            } else if(this.$el.attr('data-nav') == 'feed') {
                this.router.navigate('', true);
            } else {
                this.router.navigate('feeds', true);
            }
            return false;
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
            nav.col.add({title:"News", navigate:""});
            if(window.account && (account.isUser() || account.isAdmin())) {
                nav.col.add({title:"Subscribe", navigate:"subscribe"});
                nav.col.add({title:"Feeds", navigate:"feeds"});
            }
        },
        bindRouter: function(router) {
            var self = this;
            var routerReset = function() {
                $('body').attr('class', '');
                router.reset();
            }
            self.router = router;
            router.on('title', function(title){
                var $e = $('#header h1');
                $e.html(title);
                $e.attr('class', '');
                var eh = $e.height();
                var eph = $e.offsetParent().height();
                if(eh > eph) {
                    var lines = Math.floor(eh/eph);
                    if(lines > 3) {
                        $e.addClass('f'+lines);
                        eh = $e.height();
                        eph = $e.offsetParent().height();
                        if(eh > eph) {
                            lines = Math.floor(eh/eph);
                            $e.addClass('l'+lines);
                        }
                    } else {
                        $e.addClass('l'+lines);
                    }
                }
            });
            router.on('reset', function(){
                $('#header').removeAttr('class');
                self.$el.removeAttr('data-nav');
                self.nav.unselect();
            });
            router.on('root', function(){
                self.listView.filter();
                self.listView.$el.show();
                self.subListView.$el.show();
                router.setTitle('News');
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
                console.log('subs')
                console.log(path)
                path = decodeURIComponent(path);
                routerReset();
                self.listView.filter({fromUrl: path});
                self.listView.$el.show();
                self.subListView.$el.show();
                router.setTitle('News from '+path);
                
                self.findSubByUrl(path, function(doc){
                    if(doc) {
                        if(doc.has('urlDoc')) {
                            if(doc.get('urlDoc').channel) {
                                self.router.setTitle(doc.get('urlDoc').channel.title);
                            }
                        }
                        self.$newsList.find('.list-filters').html(doc.getNewAvatar().render().$el);
                    } else {
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
                //self.listView.$el.show();
                self.$el.attr('data-nav', 'feeds')
                self.subListView.$el.show();
                router.setTitle('Feeds');
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
                    self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
                });
                var $form = self.subscribeForm.render().$el;
                $form.show();
                self.$el.append($form);
                self.subscribeForm.focus();
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('subscribe');
            });
        }
    });
    
    
    if(define) {
        define(function () {
            return AppView;
        });
    }
    
})();
