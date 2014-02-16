(function() {
    var pageSize = 0;

    var FilesView = Backbone.View.extend({
        tagName: 'body',
        className: 'files-app',
        initialize: function() {
            var self = this;
            this.$app = $('<div class="app"></div>');
            this.$doc = $('<div class="doc"></div>');
            require(['/files/filesize.min.js'], function(filesize){
                window.filesize = filesize;
                require(['/tags/tags.js'], function(TagsBackbone){
                    window.TagsBackbone = TagsBackbone;
                    window.tagsCollection = new TagsBackbone.Collection(); // collection
                    // window.tagsCollection.load();
                    require(['/images/backbone-images.js'], function(ImagesBackbone){
                        window.ImagesBackbone = ImagesBackbone;
                        require(['/checkins/backbone-checkins.js'], function(CheckinsBackbone){
                            window.CheckinsBackbone = CheckinsBackbone;
                            require(['/files/backbone-files.js'], function(FilesBackbone){
                                window.FilesBackbone = FilesBackbone;
                                // self.$list = $('<div class="files-list asdasdsa houseCollection"></div>');
                                // self.$viewer = $('<div class="file-viewer"></div>');
                                self.collection = window.filesCollection = new FilesBackbone.Collection(); // collection
                                self.collection.pageSize = pageSize;
                                // self.listView = new FilesBackbone.List({className: 'test', collection: self.collection}); //el: self.$list,
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
                                    className: 'houseCollection files table-responsive',
                                    headerEl: $('#navbar-header-form'),
                                    search: {
                                        'fieldName': 'filename'
                                    },
                                    filters: {
                                        'favs': {txt: 'Favs', glyphicon: 'star', filter: filterFunc, load: {"metadata.fav": 1}},
                                        'text': {txt: 'Text', glyphicon: 'file', filter: filterFunc, load: {contentType: new RegExp('text')}},
                                        'image': {txt: 'Image', glyphicon: 'picture', filter: filterFunc, load: {contentType: new RegExp('image')}},
                                        'audio': {txt: 'Audio', glyphicon: 'music', filter: filterFunc, load: {contentType: new RegExp('audio')}},
                                        'video': {txt: 'Video', glyphicon: 'film', filter: filterFunc, load: {contentType: new RegExp('video')}},
                                    },
                                    tags: {
                                        'fieldName': 'metadata.tags'
                                    },
                                    sorts: [
                                        {name: 'Upload Date', field: 'uploadDate', type: 'date', glyphicon: 'time', default: -1},
                                        {name: 'Filename', field: 'filename', glyphicon: 'sort-by-alphabet'},
                                        {name: 'File size', field: 'length', type: 'number', glyphicon: 'sort-by-order'}
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
                                                title: "Delete File",
                                                glyphicon: 'trash',
                                                confirm: function() {
                                                    return confirm("Are you sure that you want to delete the selected files?");
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
                                            "deleteSrc": {
                                                title: "Delete File & Source",
                                                glyphicon: 'trash',
                                                confirm: function() {
                                                    return confirm("Are you sure that you want to delete the selected files and their source?");
                                                },
                                                action: function(model, callback) {
                                                    console.log(model);
                                                    console.log(model.url);
                                                    model.url = model.url() + '/src';
                                                    // model.url = model.url() + '/src';
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
                                                    // alert('Files and sources removed.');
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
                                self.listView.on('goToProfile', function(user){
                                    self.router.navigate('by/'+user.get('name'), true);
                                });
                                
                                self.collection.on('editModel', function(model) {
                                    self.router.navigate(model.getNavigatePath()+'/edit', true);
                                });
                                
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
                nav.col.add({title:"Upload", navigate:"upload", glyphicon: 'cloud-upload'});
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
                        var mod = utils.getNewModalContent({title: doc.get('filename'), body: doc.getFullView().render().$el, className: 'modal-content container'});
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
            router.route('upload', 'upload', function(){
                router.reset();
                router.setTitle('Upload a File');
                self.$el.addClass('appBlurred');
                if(!self.uploadFrame) {
                    self.uploadFrame = new FilesBackbone.UploadFrame({collection: window.filesCollection});
                    self.uploadFrame.on('uploaded', function(data){
                        if(_.isArray(data)) {
                            data = _.first(data);
                        }
                        if(data.file) {
                            //self.router.navigate('file/'+data.file.filename, true);
                        }
                        console.log(arguments);
                    });
                    self.$el.prepend(self.uploadFrame.render().$el);
                } else {
                    self.uploadFrame.$el.show();
                }
                //self.uploadFrame.pickFile();
                
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('upload');
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
            return FilesView;
        });
    }
})();
