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
    var UrlsApp = Backbone.View.extend({
        initialize: function() {
            var self = this;
            
            require(['../files/backbone-files.js'], function(FilesBackbone){
                window.FilesBackbone = FilesBackbone;
                require(['../images/backbone-images.js'], function(ImagesBackbone){
                    window.ImagesBackbone = ImagesBackbone;
                    require(['../urls/backbone-urls.js'], function(UrlsBackbone){
                        window.UrlsBackbone = UrlsBackbone;
                        
                        self.collection = window.urlsCollection = new UrlsBackbone.Collection(); // collection
                        self.collection.load(null, function(){
                            self.initialized = true;
                            self.trigger('initialized');
                        });
                        if(window.hasOwnProperty('account')) {
                            window.account.on('loggedIn', function(loginView){
                                console.log('refresh collection');
                                self.collection.load(null, function(){
                                });
                            });
                        }
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
            nav.col.add({title:"URLs", navigate:""});
            nav.col.add({title:"New URL", navigate:"new"});
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.on('reset', function(){
                self.collection.getView().$el.hide();
                self.nav.unselect();
            });
            router.on('root', function(){
                router.setTitle('URLs');
                self.collection.getView().$el.show();
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route('url/:id', 'url', function(id){
                router.reset();
                self.findDocById(id, function(doc){
                    if(doc) {
                        self.$urlViewer.append(doc.getFullView().render().$el);
                    } else {
                        console.log(id);
                        router.navigate('', {replace: true, trigger: true});
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
        render: function() {
            
        }
    });
    
    var app = new UrlsApp();
    
    if(define) {
        define(function () {
            return app;
        });
    }
})();
