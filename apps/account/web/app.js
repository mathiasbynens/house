(function() {
    var pageSize = 24;

    var AppView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            self.editForms = {};
            self.$userViewer = $('<div class="user-viewer"></div>');
            window.usersCollection.pageSize = pageSize;
            
            window.usersCollection.on('editModel', function(model) {
                self.router.navigate(model.getNavigatePath()+'/edit', true);
            });
            
            var loadCollections = function() {
                window.usersCollection.load(null, function(){
                });
            }
            if(window.account) {
                window.account.on('loggedIn', function(loginView){
                    loadCollections();
                });
            }
            
            //loadCollections();
            require(['/files/backbone-files.js'], function(FilesBackbone){
                window.FilesBackbone = FilesBackbone;
                window.filesCollection = new FilesBackbone.Collection(); // collection
                require(['/desktop/jquery.idle-timer.js'], function() {
                    var idleTimer = $(document).idleTimer(4200);
                    $(document).bind("idle.idleTimer", function(e){
                        $('body').addClass('idle');
                    });
                    $(document).bind("active.idleTimer", function(){
                        $('body').removeClass('idle');
                    });
                    self.initialized = true;
                    self.trigger('initialized');
                });
            });
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
            if(self.userView) {
                this.$el.append(self.userView.render().$el.show());
            }
            this.$el.append(this.$userViewer);
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
            var self = this;
            if(doc.has('title')) {
                self.router.setTitle(doc.get('title'));
            }
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
                self.newForm = new self.UsersBackbone.Form({
                    collection: window.usersCollection
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
                    self.editForms[doc.id] = new self.UsersBackbone.Form({
                        collection: window.usersCollection,
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
        findUserById: function(id, callback) {
            window.usersCollection.getOrFetch(id, callback);
        },
        findUserByName: function(name, callback) {
            window.usersCollection.getOrFetchName(name, callback);
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
            nav.col.add({title:"Users", navigate:""});
            if(window.account && (account.isUser() || account.isAdmin())) {
                //nav.col.add({title:"New user", navigate:"new"});
            }
        },
        bindAccount: function(account) {
            var self = this;
            this.account = account;
            this.bindUser(account.loginStatus.getView().userModel);
            self.account.loginStatus.getView().getUserModel(function(userModel){
                self.userView = userModel.getUserView({profile: self.account});
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
                //self.listView.$el.siblings().hide();
                //self.listView.$el.show();
                router.setTitle('Account');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route(':name/edit', 'editName', function(slug){
                routerReset();
                self.findUserByName(slug, function(doc){
                    if(doc) {
                        self.editDoc(doc);
                    } else {
                        router.navigate('new', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route(':name', 'userName', function(slug){
                routerReset();
                self.$userViewer.siblings().hide();
                self.$userViewer.show();
                self.findUserByName(slug, function(doc){
                    if(doc) {
                        self.carouselDoc(doc);
                    } else {
                        router.navigate('new', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('user/:id', 'userId', function(id){
                routerReset();
                self.$userViewer.siblings().hide();
                self.$userViewer.show();
                self.findUserById(id, function(doc){
                    if(doc) {
                        if(doc.has('name')) {
                            router.navigate(doc.get('name'), {trigger: false, replace: true});
                        }
                        self.carouselDoc(doc);
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
            return AppView;
        });
    }
    
})();
