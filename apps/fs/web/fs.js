(function() {
    var FsView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            self.editForms = {};
            require(['backbone-fs.js'], function(ModelBackbone){
                window.FsBackbone = ModelBackbone;
                self.pathSelected = '/';
                
                self.$fileTree = $('<div class="tree browser"><controls><button class="up">↑</button><button class="refresh">'+self.pathSelected+'</button><button class="add">+</button><span class="addNewFilesFrame" style="display:none"><button class="new">New file or folder</button></span></controls><div class="paths"></div></div>');
                self.$filesOpen = $('<ul class="files-open"></ul>');
                self.$fileViewer = $('<div class="file-viewer"></div>');
                
                window.fsRootCollection = new window.FsBackbone.Collection([], {path: self.pathSelected}); // collection
                window.fsRootCollection.collectionPaths = {};
                self.treeRootView = window.fsRootCollection.getView();
                window.fsRootCollection.on('selected', function(row) {
                    self.router.navigate(row.model.getNavigatePath(), true);
                });
                window.fsRootCollection.on('file', function(model) {
                    var file = new window.FsBackbone.FileModel(model);
                    window.fsFilesOpenCollection.add(file);
                });
                
                window.fsFilesOpenCollection = new window.FsBackbone.FilesCollection();
                window.fsFilesOpenCollection.on('selected', function(row) {
                    console.log(row);
                    self.router.navigate(row.model.getNavigatePath(), true);
                });
                
                self.uploadFrame = new window.FsBackbone.UploadFrame();
                self.uploadFrame.on('uploaded', function(data){
                    if(_.isArray(data)) {
                        data = _.first(data);
                    }
                    if(window.fsRootCollection.hasOwnProperty('collectionPaths')) {
                        window.fsRootCollection.collectionPaths[self.pathSelected].add(data);
                    }
                });
                self.$fileTree.find('controls .addNewFilesFrame').append(self.uploadFrame.render().$el);
                
                var loadCollections = function() {
                    window.fsRootCollection.load(null, function(){
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
            self.renderPathControls();
            self.$fileTree.find('.paths').append(self.treeRootView.render().$el);
            self.$filesOpen.append(window.fsFilesOpenCollection.getView().render().$el);
            this.$el.append(this.$fileTree);
            this.$el.append(this.$filesOpen);
            this.$el.append(this.$fileViewer);
            return this;
        },
        renderPathControls: function() {
            var path = this.pathSelected;
            this.uploadFrame.setPath(path);
            if(path == '/') {
                this.$fileTree.find('.up').hide();
            } else {
                this.$fileTree.find('.up').show();
            }
            this.$fileTree.find('.refresh').html(path);
        },
        events: {
            "click .up": "goUp",
            "click .refresh": "refreshPath",
            "click .add": "addFiles",
            "click .new": "newFiles",
        },
        addFiles: function() {
            this.$el.find('.addNewFilesFrame').toggle();
        },
        newFiles: function() {
            var name = prompt("New file or folder/ name");
            if(name) {
                var col = window.fsRootCollection.collectionPaths[this.pathSelected];
                var f = new window.FsBackbone.Model({},{collection: col});
                var o = {name: name};
                if(name.substr(name.length-1) !== '/') {
                    o.data = ' ';
                }
                f.set(o, {silent: true});
                var saveModel = f.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    console.log(f);
                    col.add(f);
                });
            }
        },
        goUp: function() {
            var path = this.pathSelected;
            console.log(path);
            path = path.substr(0, path.substr(0,path.length-1).lastIndexOf('/')+1);
            this.router.navigate(path, true);
        },
        refreshPath: function() {
            var path = this.pathSelected;
            this.navigateToPath(path);
        },
        navigateToPath: function(path) {
            var self = this;
            console.log(path);
            if(path == '/') {
            }
            self.pathSelected = path;
            this.renderPathControls();
            var col;
            if(window.fsRootCollection.collectionPaths.hasOwnProperty(path)) {
                console.log(path);
                col = window.fsRootCollection.collectionPaths[path];
                var list = col.getView();
                list.$el.show();
                list.$el.siblings().hide();
                col.load(null, function(){
                    // loading complete
                });
            } else {
                console.log(path);
                col = window.fsRootCollection.collectionPaths[path] = new window.FsBackbone.Collection([], {path: path}); // collection
                console.log(col);
                col.on('selected', function(row) {
                    self.router.navigate(self.pathSelected+row.model.getNavigatePath(), true);
                });
                var list = col.getView();
                self.$fileTree.find('.paths').append(list.render().$el);
                list.$el.siblings().hide();
                col.on('file', function(model) {
                    self.$fileViewer.children().hide();
                    var file = window.fsFilesOpenCollection.get(model.id);
                    if(!file) {
                        file = new window.FsBackbone.FileModel(model);
                        window.fsFilesOpenCollection.add(file);
                        list.remove();
                        self.$fileViewer.append(file.getFullView().render().$el);
                        file.getFullView().renderAce();
                    } else {
                        file.getFullView().$el.show();
                        file.getFullView().editor.resize();
                    }
                    self.router.navigate(file.get('filename'), {trigger: false, replace: true});
                    var p = (path.lastIndexOf('/') == path.length-1) ? path.substr(0, path.length-1) : path;
                    var parentPath = path.substr(0, p.lastIndexOf('/')+1);
                    self.navigateToPath(parentPath);
                });
                col.load(null, function(){
                    // loading complete
                });
            }
        },
        editDoc: function(doc) {
            var self = this;
            var $form;
            if(!doc) {
                self.newForm = new self.PostsBackbone.Form({
                    collection: self.postsCollection
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
                    self.editForms[doc.id] = new self.PostsBackbone.Form({
                        collection: self.postsCollection,
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
        findPath: function(id, callback) {
            window.fsRootCollection.getOrFetch(id, callback);
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
            nav.col.add({title:"FS", navigate:""});
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
                $('header').removeAttr('class');
                self.nav.unselect();
            });
            router.on('root', function(){
                self.pathSelected = '/';
                self.renderPathControls();
                self.treeRootView.$el.siblings().hide();
                self.treeRootView.$el.show();
                router.setTitle('FS');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route('*path', 'path', function(path){
                routerReset();
                if(!path) {
                    router.trigger('root');
                    return;
                } else {
                    router.setTitle(path);
                }
                self.navigateToPath('/'+path);
                router.trigger('loadingComplete');
            });
            router.route('upload', 'upload', function(){
                routerReset();
                router.setTitle('Upload a file');
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('upload');
            });
            router.route('new', 'new', function(){
                routerReset();
                router.setTitle('New file');
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('new');
            });
        }
    });
    
    
    if(define) {
        define(function () {
            return FsView;
        });
    }
    
})();
