(function() {
    var BackgroundView = Backbone.View.extend({
        tagName: 'wallpaper',
        initialize: function() {
            var self = this;
            this.collection.on('selected', function(paper){
                console.log(paper)
                self.selectedPaper = paper;
                self.render();
            });
            self.useCollectionShuffled(this.collection);
            self.selectedPaper = this.stack.shift();
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.css('background', '');
            this.$el.css('position', 'fixed');
            this.$el.css('top', '0px');
            this.$el.css('bottom', '0px');
            this.$el.css('left', '0px');
            this.$el.css('right', '0px');
            
            if(this.selectedPaper) {
                if(this.selectedPaper.has('image')) {
                    var filename = this.selectedPaper.get('image').filename;
                    this.$el.css('background-size', '100%');
                    this.$el.css('background', 'url("/api/files/'+filename+'") center center');
                }
                if(this.selectedPaper.has('css')) {
                    this.$el.append('<style>wallpaper{ '+this.selectedPaper.get('css')+' }</style>');
                }
                if(this.selectedPaper.has('script')) {
                    setTimeout(function(){
                        eval(self.selectedPaper.get('script'));
                    }, 200);
                }
            }
            
            this.setElement(this.$el);
            return this;
        },
        useCollectionShuffled: function(col) {
            this.stack = _.clone(col.shuffle());
        },
        transition: function() {
            var self = this;
            self.stack.push(self.selectedPaper);
            self.selectedPaper = self.stack.shift();
            self.render();
        },
        transitionEvery: function(ms) {
            var self = this;
            setTimeout(function(){
                self.transition();
                self.transitionEvery(ms);
            }, ms);
        },
        events: {
        }
    });
    var WallpaperApp = Backbone.View.extend({
        initialize: function() {
            var self = this;
            require(['/wallpaper/backbone-wallpaper.js'], function(WallpaperBackbone){
                self.WallpaperBackbone = WallpaperBackbone;
                self.collection = window.wallpaperCollection = new self.WallpaperBackbone.Collection(); // collection
                self.collection.load(null, function(){
                    self.initialized = true;
                    self.trigger('initialized');
                });
                if(window.hasOwnProperty('account')) {
                    window.account.on('loggedIn', function(loginView){
                        console.log('refresh collection');
                        self.collection.load(null, function(){
                            if(self.backgroundView) {
                                self.backgroundView.useCollectionShuffled(self.collection);
                                self.backgroundView.transition();
                            }
                        });
                    });
                }
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
            this.initedFiles = false;
        },
        initFiles: function(callback) {
            var self = this;
            if(self.initedFiles) return;
            require(['../files/files.js'], function(FilesBackbone){
                self.FilesBackbone = FilesBackbone;
                this.$filesList = $('<div id="files-list" class="import"></div>');
                self.filesCollection = new self.FilesBackbone.Collection();
                self.filesList = new self.FilesBackbone.List({collection: self.filesCollection});
                self.initedFiles = true;
                if(callback) callback();
            });
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
            nav.col.add({title:"Wallpaper", navigate:""});
            nav.col.add({title:"New Paper", navigate:"new"});
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.on('reset', function(){
                self.collection.getView().$el.hide();
                self.nav.unselect();
            });
            router.on('root', function(){
                router.setTitle('Wallpaper');
                self.collection.getView().$el.show();
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route('paper/:id', 'paper', function(id){
                router.reset();
                self.findDocById(id, function(doc){
                    if(doc) {
                        self.$wallpaperViewer.append(doc.getFullView().render().$el);
                    } else {
                        console.log(id);
                        router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('new', 'new', function(){
                self.initFiles();
                
                var form = new self.WallpaperBackbone.Form({
                    collection: self.collection
                });
                form.on("saved", function(doc) {
                    $light.trigger("close");
                });
                var $light = utils.appendLightBox(form.render().$el);
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
        getBackgroundView: function() {
            if(!this.hasOwnProperty('backgroundView')) {
                this.backgroundView = new BackgroundView({collection: this.collection});
            }
            return this.backgroundView;
        },
        render: function() {
            
        }
    });
    
    var app = new WallpaperApp();
    
    if(define) {
        define(function () {
            return app;
        });
    }
})();
