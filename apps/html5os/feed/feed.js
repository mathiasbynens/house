(function() {
    var pageSize = 10;

    var FeedView = Backbone.View.extend({
        tagName: 'body',
        className: 'feed',
        initialize: function() {
            var self = this;
            this.$app = $('<div class="app"></div>');
            self.editForms = {};
            require(['/desktop/js/masonry.pkgd.min.js'], function(Masonry){
                window.Masonry = Masonry;
                require(['/files/backbone-files.js'], function(FilesBackbone){
                    window.FilesBackbone = FilesBackbone;
                    require(['/images/backbone-images.js'], function(ImagesBackbone){
                        window.ImagesBackbone = ImagesBackbone;
                        require(['/checkins/backbone-checkins.js'], function(CheckinsBackbone){
                            window.CheckinsBackbone = CheckinsBackbone;
                            require(['/urls/backbone-urls.js'], function(UrlsBackbone){
                                window.UrlsBackbone = UrlsBackbone;
                                require(['/posts/backbone-posts.js'], function(PostsBackbone){
                                    window.PostsBackbone = PostsBackbone;
                                    require(['/feed/backbone-feed.js'], function(ModelBackbone){
                                        self.FeedBackbone = ModelBackbone;
                                        self.$feedList = $('<div class="feed-list"></div>');
                                        self.$feedViewer = $('<div class="feed-item-viewer"></div>');
                                        window.feedCollection = new ModelBackbone.Collection(); // collection
                                        window.feedCollection.pageSize = pageSize;
                                        self.listView = new ModelBackbone.List({el: self.$feedList, collection: window.feedCollection});
                                        self.listView.on('select', function(row) {
                                            self.router.navigate(row.model.getNavigatePath(), true);
                                        });
                                        self.listView.on('goToProfile', function(user){
                                            self.router.navigate('by/'+user.get('name'), true);
                                        });
                                        
                                        window.feedCollection.on('editModel', function(model) {
                                            self.router.navigate(model.getNavigatePath()+'/edit', true);
                                        });
                                        
                                        var loadCollections = function() {
                                            // window.feedCollection.load(null, function(){
                                                self.initialized = true;
                                                self.trigger('initialized');
                                            // });
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
        // initCarousel: function() {
        //     var self = this;
        //     if(!self.hasOwnProperty('carousel')) {
        //         self.carousel = new SwipeView(self.$feedViewer[0], {
        //             numberOfPages: window.feedCollection.count,
        //             hastyPageFlip: true
        //         });
                
        //         self.carousel.onFlip(function () {
        //             var el;
        //             var upcoming;
        //         	var i;
        //             var id = self.carousel.masterPages[self.carousel.currentMasterPage].dataset.id;
        //             var doc = window.feedCollection.get(id);
        //             if(!doc) return;
        //             if(doc.has('title')) {
        //                 self.router.setTitle(doc.get('title'));
        //             }
        //             self.router.navigate(doc.getNavigatePath(), {trigger: false, replace: false});
        //             var docNext = doc.next();
        //             var docPrev = doc.prev();
        //         	for (i=0; i<3; i++) {
        //         		upcoming = self.carousel.masterPages[i].dataset.upcomingPageIndex;
        //         		if (upcoming != self.carousel.masterPages[i].dataset.pageIndex) {
        //         			el = self.carousel.masterPages[i];
        //                     if(self.carousel.directionX > 0) {
        //                         if(docPrev) {
        //                             self.carouselPageRender(el, docPrev);
        //                         }
        //                     } else {
        //                         if(docNext) {
        //                             self.carouselPageRender(el, docNext);
        //                         }
        //                     }
        //         		}
        //         	}
        //         });
                
        //     }
        // },
        render: function() {
            var self = this;
            this.$el.append(this.$app);
            this.setElement(this.$el);
            if(!this.initialized) {
                this.on('initialized', function(){
                    self.render();
                });
                return this;
            }
            this.$app.append(self.listView.render().$el);
            this.$app.append(this.$feedViewer);
            return this;
        },
        events: {
        },
        carouselPageRender: function(page, doc) {
            page.innerHTML = '';
            page.dataset.id = doc.id;
            page.appendChild(doc.getFullView({list: self.listView}).render().$el[0]);
            page.scrollTop = 0;
        },
        carouselDoc: function(doc) {
            console.log('c');
            var self = this;
            if(doc.has('title')) {
                self.router.setTitle(doc.get('title'));
            }
            // self.initCarousel();
            var docEl = doc.getFullView({list: self.listView}).render().$el;
            var foundDoc = false;
            // self.carousel.masterPages.forEach(function(e,i){
            //     console.log(e.dataset.id);
            //     console.log(doc.id);
            //     if(e.dataset.id == doc.id) {
            //         console.log(e);
            //         foundDoc = i;
            //     }
            // });
            // console.log(self.carousel.currentMasterPage);
            // if(foundDoc !== false) {
            //     console.log(foundDoc);
            //     if(self.carousel.currentMasterPage > foundDoc) {
            //         if(self.carousel.currentMasterPage - foundDoc > 1) {
            //             self.carousel.next();
            //         } else {
            //             self.carousel.prev();
            //         }
            //     } else if(self.carousel.currentMasterPage < foundDoc) {
            //         if(foundDoc - self.carousel.currentMasterPage > 1) {
            //             self.carousel.prev();
            //         } else {
            //             self.carousel.next();
            //         }
            //     }
            //     return;
            // }
            
            // var currentPageNum = self.carousel.currentMasterPage;
            // var nextPageNum = currentPageNum + 1;
            // var prevPageNum = currentPageNum - 1;
            // var maxPageNum = self.carousel.masterPages.length - 1;
            // if(nextPageNum > maxPageNum) {
            //     nextPageNum = 0;
            // } else if(prevPageNum < 0) {
            //     prevPageNum = maxPageNum;
            // }
            // var renderSiblings = function() {
            //     var docNext = doc.next();
            //     var docPrev = doc.prev();
            //     var pageNext = self.carousel.masterPages[nextPageNum];
            //     var pagePrev = self.carousel.masterPages[prevPageNum];
            //     if(docNext) {
            //         self.carouselPageRender(pageNext, docNext);
            //     }
            //     if(docPrev) {
            //         self.carouselPageRender(pagePrev, docPrev);
            //     }
            // }
            // var currentPage = self.carousel.masterPages[currentPageNum];
            // self.carouselPageRender(currentPage, doc);
            // renderSiblings();
        },
        editDoc: function(doc) {
            var self = this;
            var $form;
            if(!doc) {
                self.newForm = new self.FeedBackbone.Form({
                    collection: window.feedCollection
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
                    self.editForms[doc.id] = new self.FeedBackbone.Form({
                        collection: window.feedCollection,
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
        findFeedById: function(id, callback) {
            window.feedCollection.getOrFetch(id, callback);
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
            // nav.col.add({title:"Feed", navigate:""});
            if(window.account && (account.isUser() || account.isAdmin())) {
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
                self.nav.unselect();
            });
            router.on('root', function(){
                self.listView.filter();
                self.listView.$el.siblings().hide();
                self.listView.$el.show();
                router.setTitle('Feed');
                self.nav.selectByNavigate('');
                
                
                window.feedCollection.load(null, function(){
                    router.trigger('loadingComplete');
                });
            });
            router.route('by/:userName', 'userFeeds', function(name){
                routerReset();
                router.setTitle('Feed by '+name);
                self.nav.selectByNavigate('');
                
                usersCollection.getByName(name, function(user){
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
            router.route('item/:id', 'item', function(id){
                // self.$feedViewer.siblings().hide();
                // self.$feedViewer.show();
                // console.log(arguments);
                router.reset();
                self.findFeedById(id, function(doc){
                //     console.log(arguments);
                    if(doc) {
                        // self.carouselDoc(doc);
                        var refModel = doc.getRefModel();
                        if(refModel) {
                            var feedItemUrl = refModel.getNavigatePath();
                            var w = window.open('/'+doc.getRefCol()+'/'+feedItemUrl);
                        }
                    } else {
                        // router.navigate('', {replace: true, trigger: true});
                    }
                //     router.trigger('loadingComplete');
                });
            });
        }
    });
    
    if(define) {
        define(function () {
            return FeedView;
        });
    }
    
})();
