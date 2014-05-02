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
                        require(['/polls/backbone-polls.js'], function(PollsBackbone){
                            window.PollsBackbone = PollsBackbone;
                            // self.$list = $('<div class="files-list asdasdsa houseCollection"></div>');
                            // self.$viewer = $('<div class="file-viewer"></div>');
                            console.log(PollsBackbone)
                            self.collection = window.pollsCollection = new PollsBackbone.Collection(); // collection
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
                                className: 'houseCollection polls table-responsive',
                                headerEl: $('#navbar-header-form'),
                                search: {
                                    'fieldName': 'title'
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
                                    {name: 'Created At', field: 'at', type: 'date', glyphicon: 'time', default: -1},
                                    {name: 'Title', field: 'title', glyphicon: 'sort-by-alphabet'},
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
                                            title: "Delete Poll",
                                            glyphicon: 'trash',
                                            confirm: function() {
                                                return confirm("Are you sure that you want to delete the selected polls?");
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
            });
            
            /*require(['/desktop/jquery.idle-timer.js'], function() {
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
        findPollById: function(id, callback) {
            this.collection.getOrFetch(id, callback);
        },
        findPollBySlug: function(id, callback) {
            this.collection.getOrFetchSlug(id, callback);
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
                nav.col.add({title:"Make a Poll", navigate:"poll/new", glyphicon: 'plus'});
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
            });
            router.on('root', function(){
                router.setTitle('Polls');
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
            router.route('poll/:slug/edit', 'editSlug', function(slug){
                router.reset();
                self.findPollBySlug(slug, function(doc){
                    if(doc) {
                        self.editDoc(doc);
                    } else {
                        router.navigate('poll/new', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('poll/:slug', 'pollSlug', function(slug){
                router.reset();
                self.findPollBySlug(slug, function(doc){
                    if(doc) {
                        self.$app.append(doc.getFullView().$el.show());
                    } else {
                        router.navigate('poll/new', {replace: true, trigger: true});
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('by/:userName', 'userPolls', function(name){
                router.reset();
                router.setTitle('Polls by '+name);
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
            router.route('poll/:id', 'poll', function(id){
                router.reset();
                self.collection.getOrFetch(id, function(doc){
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
            router.route('poll/new', 'newPoll', function() {
                router.reset();
                router.setTitle('Make a poll');
                
                var formOpts = {
                    collection: window.pollsCollection,
                    submit: false,
                    className: 'house-form poll'
                };
                formOpts.fields = {
                    "title": {
                        validateType: 'string',
                        autocomplete: "off",
                        placeholder: "Poll title",
                        className: "form-control"
                    },
                }
                self.newPollForm = new window.pollsCollection.getFormView(formOpts);
                self.newPollForm.on('saved', function(doc){
                    console.log(doc)
                    // self.formView.render().$el.remove();
                    // self.getNewFormView();
                    // self.formView.focus('title');
                    box.remove();
                    setTimeout(function(){
                        // $('body').scrollTo($(todo.getRow().$el[0]));
                        // $('body').scrollTo($(document).height());
                    },100);
                });
                
                var box = utils.appendLightBox(self.newPollForm.render().$el, ' ', ' ');
                box.on('removed', function(){
                    self.router.back();
                });
                
                
                router.trigger('loadingComplete');
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