(function() {
    var pageSize = 0;

    var AppView = Backbone.View.extend({
        tagName: 'body',
        className: 'msgs-app',
        initialize: function() {
            var self = this;
            require(['/msgs/msgs.js'], function(MsgsBackbone){
                window.MsgsBackbone = MsgsBackbone;
                window.msgsCollection = new MsgsBackbone.Collection(); // collection
                require(['/desktop/swipeview.js'], function(){
                    self.$msgsList = $('<div class="msgs-list"></div>');
                    self.$msgViewer = $('<div class="msg-viewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
                    window.msgsCollection.pageSize = pageSize;
                    // self.listView = window.msgsCollection.getView({el: self.$msgsList});
                    
                    var filterFunc = function(model, filterObj) {
                        // console.log(model);
                        var filterId = filterObj.filter;
                        if(filterId === 'favs') {
                            return model.get('metadata').fav;
                        }
                        var m = model.get('contentType');
                        // console.log(filterId);
                        // console.log(m)
                        // console.log(m.indexOf(filterId));
                        return (m.indexOf(filterId) === 0);
                        // if(filterId === 'text') {
                        // } else if(filterId === 'image') {
                        // } else if(filterId === 'audio') {
                        // } else if(filterId === 'video') {
                        // } else {
                        // }
                    }
                    var listOpts = {
                        className: 'houseCollection msgs table-responsive',
                        headerEl: $('#navbar-header-form'),
                        search: {
                            'fieldName': 'to'
                        },
                        // filters: {
                        //     'favs': {txt: 'Favs', glyphicon: 'star', filter: filterFunc, load: {"metadata.fav": 1}},
                        //     'text': {txt: 'Text', glyphicon: 'file', filter: filterFunc, load: {contentType: new RegExp('text')}},
                        //     'image': {txt: 'Image', glyphicon: 'picture', filter: filterFunc, load: {contentType: new RegExp('image')}},
                        //     'audio': {txt: 'Audio', glyphicon: 'music', filter: filterFunc, load: {contentType: new RegExp('audio')}},
                        //     'video': {txt: 'Video', glyphicon: 'film', filter: filterFunc, load: {contentType: new RegExp('video')}},
                        // },
                        // sorts: [
                        //     {name: 'Upload Date', field: 'uploadDate', type: 'date', glyphicon: 'time', default: -1},
                        //     {name: 'Filename', field: 'filename', glyphicon: 'sort-by-alphabet'},
                        //     {name: 'File size', field: 'length', type: 'number', glyphicon: 'sort-by-order'}
                        // ],
                        // layouts: {
                        //     "table": {
                        //         title: 'Table',
                        //         glyphicon: 'th-list',
                        //         default: true
                        //     },
                        //     "avatar": {
                        //         title: 'Avatar',
                        //         glyphicon: 'th-large'
                        //     }
                        // },
                        selection: {
                            actions: {
                                "delete": {
                                    title: "Delete File",
                                    glyphicon: 'trash',
                                    confirm: function() {
                                        return confirm("Are you sure that you want to delete the selected messages?");
                                    },
                                    action: function(model, callback) {
                                        // model.url = model.url+'/src';
                                        // return;
                                        model.destroy({success: function(model, response) {
                                            callback();
                                        }, 
                                        error: function(model, response) {
                                            console.log(arguments);
                                        },
                                        wait: true});
                                    },
                                    complete: function() {
                                        // alert('Files removed.');
                                        self.listView.renderPage(1);
                                    }
                                },
                            }
                        }
                    }
                    self.listView = msgsCollection.getView(listOpts);
                    
                    self.listView.on('select', function(row) {
                        self.router.navigate(row.model.getNavigatePath(), true);
                    });
                    self.listView.on('goToProfile', function(user){
                        self.router.navigate('by/'+user.get('name'), true);
                    });
                    
                    window.msgsCollection.on('editModel', function(model) {
                        self.router.navigate(model.getNavigatePath()+'/edit', true);
                    });
                    
                    var loadCollections = function() {
                        window.msgsCollection.load(null, function(){
                        });
                    }
                    if(window.account) {
                        window.account.on('loggedIn', function(loginView){
                            loadCollections();
                        });
                    }
                    self.initialized = true;
                    self.trigger('initialized');
                    loadCollections();
                });
            });
            this.$app = $('<div class="app"></div>');
        },
        initCarousel: function() {
            var self = this;
            if(!self.hasOwnProperty('carousel')) {
                self.carousel = new SwipeView(self.$msgViewer[0], {
                    numberOfPages: window.msgsCollection.count,
                    hastyPageFlip: true
                });
                
                self.carousel.onFlip(function () {
                    var el;
                    var upcoming;
                	var i;
                    var id = self.carousel.masterPages[self.carousel.currentMasterPage].dataset.id;
                    var doc = window.msgsCollection.get(id);
                    if(doc.has('txt')) {
                        self.router.setTitle(doc.get('txt'));
                    }
                    self.router.navigate('msg/'+doc.get('id'), {trigger: false, replace: false});
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
            // this.$el.html('');
            this.setElement(this.$el);
            if(!this.initialized) {
                this.on('initialized', function(){
                    self.render();
                });
                return this;
            }
            this.$el.append(this.$app);
            this.$app.append(self.listView.render().$el);
            this.$app.append(this.$msgViewer);
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
                self.newForm = new window.MsgsBackbone.Form({
                    collection: window.msgsCollection
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
                $form.siblings().hide();
                self.newForm.focus();
            } else {
                if(!self.editForms.hasOwnProperty(doc.id)) {
                    self.editForms[doc.id] = new window.MsgsBackbone.Form({
                        collection: window.msgsCollection,
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
            window.msgsCollection.getOrFetch(id, callback);
        },
        findUserByName: function(name, callback) {
            window.msgsCollection.getOrFetchName(name, callback);
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
            // nav.col.add({title:"Messages", navigate:""});
            //if(window.account && (account.isUser() || account.isAdmin())) {
                nav.col.add({title:"New message", navigate:"new"});
            //}
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
                // $('header').removeAttr('class');
                self.nav.unselect();
            });
            router.on('root', function(){
                self.listView.filter();
                self.listView.$el.siblings().hide();
                self.listView.$el.show();
                router.setTitle('Msgs');
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
                self.$msgViewer.siblings().hide();
                self.$msgViewer.show();
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
                self.$msgViewer.siblings().hide();
                self.$msgViewer.show();
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
            return AppView;
        });
    }
    
})();
