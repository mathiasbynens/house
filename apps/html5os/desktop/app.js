(function() {
    var WidgetView = Backbone.View.extend({
        tagName: 'div',
        className: 'widget',
        initialize: function() {
            var self = this;
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.setElement(this.$el);
            return this;
        },
        events: {}
    });

    var App = Backbone.View.extend({
        tagName: 'body',
        className: 'desktop',
        initialize: function() {
            var self = this;
            require(['/analytics/backbone-actions.js'], function(ActionsBackbone) {
                window.ActionsBackbone = ActionsBackbone;
                require(['/files/backbone-files.js'], function(FilesBackbone) {
                    window.FilesBackbone = FilesBackbone;
                    require(['/images/backbone-images.js'], function(ImagesBackbone) {
                        window.ImagesBackbone = ImagesBackbone;
                        require(['/urls/backbone-urls.js'], function(UrlsBackbone) {
                            window.UrlsBackbone = UrlsBackbone;
                            require(['/todos/todos.js'], function(TodosBackbone) {
                                window.TodosBackbone = TodosBackbone;
                                self.initialized = true;
                                self.trigger('initialized');
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

            this.$app = $('<div class="app"></div>');
        },
        renderList: function() {
            //$('body').prepend(this.listView.render().$el);
        },
        render: function() {
            //$('header.navbar .navbar-header').after(this.searchView.render().$el);
            //$('body').append(this.viewToggler.render().$el);
            //this.searchView.focus();
            this.renderSearchBar();
            this.$el.append(this.$app);
            return this;
        },
        renderSearchBar: function() {
            var self = this;
            if (!this.topUrlsCollection) {
                this.topUrlsCollection = new UrlsBackbone.Collection();
            }
            if (!self.searchView) {
                self.searchView = self.topUrlsCollection.getSearchView();
                self.searchView.on('search', function(query) {
                    console.log(query);
                    self.topUrlsCollection.view.search(query, function() {
                        self.searchView.trigger('searchComplete');
                    });
                });
                self.searchView.on('submit', function(query) {
                    console.log(query);
                    //self.listView.search(query);

                    self.topUrlsCollection.newUrl(query, function(urlModel) {
                        self.searchView.trigger('searchComplete');
                    });
                });
            }
            
            $('#siteNav').after(this.searchView.render().$el);
            
            self.searchView.focus();
            
            return this;
        },
        renderTopTodos:function() {
            if (!window.todosCollection) {
                window.todosCollection = new TodosBackbone.Collection();
            }
            if (!window.todosCollection.view) {
                window.todosCollection.sortField = 'dueAt-';
                window.todosCollection.pageSize = 6;
                
                var filterFunc = function(model, filterObj) {
                    var filterId = filterObj.filter;
                    // Check for list filter
                    if(filterId === 'todo') {
                        var r = model.get('done') ? false : true;
                        return r;
                    } else if (filterId === 'done') {
                        var r = model.get('done') ? true : false;
                        return r;
                    } else {
                        return true;
                    }
                }
                
                // console.log(window.todosCollection.getView({rowOptions: {className: "avatar col-xs-2"}}))
                this.todosView = window.todosCollection.getView({rowOptions: {className: "avatar col-xs-2"},
                    filters: {
                        'todo': {
                            txt: 'Todos',
                            glyphicon: 'unchecked',
                            filter: filterFunc,
                            load: {
                                "done": 0
                            }
                        },
                        'done': {
                            txt: 'Done',
                            glyphicon: 'check',
                            filter: filterFunc,
                            load: {
                                "done": 1
                            }
                        }
                    },
                });
                this.todosView.filterView.filterBy('todo');
                // this.todosView.setLayout('avatar', false);
                this.todosView.on('clickTodoTitle', function(urlAvatarView){
                    var ref = window.open('/todos/'+urlAvatarView.model.getNavigatePath(), '_blank');
                });
                window.todosCollection.load(null, function() {
                    //self.topUrlsCollection.sort();
                });
            }
            this.$el.append(window.todosCollection.getView().render().$el.addClass('todosWidget'));
            
            return this;
        },
        renderTopUrls: function() {
            if (!this.topUrlsCollection) {
                this.topUrlsCollection = new UrlsBackbone.Collection();
            }
            if (!this.topUrlsCollection.view) {
                this.topUrlsCollection.sortField = 'views-';
                this.topUrlsCollection.pageSize = 6;
                this.topUrlsCollection.getView({rowOptions: {className: "avatar col-xs-2"}}).setLayout('avatar', false);
                this.topUrlsCollection.view.on('selected', function(urlAvatarView){
                    console.log(urlAvatarView)
                });
                this.topUrlsCollection.load(null, function() {
                    //self.topUrlsCollection.sort();
                });
            }
            this.$el.prepend(this.topUrlsCollection.getView().render().$el.addClass('urlsWidget'));
            
            return this;
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
        },
        bindNav: function(nav) {
            this.nav = nav;
            this.bindRouter(nav.router);
            //nav.col.add({title:"URLs", navigate:""});
            //nav.col.add({title:"Bookmarklet", href:''});
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.on('reset', function() {
                self.nav.unselect();

            });
            router.on('root', function() {
                router.setTitle('Desktop');
                self.nav.selectByNavigate('');
                self.renderTopUrls();
                self.renderTopTodos();
                router.trigger('loadingComplete');
            });
        },
        getListView: function() {
            return this.collection.getView();
        },
        getWidgetView: function() {
            if (!this.hasOwnProperty('widgetView')) {
                this.widgetView = new WidgetView({
                    collection: this.collection
                });
            }
            return this.widgetView;
        },
        findById: function(id, callback) {
            this.collection.getOrFetch(id, callback);
        },
        findByUrl: function(url, callback) {
            this.collection.getOrFetchUrl(url, callback);
        },
        trackUrlView: function(destUrl) {
            var msg = 'VIEW ' + destUrl + ' FROM ' + window.location.href;
            //'EXIT '+window.location.toString()+' TO '+url
            if (window.ActionsBackbone) {
                var action = new ActionsBackbone.Model({});
                action.set({
                    a: msg
                }, {
                    silent: true
                });
                action.save();
            } else {
                require(['/analytics/backbone-actions.js'], function(ActionsBackbone) {
                    window.ActionsBackbone = ActionsBackbone;
                    var action = new ActionsBackbone.Model({});
                    action.set({
                        a: msg
                    }, {
                        silent: true
                    });
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
            var msg = 'EXIT ' + window.location.href + ' TO ' + destUrl;
            //'EXIT '+window.location.toString()+' TO '+url
            if (window.ActionsBackbone) {
                var action = new ActionsBackbone.Model({});
                action.set({
                    a: msg
                }, {
                    silent: true
                });
                action.save();
            } else {
                require(['/analytics/backbone-actions.js'], function(ActionsBackbone) {
                    window.ActionsBackbone = ActionsBackbone;
                    var action = new ActionsBackbone.Model({});
                    action.set({
                        a: msg
                    }, {
                        silent: true
                    });
                    action.save();
                    setTimeout(function() {
                        window.location = destUrl;
                    }, 100);
                });
                return false;
            }
        },
    });

    if (define) {
        define(function() {
            return App;
        });
    }
})();