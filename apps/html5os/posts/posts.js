(function() {
    var pageSize = 24;

    var PostsView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            self.editForms = {};
            require(['/desktop/swipeview.js'], function(){
                require(['/posts/backbone-posts.js'], function(ModelBackbone){
                    window.PostsBackbone = ModelBackbone;
                    window.postsCollection = new ModelBackbone.Collection(); // collection
                    require(['/files/backbone-files.js'], function(FilesBackbone){
                        window.FilesBackbone = FilesBackbone;
                        window.filesCollection = new FilesBackbone.Collection(); // collection
                
                        self.$postList = $('<div class="post-list"></div>');
                        self.$postViewer = $('<div class="post-viewer"></div>');
                        window.postsCollection.pageSize = pageSize;
                        self.listView = new ModelBackbone.List({el: self.$postList, collection: window.postsCollection});
                        self.listView.on('select', function(row) {
                            self.router.navigate(row.model.getNavigatePath(), {trigger: true});
                        });
                        self.listView.on('goToAuthor', function(user){
                            self.router.navigate('by/'+user.get('name'), {trigger: true});
                        });
                        self.listView.on('goToTag', function(tagName){
                            self.router.navigate('tag/'+tagName, {trigger: true});
                        });
                        
                        window.postsCollection.on('editModel', function(model) {
                            self.router.navigate(model.getNavigatePath()+'/edit', {trigger: true});
                        });
                        
                        var loadCollections = function() {
                            window.postsCollection.load(null, function(){
                                self.initialized = true;
                                self.trigger('initialized');
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
            this.$el.append(self.listView.render().$el);
            this.$el.append(this.$postViewer);
            return this;
        },
        events: {
        },
        carouselDoc: function(doc) {
            var self = this;
            if(doc.has('title')) {
                self.router.setTitle(doc.get('title'));
            }
            var $el = doc.getFullView({list: self.listView}).render().$el;
            self.$postViewer.append($el);
            $el.siblings().remove();
            $('body')[0].scrollTop = 0;
        },
        editDoc: function(doc) {
            var self = this;
            var $form;
            if(!doc) {
                self.newForm = new window.PostsBackbone.Form({
                    collection: window.postsCollection
                });
                self.newForm.on("saved", function(doc) {
                    self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
                });
                self.newForm.on("title", function(title) {
                    self.router.setTitle(title);
                });
                $form = self.newForm.render().$el;
                $form.show();
                self.$el.append($form);
                self.newForm.wysiEditor();
                $form.siblings().hide();
                self.newForm.focus();
            } else {
                if(!self.editForms.hasOwnProperty(doc.id)) {
                    self.editForms[doc.id] = new window.PostsBackbone.Form({
                        collection: window.postsCollection,
                        model: doc
                    });
                    if(doc.has('title')) {
                        self.router.setTitle(doc.get('title'));
                    }
                    self.editForms[doc.id].on("saved", function(doc) {
                        self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
                    });
                    self.editForms[doc.id].on("title", function(title) {
                        self.router.setTitle(title);
                    });
                    $form = self.editForms[doc.id].render().$el;
                    $form.show();
                    self.$el.append($form);
                    self.editForms[doc.id].wysiEditor();
                } else {
                    $form = self.editForms[doc.id].render().$el;
                    $form.show();
                    //self.$el.append($form);
                }
                $form.siblings().hide();
                self.editForms[doc.id].focus();
            }
        },
        findPostById: function(id, callback) {
            window.postsCollection.getOrFetch(id, callback);
        },
        findPostBySlug: function(slug, callback) {
            window.postsCollection.getOrFetchSlug(slug, callback);
        },
        findPostBySeq: function(seq, callback) {
            window.postsCollection.getOrFetchSeq(seq, callback);
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
            //nav.col.add({title:"Posts", navigate:""});
            nav.col.add({title:"New post", navigate:"new", renderCondition: "isAdmin"});
        },
        bindRouter: function(router) {
            var self = this;
            var routerReset = function() {
                $('body').attr('class', '');
                router.reset();
            }
            self.router = router;
            router.on('title', function(title){
                var $e = $('.pageTitle');
                $e.attr('href', window.location);
                $e.html(title);
            });
            router.on('reset', function(){
                //$('#header').removeAttr('class');
                self.nav.unselect();
            });
            router.on('root', function(){
                self.listView.filter();
                self.listView.$el.siblings().hide();
                self.listView.$el.show();
                
                if(self.listView.selectedPost) {
                    // console.log(self.listView.selectedPost.$el);
                    $('body').scrollTo(self.listView.selectedPost.$el);
                }
                
                router.setTitle('Posts');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route(':slug/edit', 'editSlug', function(slug){
                console.log('edit via slug')
                routerReset();
                $('#header').addClass('hideTitle');
                self.findPostBySlug(slug, function(doc){
                    if(doc) {
                        self.editDoc(doc);
                    } else {
                        router.navigate('new', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route(':slug', 'postSlug', function(slug){
                routerReset();
                self.$postViewer.siblings().hide();
                self.$postViewer.show();
                self.findPostBySlug(slug, function(doc){
                    if(doc) {
                        self.carouselDoc(doc);
                    } else {
                        router.navigate('new', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('seq/:num', 'seqNum', function(num){
                routerReset();
                num = parseInt(num, 10);
                self.findPostBySeq(num, function(doc){
                    if(doc) {
                        router.navigate('posts/'+doc.getNavigatePath(), {replace: true, trigger: true});
                    } else {
                        router.navigate('posts/', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('by/:userName', 'userPosts', function(name){
                routerReset();
                router.setTitle('Posts by '+name);
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
            router.route('tag/:tagName', 'tagPosts', function(tagName){
                routerReset();
                router.setTitle('Posts tagged '+tagName);
                self.nav.selectByNavigate('');
                self.listView.filter(function(model) {
                    if(model.has('tags') && model.get('tags').indexOf(tagName) !== -1) {
                        return true;
                    } else {
                        return false;
                    }
                });
                self.listView.$el.siblings().hide();
                self.listView.$el.show();
                router.trigger('loadingComplete');
            });
            router.route('id/:id/edit', 'editPost', function(id){
                routerReset();
                $('#header').addClass('hideTitle');
                self.findPostById(id, function(doc){
                    if(doc) {
                        self.editDoc(doc);
                    } else {
                        router.navigate('new', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('id/:id', 'post', function(id){
                routerReset();
                self.$postViewer.siblings().hide();
                self.$postViewer.show();
                self.findPostById(id, function(doc){
                    if(doc) {
                        if(doc.has('slug')) {
                            router.navigate(doc.get('slug'), {trigger: false, replace: true});
                        }
                        self.carouselDoc(doc);
                    } else {
                        console.log(id);
                        router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('new', 'new', function(){
                routerReset();
                $('#header').addClass('hideTitle');
                self.editDoc();
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('new');
            });
        }
    });
    
    
    if(define) {
        define(function () {
            return PostsView;
        });
    }
    
})();
