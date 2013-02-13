(function() {
    var pageSize = 24;

    var PostsView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            self.editForms = {};
            require(['../desktop/swipeview.js'], function(){
                require(['backbone-posts.js'], function(ModelBackbone){
                    window.PostsBackbone = ModelBackbone;
                    window.postsCollection = new ModelBackbone.Collection(); // collection
                    require(['/files/backbone-files.js'], function(FilesBackbone){
                        window.FilesBackbone = FilesBackbone;
                        window.filesCollection = new FilesBackbone.Collection(); // collection
                
                        self.$postList = $('<div class="post-list"></div>');
                        self.$postViewer = $('<div class="post-viewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
                        window.postsCollection.pageSize = pageSize;
                        self.listView = new ModelBackbone.List({el: self.$postList, collection: window.postsCollection});
                        self.listView.on('select', function(row) {
                            self.router.navigate(row.model.getNavigatePath(), true);
                        });
                        self.listView.on('goToProfile', function(user){
                            self.router.navigate('by/'+user.get('name'), true);
                        });
                        
                        window.postsCollection.on('editModel', function(model) {
                            self.router.navigate(model.getNavigatePath()+'/edit', true);
                        });
                        
                        var loadCollections = function() {
                            window.postsCollection.load(null, function(){
                                self.initialized = true;
                                self.trigger('initialized');
                            });
                        }
                        if(window.hasOwnProperty('account')) {
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
        initCarousel: function() {
            var self = this;
            if(!self.hasOwnProperty('carousel')) {
                self.carousel = new SwipeView(self.$postViewer[0], {
                    numberOfPages: window.postsCollection.count,
                    hastyPageFlip: true
                });
                
                self.carousel.onFlip(function () {
                    var el;
                    var upcoming;
                	var i;
                    var id = self.carousel.masterPages[self.carousel.currentMasterPage].dataset.id;
                    var doc = window.postsCollection.get(id);
                    if(doc.has('title')) {
                        self.router.setTitle(doc.get('title'));
                    }
                    if(doc.has('slug')) {
                        self.router.navigate(doc.get('slug'), {trigger: false, replace: false});
                    } else {
                        self.router.navigate('post/'+doc.get('id'), {trigger: false, replace: false});
                    }
                    var docNext = doc.next();
                    var docPrev = doc.prev();
                	for (i=0; i<3; i++) {
                		upcoming = self.carousel.masterPages[i].dataset.upcomingPageIndex;
                		if (upcoming != self.carousel.masterPages[i].dataset.pageIndex) {
                			el = self.carousel.masterPages[i];
                            if(self.carousel.directionX > 0) {
                                if(docPrev) {
                                    self.carouselPageRender(el, docPrev);
                                }
                            } else {
                                if(docNext) {
                                    self.carouselPageRender(el, docNext);
                                }
                            }
                		}
                	}
                });
                
            }
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
            "click .carousel-control.left": "carouselPrev",
            "click .carousel-control.right": "carouselNext",
        },
        carouselPrev: function() {
            this.carousel.prev();
            return false;
        },
        carouselNext: function() {
            this.carousel.next();
            return false;
        },
        carouselPageRender: function(page, doc) {
            page.innerHTML = '';
            page.dataset.id = doc.id;
            page.appendChild(doc.getFullView({list: self.listView}).render().$el[0]);
            page.scrollTop = 0;
        },
        carouselDoc: function(doc) {
            var self = this;
            if(doc.has('title')) {
                self.router.setTitle(doc.get('title'));
            }
            self.initCarousel();
            var docEl = doc.getFullView({list: self.listView}).render().$el;
            var foundDoc = false;
            self.carousel.masterPages.forEach(function(e,i){
                console.log(e.dataset.id);
                console.log(doc.id);
                if(e.dataset.id == doc.id) {
                    console.log(e);
                    foundDoc = i;
                }
            });
            console.log(self.carousel.currentMasterPage);
            if(foundDoc !== false) {
                console.log(foundDoc);
                if(self.carousel.currentMasterPage > foundDoc) {
                    if(self.carousel.currentMasterPage - foundDoc > 1) {
                        self.carousel.next();
                    } else {
                        self.carousel.prev();
                    }
                } else if(self.carousel.currentMasterPage < foundDoc) {
                    if(foundDoc - self.carousel.currentMasterPage > 1) {
                        self.carousel.prev();
                    } else {
                        self.carousel.next();
                    }
                }
                return;
            }
            
            var currentPageNum = self.carousel.currentMasterPage;
            var nextPageNum = currentPageNum + 1;
            var prevPageNum = currentPageNum - 1;
            var maxPageNum = self.carousel.masterPages.length - 1;
            if(nextPageNum > maxPageNum) {
                nextPageNum = 0;
            } else if(prevPageNum < 0) {
                prevPageNum = maxPageNum;
            }
            var renderSiblings = function() {
                var docNext = doc.next();
                var docPrev = doc.prev();
                var pageNext = self.carousel.masterPages[nextPageNum];
                var pagePrev = self.carousel.masterPages[prevPageNum];
                if(docNext) {
                    self.carouselPageRender(pageNext, docNext);
                }
                if(docPrev) {
                    self.carouselPageRender(pagePrev, docPrev);
                }
            }
            var currentPage = self.carousel.masterPages[currentPageNum];
            self.carouselPageRender(currentPage, doc);
            renderSiblings();
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
            this.bindRouter(nav.router);
            nav.col.add({title:"Posts", navigate:""});
            if(window.account && (account.isUser() || account.isAdmin())) {
                nav.col.add({title:"New post", navigate:"new"});
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
                var $e = $('header h1');
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
                $('header').removeAttr('class');
                self.nav.unselect();
            });
            router.on('root', function(){
                self.listView.filter();
                self.listView.$el.siblings().hide();
                self.listView.$el.show();
                router.setTitle('Posts');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route(':slug/edit', 'editSlug', function(slug){
                routerReset();
                $('header').addClass('hideTitle');
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
            router.route('post/:id', 'post', function(id){
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
                $('header').addClass('hideTitle');
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
