(function() {
    var pageSize = 24;

    var CheckinsView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            self.editForms = {};
            require(['../desktop/swipeview.js'], function(){
                require(['../images/backbone-images.js'], function(ImagesBackbone){
                    window.ImagesBackbone = ImagesBackbone;
                    require(['backbone-checkins.js'], function(ModelBackbone){
                        window.CheckinsBackbone = ModelBackbone;
                        self.$checkinList = $('<div class="checkin-list"></div>');
                        self.$checkinViewer = $('<div class="checkin-viewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
                        self.checkinsCollection = window.checkinsCollection = new ModelBackbone.Collection(); // collection
                        self.checkinsCollection.pageSize = pageSize;
                        self.listView = new ModelBackbone.List({el: self.$checkinList, collection: self.checkinsCollection});
                        self.listView.on('select', function(row) {
                            self.router.navigate(row.model.getNavigatePath(), true);
                        });
                        self.listView.on('goToProfile', function(user){
                            self.router.navigate('by/'+user.get('name'), true);
                        });
                        
                        self.checkinsCollection.on('editModel', function(model) {
                            self.router.navigate(model.getNavigatePath()+'/edit', true);
                        });
                        
                        var loadCollections = function() {
                            self.checkinsCollection.load(null, function(){
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
        initCarousel: function() {
            var self = this;
            if(!self.hasOwnProperty('carousel')) {
                self.carousel = new SwipeView(self.$checkinViewer[0], {
                    numberOfPages: self.checkinsCollection.count,
                    hastyPageFlip: true
                });
                
                self.carousel.onFlip(function () {
                    var el;
                    var upcoming;
                	var i;
                    var id = self.carousel.masterPages[self.carousel.currentMasterPage].dataset.id;
                    var doc = self.checkinsCollection.get(id);
                    self.router.navigate('checkin/'+doc.get('id'), {trigger: false, replace: false});
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
            this.$el.append(this.$checkinViewer);
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
                self.newForm = new CheckinsBackbone.Form({
                    collection: self.checkinsCollection
                });
                self.newForm.on("saved", function(doc) {
                    self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
                });
                $form = self.newForm.render().$el;
                $form.show();
                self.$el.append($form);
                $form.siblings().hide();
                self.newForm.focus();
            } else {
                if(!self.editForms.hasOwnProperty(doc.id)) {
                    self.editForms[doc.id] = new self.CheckinsBackbone.Form({
                        collection: self.checkinsCollection,
                        model: doc
                    });
                    self.editForms[doc.id].on("saved", function(doc) {
                        self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
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
        findCheckinById: function(id, callback) {
            this.checkinsCollection.getOrFetch(id, callback);
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
            nav.col.add({title:"Checkins", navigate:""});
            if(window.account && (account.isUser() || account.isAdmin())) {
                nav.col.add({title:"Checkin here", navigate:"here"});
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
                router.setTitle('Checkins');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route('/checkin/:id/edit', 'editSlug', function(slug){
                routerReset();
                self.findCheckinBySlug(slug, function(doc){
                    if(doc) {
                        self.editDoc(doc);
                    } else {
                        router.navigate('here', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('by/:userName', 'userCheckins', function(name){
                routerReset();
                router.setTitle('Checkins by '+name);
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
            router.route('checkin/:id', 'checkin', function(id){
                routerReset();
                self.$checkinViewer.siblings().hide();
                self.$checkinViewer.show();
                self.findCheckinById(id, function(doc){
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
            router.route('here', 'here', function(){
                routerReset();
                router.setTitle('Checkin Here');
                self.editDoc();
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('here');
            });
        }
    });

    if(define) {
        define(function () {
            return CheckinsView;
        });
    }
})();
