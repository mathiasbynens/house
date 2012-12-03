(function() {
    var BackgroundView = Backbone.View.extend({
        tagName: 'wallpaper',
        initialize: function() {
            
        },
        render: function() {
            var r = _.first(this.collection.shuffle());
            
            this.$el.html('');
            this.$el.css('position', 'fixed');
            this.$el.css('top', '0px');
            this.$el.css('bottom', '0px');
            this.$el.css('left', '0px');
            this.$el.css('right', '0px');
            
            if(r) {
                if(r.has('image')) {
                    var filename = r.get('image').filename;
                    this.$el.css('background-size', '100%');
                    this.$el.css('background', 'url("/api/files/'+filename+'") center center');
                }
                if(r.has('css')) {
                    this.$el.append('<style>wallpaper{ '+r.get('css')+' }</style>');
                }
                if(r.has('script')) {
                    setTimeout(function(){
                        eval(r.get('script'));
                    }, 200);
                }
            }
            
            this.setElement(this.$el);
            return this;
        },
        events: {
        }
    });
    var WallpaperApp = Backbone.View.extend({
        initialize: function() {
            var self = this;
            require(['/wallpaper/backbone-wallpaper.js'], function(WallpaperBackbone){
                self.WallpaperBackbone = WallpaperBackbone;
                self.wallpaperCollection = window.wallpaperCollection = new self.WallpaperBackbone.Collection(); // collection
                self.wallpaperCollection.load(null, function(){
                    self.initialized = true;
                    self.trigger('initialized');
                });
                self.wallpaperListView = new self.WallpaperBackbone.List({collection: this.wallpaperCollection});
                self.wallpaperListView.on('select', function(row) {
                    self.router.navigate('wallpaper/'+row.model.get('id'), true);
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
            nav.col.add({title:"Add Paper", navigate:"import"});
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.on('reset', function(){
                self.wallpaperListView.$el.hide();
                self.nav.unselect();
            });
            router.on('root', function(){
                router.setTitle('Wallpaper');
                self.wallpaperListView.render().$el.show();
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
            router.route('import', 'import', function(){
                self.initFiles();
                
                var form = new self.WallpaperBackbone.Form({
                    collection: self.wallpaperCollection
                });
                form.on("saved", function(doc) {
                });
                var $light = utils.appendLightBox(form.render().$el);
                $light.on("close", function() {
                    if (history) {
                        history.back();
                    }
                });
                router.reset();
                router.setTitle('Import');
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('import');
            });
        },
        getBackgroundView: function() {
            if(!this.hasOwnProperty('backgroundView')) {
                this.backgroundView = new BackgroundView({collection: this.wallpaperCollection});
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
