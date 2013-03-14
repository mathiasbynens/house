(function() {
    var pageSize = 24;

    var ImagesView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            require(['/desktop/swipeview.js'], function(){
            require(['/files/backbone-files.js'], function(FilesBackbone){
                window.FilesBackbone = FilesBackbone;
                require(['backbone-images.js'], function(ImagesBackbone){
                    window.ImagesBackbone = ImagesBackbone;
                    require(['/checkins/backbone-checkins.js'], function(CheckinsBackbone){
                        window.CheckinsBackbone = CheckinsBackbone;
                        self.initFiles(function(){
                            self.initImages(function(){
                                var loadCollections = function() {
                                    self.imagesCollection.load(null, function(){
                                        self.filesCollection.load(null, function(){
                                            self.initialized = true;
                                            self.trigger('initialized');
                                            self.filesList.filter({contentType: /image/});
                                        });
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
        initImages: function(callback) {
            var self = this;
            self.imageViewerImages = {};
            this.$imageList = $('<div id="images-list" class="pImages"></div>');
            this.$imageViewer = $('<div id="image-viewer" class="pImageViewer"><a class="carousel-control left" href="#home" data-slide="prev">‹</a><a class="carousel-control right" href="#home" data-slide="next">›</a></div>');
            
            self.imagesCollection = window.imagesCollection = new ImagesBackbone.Collection(); // collection
            self.imagesCollection.pageSize = pageSize;
            self.checkinsCollection = window.checkinsCollection = new CheckinsBackbone.Collection();
            this.imagesListView = new ImagesBackbone.List({collection: this.imagesCollection});
            this.imagesListView.on('select', function(imageRow) {
                self.router.navigate('image/'+imageRow.model.get('id'), true);
            });
            this.imagesListView.on('goToImageHref', function(href) {
                var imgPath = '/images/';
                if(href.indexOf(imgPath) === 0) {
                    href = href.substr(imgPath.length);
                }
                self.router.navigate(href, true);
            });
            if(callback) callback();
        },
        initFiles: function(callback) {
            var self = this;
            this.$filesList = $('<div id="files-list" class="pImport"></div>');
            self.filesCollection = new FilesBackbone.Collection();
            self.filesCollection.pageSize = pageSize;
            //self.filesCollection.filterContentType('image');
            //self.filesCollection.filterProc(true);
            self.filesList = new FilesBackbone.List({collection: self.filesCollection});
            //options["metadata.proc"] = {"$exists": false};
            this.$upload = $('<span class="upload"></span>');
            self.newFileForm = new FilesBackbone.FileForm({collection: self.filesCollection, type: 'image'});
            self.newFileForm.on('uploaded', function(data){
                if(data.data && data.data.image) {
                    self.imagesCollection.add(data.data.image);
                    self.router.navigate('image/'+data.data.image.id, true);
                }
            });
            
            if(callback) callback();
        },
        initCarousel: function() {
            var self = this;
            if(!self.hasOwnProperty('carousel')) {
                self.carousel = new SwipeView(self.$imageViewer[0], {
                    numberOfPages: self.imagesCollection.count,
                    hastyPageFlip: true
                });
                
                self.carousel.onFlip(function () {
                    var el;
                    var upcoming;
                	var i;
                    console.log('currentMasterPage='+self.carousel.currentMasterPage);
                    var id = self.carousel.masterPages[self.carousel.currentMasterPage].dataset.id;
                    console.log(id);
                    var viewOpts = {list: self.imagesListView};
                    var image = self.imagesCollection.get(id);
                    var imageNext = image.next();
                    var imagePrev = image.prev();
                	for (i=0; i<3; i++) {
                		upcoming = self.carousel.masterPages[i].dataset.upcomingPageIndex;
                        console.log(upcoming);
                        console.log(self.carousel.masterPages[i].dataset.pageIndex);
                		if (upcoming != self.carousel.masterPages[i].dataset.pageIndex) {
                            console.log('update i = '+i);
                            console.log(self.carousel.directionX);
                			el = self.carousel.masterPages[i];
                            el.innerHTML = '';
                            if(self.carousel.directionX > 0) {
                                el.dataset.id = imagePrev.id;
                                el.appendChild(imagePrev.getFullView(viewOpts).render().$el[0]);
                            } else {
                                el.dataset.id = imageNext.id;
                                el.appendChild(imageNext.getFullView(viewOpts).render().$el[0]);
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
            this.$filesList.append(self.newFileForm.render().$el);
            this.$filesList.append(self.filesList.render().$el);
            this.$el.append(this.$filesList);
            this.$imageList.append(self.imagesListView.render().$el);
            this.$el.append(this.$imageList);
            this.$el.append(this.$imageViewer);
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
        findImageById: function(id, callback) {
            this.imagesCollection.getOrFetch(id, callback);
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
            
            nav.col.add({title:"Albums", navigate:""});
            nav.col.add({title:"Import", navigate:"import"});
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.on('reset', function(){
                self.$imageViewer.hide();
                self.$imageList.hide();
                self.$filesList.hide();
                self.nav.unselect();
            });
            router.on('root', function(){
                self.$imageList.show();
                router.setTitle('Images');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route('image/:id', 'menu', function(id){
                router.reset();
                self.$imageViewer.show();
                self.findImageById(id, function(image){
                    if(image) {
                        self.initCarousel();
                        var viewOpts = {list: self.imagesListView};
                        var imageEl = image.getFullView(viewOpts).render().$el;
                        
                        var renderSiblings = function() {
                            var imageNext = image.next();
                            var imagePrev = image.prev();
                            var pageNext = self.carousel.masterPages[2];
                            var pagePrev = self.carousel.masterPages[0];
                            if(imageNext) {
                                pageNext.innerHTML = '';
                                pageNext.dataset.id = imageNext.id;
                                pageNext.appendChild(imageNext.getFullView(viewOpts).render().$el[0]);
                            }
                            if(imagePrev) {
                                pagePrev.innerHTML = '';
                                pagePrev.dataset.id = imagePrev.id;
                                pagePrev.appendChild(imagePrev.getFullView(viewOpts).render().$el[0]);
                            }
                        }
                        console.log(imageEl[0]);
                        var currentPage = self.carousel.masterPages[1];
                        currentPage.innerHTML = '';
                        currentPage.dataset.id = image.id;
                        currentPage.appendChild(imageEl[0])
                        renderSiblings();
                        //self.$imageViewer.append(image.getFullView().render().$el);
                    } else {
                        console.log(id);
                        router.navigate('', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('import', 'import', function(){
                router.reset();
                router.setTitle('Import');
                self.$filesList.show();
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('import');
            });
        }
    });
    
    
    if(define) {
        define(function () {
            return ImagesView;
        });
    }
    
})();
