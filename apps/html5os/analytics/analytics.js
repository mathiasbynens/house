(function() {
    var pageSize = 24;

    var AnalyticsView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            self.editForms = {};
            require(['../desktop/swipeview.js'], function(){
                require(['backbone-sessions.js'], function(SessionsBackbone){
                    window.SessionsBackbone = SessionsBackbone;
                    self.$sessionList = $('<div class="sessions-list"></div>');
                    self.$sessionViewer = $('<div class="sessions-viewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
                    window.sessionsCollection = new SessionsBackbone.Collection(); // collection
                    window.sessionsCollection.pageSize = pageSize;
                    self.sessionsListView = new SessionsBackbone.List({el: self.$sessionList, collection: sessionsCollection});
                    self.sessionsListView.on('select', function(row) {
                        //self.router.navigate(row.model.getNavigatePath(), true);
                        self.actionsListView.filter({s: row.model.get("id")});
                    });
                    self.sessionsListView.on('deselect', function(row) {
                        //self.router.navigate(row.model.getNavigatePath(), true);
                        self.actionsListView.filter();
                    });
                    self.sessionsListView.on('goToProfile', function(user){
                        self.router.navigate('by/'+user.get('name'), true);
                    });
                    sessionsCollection.on('editModel', function(model) {
                        self.router.navigate(model.getNavigatePath()+'/edit', true);
                    });
                    require(['backbone-actions.js'], function(ActionsBackbone){
                        window.ActionsBackbone = ActionsBackbone;
                        self.$actionList = $('<div class="actions-list"></div>');
                        self.$actionViewer = $('<div class="actions-viewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
                        window.actionsCollection = new ActionsBackbone.Collection(); // collection
                        window.actionsCollection.pageSize = pageSize;
                        self.actionsListView = new ActionsBackbone.List({el: self.$actionList, collection: actionsCollection});
                        self.actionsListView.on('select', function(row) {
                            self.router.navigate(row.model.getNavigatePath(), true);
                        });
                        self.actionsListView.on('goToProfile', function(user){
                            self.router.navigate('by/'+user.get('name'), true);
                        });
                        actionsCollection.on('editModel', function(model) {
                            self.router.navigate(model.getNavigatePath()+'/edit', true);
                        });
                        
                        require(['backbone-io.js'], function(IoBackbone){
                            window.IoBackbone = IoBackbone;
                            self.$ioList = $('<div class="io-session-list"></div>');
                            self.$ioViewer = $('<div class="io-session-viewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
                            window.ioCollection = new IoBackbone.Collection(); // collection
                            window.ioCollection.pageSize = pageSize;
                            self.ioListView = new IoBackbone.List({el: self.$ioList, collection: ioCollection});
                            self.ioListView.on('select', function(row) {
                                self.router.navigate(row.model.getNavigatePath(), true);
                            });
                            self.ioListView.on('goToProfile', function(user){
                                self.router.navigate('by/'+user.get('name'), true);
                            });
                            ioCollection.on('editModel', function(model) {
                                self.router.navigate(model.getNavigatePath()+'/edit', true);
                            });
                        
                            if(window.account) {
                                window.account.on('loggedIn', function(loginView){
                                    loadCollections();
                                });
                            }
                            loadCollections();
                        });
                    });
                    
                    var loadCollections = function() {
                        ioCollection.load(null, function(){
                            sessionsCollection.load(null, function(){
                                actionsCollection.load(null, function(){
                                    self.initialized = true;
                                    self.trigger('initialized');
                                });
                            });
                        });
                    }
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
                self.carousel = new SwipeView(self.$sessionViewer[0], {
                    numberOfPages: self.sessionsCollection.count,
                    hastyPageFlip: true
                });
                
                self.carousel.onFlip(function () {
                    var el;
                    var upcoming;
                	var i;
                    var id = self.carousel.masterPages[self.carousel.currentMasterPage].dataset.id;
                    var doc = self.sessionsCollection.get(id);
                    if(doc.has('title')) {
                        self.router.setTitle(doc.get('title'));
                    }
                    if(doc.has('slug')) {
                        self.router.navigate(doc.get('slug'), {trigger: false, replace: false});
                    } else {
                        self.router.navigate('session/'+doc.get('id'), {trigger: false, replace: false});
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
            this.$el.append(self.ioListView.render().$el);
            this.$el.append(self.sessionsListView.render().$el);
            this.$el.append(self.actionsListView.render().$el);
            this.$el.append(this.$ioViewer);
            this.$el.append(this.$sessionViewer);
            this.$el.append(this.$actionViewer);
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
            page.appendChild(doc.getFullView({list: self.sessionsListView}).render().$el[0]);
            page.scrollTop = 0;
        },
        carouselDoc: function(doc) {
            var self = this;
            if(doc.has('title')) {
                self.router.setTitle(doc.get('title'));
            }
            self.initCarousel();
            var docEl = doc.getFullView({list: self.sessionsListView}).render().$el;
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
                self.newForm = new self.SessionsBackbone.Form({
                    collection: self.sessionsCollection
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
                    self.editForms[doc.id] = new self.SessionsBackbone.Form({
                        collection: self.sessionsCollection,
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
        findSessionById: function(id, callback) {
            this.sessionsCollection.getOrFetch(id, callback);
        },
        findActionById: function(id, callback) {
            this.actionsCollection.getOrFetch(id, callback);
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
            if(window.account && (account.isUser() || account.isAdmin())) {
                nav.col.add({title:"Analytics", navigate:""});
                nav.col.add({title:"Live", navigate:"live"});
                nav.col.add({title:"Sessions", navigate:"sessions"});
                nav.col.add({title:"Actions", navigate:"actions"});
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
                self.sessionsListView.$el.siblings().hide();
                self.sessionsListView.filter();
                self.sessionsListView.$el.show();
                self.actionsListView.filter();
                self.actionsListView.$el.show();
                self.ioListView.filter();
                self.ioListView.$el.show();
                router.setTitle('Analytics');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route('by/:userName', 'userAnalytics', function(name){
                routerReset();
                router.setTitle('Analytics by '+name);
                self.nav.selectByNavigate('');
                usersCollection.getByName(name, function(user){
                    if(user) {
                        self.sessionsListView.filter(function(model) {
                          if (user.id !== model.get('owner').id) return false;
                          return true;
                        });
                        self.actionsListView.filter(function(model) {
                          if (user.id !== model.get('owner').id) return false;
                          return true;
                        });
                        self.sessionsListView.$el.siblings().hide();
                        self.sessionsListView.$el.show();
                        self.actionsListView.$el.show();
                        router.trigger('loadingComplete');
                    }
                });
            });
            router.route('session/:id', 'session', function(id){
                routerReset();
                self.$sessionViewer.siblings().hide();
                self.$sessionViewer.show();
                self.findSessionById(id, function(doc){
                    if(doc) {
                        self.carouselDoc(doc);
                    } else {
                        console.log(id);
                        router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('action/:id', 'action', function(id){
                routerReset();
                self.$actionViewer.siblings().hide();
                self.$actionViewer.show();
                self.findActionById(id, function(doc){
                    if(doc) {
                        //self.carouselDoc(doc);
                        
                        alert('todo: show action detail');
                    } else {
                        console.log(id);
                        router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
        }
    });
    
    
    if(define) {
        define(function () {
            return AnalyticsView;
        });
    }
    
})();
