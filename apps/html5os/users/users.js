(function() {
    var pageSize = 0;

    var BodyView = Backbone.View.extend({
        tagName: 'body',
        className: 'users-app',
        initialize: function() {
            var self = this;
            this.$app = $('<div class="app"></div>');
            this.$doc = $('<div class="doc"></div>');
            require(['/images/backbone-images.js'], function(ImagesBackbone){
                window.ImagesBackbone = ImagesBackbone;
                require(['/files/backbone-files.js'], function(FilesBackbone){
                    window.FilesBackbone = FilesBackbone;
                    require(['/users/backbone-users.js'], function(UsersBackbone){
                        window.UsersBackbone = UsersBackbone;
                        // self.$list = $('<div class="files-list asdasdsa houseCollection"></div>');
                        // self.$viewer = $('<div class="file-viewer"></div>');
                        self.collection = window.usersCollection = new UsersBackbone.Collection(); // collection
                        self.collection.pageSize = pageSize;
                        // self.listView = new FilesBackbone.List({className: 'test', collection: self.collection}); //el: self.$list,
                        var filterFunc = function(model, filterObj) {
                            // console.log(model);
                            var filterId = filterObj.filter;
                            if(filterId === 'favs') {
                                return model.get('metadata').fav;
                            }
                            var m = model.get('contentType');
                            return (m.indexOf(filterId) === 0);
                        }
                        var listOpts = {
                            className: 'houseCollection users table-responsive',
                            headerEl: $('#navbar-header-form'),
                            search: {
                                'fieldName': 'name'
                            },
                            // filters: {
                            //     'favs': {txt: 'Favs', glyphicon: 'star', filter: filterFunc, load: {"metadata.fav": 1}},
                            //     'text': {txt: 'Text', glyphicon: 'file', filter: filterFunc, load: {contentType: new RegExp('text')}},
                            //     'image': {txt: 'Image', glyphicon: 'picture', filter: filterFunc, load: {contentType: new RegExp('image')}},
                            //     'audio': {txt: 'Audio', glyphicon: 'music', filter: filterFunc, load: {contentType: new RegExp('audio')}},
                            //     'video': {txt: 'Video', glyphicon: 'film', filter: filterFunc, load: {contentType: new RegExp('video')}},
                            // },
                            // tags: {
                            //     'fieldName': 'metadata.tags'
                            // },
                            sorts: [
                                {name: 'Join Date', field: 'at', type: 'date', glyphicon: 'time', default: -1},
                                {name: 'Name', field: 'name', glyphicon: 'sort-by-alphabet'},
                                // {name: 'File size', field: 'length', type: 'number', glyphicon: 'sort-by-order'}
                            ],
                            layouts: {
                                "table": {
                                    title: 'Table',
                                    glyphicon: 'th-list',
                                    default: true
                                },
                                "avatar": {
                                    title: 'Avatar',
                                    glyphicon: 'th-large'
                                }
                            },
                            selection: {
                                actions: {
                                    "delete": {
                                        title: "Delete User",
                                        glyphicon: 'trash',
                                        confirm: function() {
                                            return confirm("Are you sure that you want to delete the selected users?");
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
                                    }
                                }
                            }
                        }
                        self.listView = self.collection.getView(listOpts);
                        
                        self.collection.on('goToNavigatePath', function(model) {
                            self.router.navigate(model.getNavigatePath(), {trigger: true});
                        });
                        // self.listView.on('goToProfile', function(user){
                        //     self.router.navigate('by/'+user.get('name'), true);
                        // });
                        
                        // self.collection.on('editModel', function(model) {
                        //     self.router.navigate(model.getNavigatePath()+'/edit', true);
                        // });
                        
                        var loadCollections = function() {
                            self.collection.load(null, function(){
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
            // this.$el.html('');
            this.$el.append(this.$app);
            this.$el.append(this.$doc);
            this.setElement(this.$el);
            if(!this.initialized) {
                this.on('initialized', function(){
                    self.render();
                });
                return this;
            }
            // this.$el.append(self.listView.render().$el);
            // self.$list.prepend(self.listView.searchView.render().$el);
            // this.$el.append(this.$viewer);
            return this;
        },
        findFileById: function(id, callback) {
            this.collection.getOrFetch(id, callback);
        },
        findFileByName: function(id, callback) {
            this.collection.getOrFetchFilename(id, callback);
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
            // nav.col.add({title:"Files", navigate:""});
            if(window.account && (account.isUser() || account.isAdmin())) {
                // nav.col.add({title:"Upload", navigate:"upload", glyphicon: 'cloud-upload'});
            }
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.on('reset', function(){
                // self.collection.getView().$el.hide();
                // self.nav.unselect();
                // $('body > .shareView').remove();
                // $('body > .fullView').remove();
                // self.$app.removeClass('blurred');
                self.$el.removeClass('appBlurred');
                self.$doc.html('').hide();
                if(self.uploadFrame) {
                    self.uploadFrame.$el.hide();
                }
            });
            router.on('root', function(){
                router.setTitle('Files');
                var $list = self.collection.getView().render().$el;
                self.$app.append($list);
                $list.show().siblings().hide();
                self.nav.selectByNavigate('');
                // self.renderList();
                router.trigger('loadingComplete');
            });
            router.route('id/:id', 'id', function(id){
                router.reset();
                self.collection.getOrFetch(id, function(doc){
                    if(doc) {
                        // self.$app.addClass('blurred');
                        self.$el.addClass('appBlurred');
                        // self.collection.getView().$el.addClass('blurred');
                        var mod = utils.getNewModalContent({title: doc.get('name'), body: doc.getFullView().render().$el, className: 'modal-content container'});
                        self.$doc.html(mod.render().$el.show()).show();
                    } else {
                        
                    }
                });
            });
            router.route('/file/:filename/edit', 'editSlug', function(filename){
                router.reset();
                self.findFileByName(filename, function(doc){
                    if(doc) {
                        self.editDoc(doc);
                    } else {
                        router.navigate('upload', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('by/:userName', 'userFiles', function(name){
                router.reset();
                router.setTitle('Files by '+name);
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
            router.route('file/:id', 'file', function(id){
                router.reset();
                self.collection.getOrFetchFilename(id, function(doc){
                    if(doc) {
                        // self.carouselDoc(doc);
                        self.$app.append(doc.getFullView().$el.show());
                    } else {
                        // console.log(id);
                        router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
                // self.$viewer.siblings().hide();
                // self.$viewer.show();
                // self.findFileByName(id, );
            });
        },
        trackUrlView: function(destUrl) {
            var msg = 'VIEW '+destUrl+' FROM '+window.location.href;
            //'EXIT '+window.location.toString()+' TO '+url
            if(window.ActionsBackbone) {
                var action = new ActionsBackbone.Model({});
                action.set({a:msg},{silent:true});
                action.save();
            } else {
                require(['/analytics/backbone-actions.js'], function(ActionsBackbone){
                    window.ActionsBackbone = ActionsBackbone;
                    var action = new ActionsBackbone.Model({});
                    action.set({a:msg},{silent:true});
                    action.save();
                });
                return false;
            }
        },
        events: {
            'click a[target="_new"]:not([rel="external"])': "clickExternalLink"
        },
        clickExternalLink: function(e) {
            //var origEl = e.srcElement || e.originalTarget;
            //var destUrl = $(origEl).attr('href');
            var destUrl = $(e.currentTarget).attr('href');
            var msg = 'EXIT '+window.location.href+' TO '+destUrl;
            //'EXIT '+window.location.toString()+' TO '+url
            if(window.ActionsBackbone) {
                var action = new ActionsBackbone.Model({});
                action.set({a:msg},{silent:true});
                action.save();
            } else {
                require(['/analytics/backbone-actions.js'], function(ActionsBackbone){
                    window.ActionsBackbone = ActionsBackbone;
                    var action = new ActionsBackbone.Model({});
                    action.set({a:msg},{silent:true});
                    action.save();
                    setTimeout(function(){
                        window.location = destUrl;
                    },100);
                });
                return false;
            }
        }
    });

    if(define) {
        define(function () {
            return BodyView;
        });
    }
})();



// (function() {
//     var pageSize = 24;

//     var UsersView = Backbone.View.extend({
//         tag: 'span',
//         className: 'app',
//         initialize: function() {
//             var self = this;
//             self.editForms = {};
//             require(['/desktop/swipeview.js'], function(){
//                 self.$userList = $('<div class="user-list"></div>');
//                 self.$userViewer = $('<div class="user-viewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
//                 window.usersCollection.pageSize = pageSize;
//                 self.listView = window.usersCollection.getView({el: self.$userList});
//                 self.listView.on('select', function(row) {
//                     self.router.navigate(row.model.getNavigatePath(), true);
//                 });
//                 self.listView.on('goToProfile', function(user){
//                     self.router.navigate('by/'+user.get('name'), true);
//                 });
                
//                 window.usersCollection.on('editModel', function(model) {
//                     self.router.navigate(model.getNavigatePath()+'/edit', true);
//                 });
                
//                 var loadCollections = function() {
//                     window.usersCollection.load(null, function(){
//                     });
//                 }
//                 if(window.account) {
//                     window.account.on('loggedIn', function(loginView){
//                         loadCollections();
//                     });
//                 }
//                 self.initialized = true;
//                 self.trigger('initialized');
//                 loadCollections();
//             });
            
//             /*require(['../desktop/jquery.idle-timer.js'], function() {
//                 var idleTimer = $(document).idleTimer(4200);
//                 $(document).bind("idle.idleTimer", function(e){
//                     $('body').addClass('idle');
//                 });
//                 $(document).bind("active.idleTimer", function(){
//                     $('body').removeClass('idle');
//                 });
//             });*/
//         },
//         initCarousel: function() {
//             var self = this;
//             if(!self.hasOwnProperty('carousel')) {
//                 self.carousel = new SwipeView(self.$userViewer[0], {
//                     numberOfPages: window.usersCollection.count,
//                     hastyPageFlip: true
//                 });
                
//                 self.carousel.onFlip(function () {
//                     var el;
//                     var upcoming;
//                 	var i;
//                     var id = self.carousel.masterPages[self.carousel.currentMasterPage].dataset.id;
//                     var doc = window.usersCollection.get(id);
//                     if(doc.has('title')) {
//                         self.router.setTitle(doc.get('title'));
//                     }
// 		    if(doc.has('slug')) {
//                         self.router.navigate(doc.get('slug'), {trigger: false, replace: false});
//                     } else {
//                         self.router.navigate('user/'+doc.get('id'), {trigger: false, replace: false});
//                     }
//                     var docNext = doc.next();
//                     var docPrev = doc.prev();
//                 	for (i=0; i<3; i++) {
//                 		upcoming = self.carousel.masterPages[i].dataset.upcomingPageIndex;
//                 		if (upcoming != self.carousel.masterPages[i].dataset.pageIndex) {
//                 			el = self.carousel.masterPages[i];
//                             if(self.carousel.directionX > 0) {
//                                 if(docPrev) {
//                                     self.carouselPageRender(el, docPrev);
//                                 }
//                             } else {
//                                 if(docNext) {
//                                     self.carouselPageRender(el, docNext);
//                                 }
//                             }
//                 		}
//                 	}
//                 });
                
//             }
//         },
//         render: function() {
//             var self = this;
//             this.$el.html('');
//             this.setElement(this.$el);
//             if(!this.initialized) {
//                 this.on('initialized', function(){
//                     self.render();
//                 });
//                 return this;
//             }
//             this.$el.append(self.listView.render().$el);
//             this.$el.append(this.$userViewer);
//             return this;
//         },
//         events: {
//             "click .carousel-control.left": "carouselPrev",
//             "click .carousel-control.right": "carouselNext",
//         },
//         carouselPrev: function() {
//             this.carousel.prev();
//             return false;
//         },
//         carouselNext: function() {
//             this.carousel.next();
//             return false;
//         },
//         carouselPageRender: function(page, doc) {
//             page.innerHTML = '';
//             page.dataset.id = doc.id;
//             page.appendChild(doc.getFullView({list: self.listView}).render().$el[0]);
//             page.scrollTop = 0;
//         },
//         carouselDoc: function(doc) {
//             var self = this;
//             if(doc.has('title')) {
//                 self.router.setTitle(doc.get('title'));
//             }
//             self.initCarousel();
//             var docEl = doc.getFullView({list: self.listView}).render().$el;
//             var foundDoc = false;
//             self.carousel.masterPages.forEach(function(e,i){
//                 if(e.dataset.id == doc.id) {
//                     foundDoc = i;
//                 }
//             });
//             if(foundDoc !== false) {
//                 if(self.carousel.currentMasterPage > foundDoc) {
//                     if(self.carousel.currentMasterPage - foundDoc > 1) {
//                         self.carousel.next();
//                     } else {
//                         self.carousel.prev();
//                     }
//                 } else if(self.carousel.currentMasterPage < foundDoc) {
//                     if(foundDoc - self.carousel.currentMasterPage > 1) {
//                         self.carousel.prev();
//                     } else {
//                         self.carousel.next();
//                     }
//                 }
//                 return;
//             }
            
//             var currentPageNum = self.carousel.currentMasterPage;
//             var nextPageNum = currentPageNum + 1;
//             var prevPageNum = currentPageNum - 1;
//             var maxPageNum = self.carousel.masterPages.length - 1;
//             if(nextPageNum > maxPageNum) {
//                 nextPageNum = 0;
//             } else if(prevPageNum < 0) {
//                 prevPageNum = maxPageNum;
//             }
//             var renderSiblings = function() {
//                 var docNext = doc.next();
//                 var docPrev = doc.prev();
//                 var pageNext = self.carousel.masterPages[nextPageNum];
//                 var pagePrev = self.carousel.masterPages[prevPageNum];
//                 if(docNext) {
//                     self.carouselPageRender(pageNext, docNext);
//                 }
//                 if(docPrev) {
//                     self.carouselPageRender(pagePrev, docPrev);
//                 }
//             }
//             var currentPage = self.carousel.masterPages[currentPageNum];
//             self.carouselPageRender(currentPage, doc);
//             renderSiblings();
//         },
//         editDoc: function(doc) {
//             var self = this;
//             var $form;
//             if(!doc) {
//                 self.newForm = new self.UsersBackbone.Form({
//                     collection: window.usersCollection
//                 });
//                 self.newForm.on("saved", function(doc) {
//                     self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
//                 });
//                 self.newForm.on("title", function(title) {
//                     self.router.setTitle(title);
//                 });
//                 $form = self.newForm.render().$el;
//                 $form.show();
//                 self.$el.append($form);
//                 self.newForm.wysiEditor();
//                 $form.siblings().hide();
//                 self.newForm.focus();
//             } else {
//                 if(!self.editForms.hasOwnProperty(doc.id)) {
//                     self.editForms[doc.id] = new self.UsersBackbone.Form({
//                         collection: window.usersCollection,
//                         model: doc
//                     });
//                     self.editForms[doc.id].on("saved", function(doc) {
//                         self.router.navigate(doc.getNavigatePath(), {replace: true, trigger: true});
//                     });
//                     self.editForms[doc.id].on("title", function(title) {
//                         self.router.setTitle(title);
//                     });
//                     $form = self.editForms[doc.id].render().$el;
//                     $form.show();
//                     self.$el.append($form);
//                     self.editForms[doc.id].wysiEditor();
//                 } else {
//                     $form = self.editForms[doc.id].render().$el;
//                     $form.show();
//                     //self.$el.append($form);
//                 }
//                 $form.siblings().hide();
//                 self.editForms[doc.id].focus();
//             }
//         },
//         findUserById: function(id, callback) {
//             window.usersCollection.getOrFetch(id, callback);
//         },
//         findUserByName: function(name, callback) {
//             window.usersCollection.getOrFetchName(name, callback);
//         },
//         userIs: function(userId) {
//             return (this.user && this.user.id == userId);
//         },
//         userIsAdmin: function() {
//             return (this.user && this.user.has('groups') && this.user.get('groups').indexOf('admin') !== -1);
//         },
//         bindAuth: function(auth) {
//             var self = this;
//             self.auth = auth;
//         },
//         bindUser: function(user) {
//             var self = this;
//             self.user = user;
//             self.trigger('refreshUser', user);
//         },
//         bindNav: function(nav) {
//             this.nav = nav;
//             this.bindRouter(nav.router);
//             nav.col.add({title:"Users", navigate:""});
//             if(window.account && (account.isUser() || account.isAdmin())) {
//                 //nav.col.add({title:"New user", navigate:"new"});
//             }
//         },
//         bindRouter: function(router) {
//             var self = this;
//             var routerReset = function() {
//                 $('body').attr('class', '');
//                 router.reset();
//             }
//             self.router = router;
//             router.on('title', function(title){
//                 var $e = $('header h1');
//                 $e.html(title);
//                 $e.attr('class', '');
//                 var eh = $e.height();
//                 var eph = $e.offsetParent().height();
//                 if(eh > eph) {
//                     var lines = Math.floor(eh/eph);
//                     if(lines > 3) {
//                         $e.addClass('f'+lines);
//                         eh = $e.height();
//                         eph = $e.offsetParent().height();
//                         if(eh > eph) {
//                             lines = Math.floor(eh/eph);
//                             $e.addClass('l'+lines);
//                         }
//                     } else {
//                         $e.addClass('l'+lines);
//                     }
//                 }
//             });
//             router.on('reset', function(){
//                 $('header').removeAttr('class');
//                 self.nav.unselect();
//             });
//             router.on('root', function(){
//                 self.listView.filter();
//                 self.listView.$el.siblings().hide();
//                 self.listView.$el.show();
//                 router.setTitle('Users');
//                 self.nav.selectByNavigate('');
//                 router.trigger('loadingComplete');
//             });
//             router.route(':name/edit', 'editName', function(slug){
//                 routerReset();
//                 self.findUserByName(slug, function(doc){
//                     if(doc) {
//                         self.editDoc(doc);
//                     } else {
//                         router.navigate('new', {replace: true, trigger: true});
//                     }
//                     router.trigger('loadingComplete');
//                 });
//             });
//             router.route(':name', 'userName', function(slug){
//                 routerReset();
//                 self.$userViewer.siblings().hide();
//                 self.$userViewer.show();
//                 self.findUserByName(slug, function(doc){
//                     if(doc) {
//                         self.carouselDoc(doc);
//                     } else {
//                         router.navigate('new', {replace: true, trigger: true});
//                     }
//                     router.trigger('loadingComplete');
//                 });
//             });
//             router.route('user/:id', 'userId', function(id){
//                 routerReset();
//                 self.$userViewer.siblings().hide();
//                 self.$userViewer.show();
//                 self.findUserById(id, function(doc){
//                     if(doc) {
//                         if(doc.has('name')) {
//                             router.navigate(doc.get('name'), {trigger: false, replace: true});
//                         }
//                         self.carouselDoc(doc);
//                     } else {
//                         console.log(id);
//                         router.navigate('', {replace: true, trigger: true});
//                     }
//                     router.trigger('loadingComplete');
//                 });
//             });
//             router.route('new', 'new', function(){
//                 routerReset();
//                 $('header').addClass('hideTitle');
//                 self.editDoc();
//                 router.trigger('loadingComplete');
//                 self.nav.selectByNavigate('new');
//             });
//         }
//     });
    
    
//     if(define) {
//         define(function () {
//             return UsersView;
//         });
//     }
    
// })();
