(function() {
    var pageSize = 0;
    
    var AllTodosView = Backbone.View.extend({
        tag: 'span',
        className: 'allTodos',
        initialize: function(options) {
            var self = this;
            this.$todoNav = $('<div class="todoNav"><span class="focusFormCol"><button class="focusForm btn btn-primary" title="New Todo"><span class="glyphicon glyphicon-pencil"></span></button><div class="navbar-header-form"></div></span></div>');
            var filterFunc = function(model, filterObj) {
                var filterId = filterObj.filter;
                // Check for list filter
                if(app.allTodosView.filteredByTodoList) {
                    var todoList = app.allTodosView.filteredByTodoList;
                    
                    if(model.get('list.id') !== todoList.id) {
                        return false;
                    }
                }
                if(filterId === 'none') {
                    return true;
                } else if(filterId === 'todo') {
                    var r = model.get('done') ? false : true;
                    return r;
                } else if (filterId === 'done') {
                    var r = model.get('done') ? true : false;
                    return r;
                } else {
                    return true;
                }
            }
            self.todosView = window.todosCollection.getView({
                headerEl: this.$todoNav.find('.navbar-header-form'),
                selection: true, mason: false,
                search: {
                    'fieldName': 'title'
                },
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
                    },
                    'none': {
                        filter: filterFunc,
                    }
                },
                // tags: {
                //     'fieldName': 'tags'
                // },
                sorts: [{
                    name: 'Created At',
                    field: 'at',
                    type: 'date',
                    glyphicon: 'time',
                    default: -1
                }, {
                    name: 'Due At',
                    field: 'dueAt',
                    type: 'date',
                    glyphicon: 'calendar',
                    // default: -1
                }],
            });
            self.todosView.on('select', function(row) {
                // options.app.router.navigate(row.model.getNavigatePath(), true);
            });
            self.todosView.on('clickTodoTitle', function(todoView) {
                options.app.router.navigate(todoView.model.getNavigatePath(), {trigger: true});
            });
            self.todosView.on('selectTodoList', function(model){
                options.app.router.navigate(model.getNavigatePath(), true);
            });
            
            self.getNewFormView();
        },
        getNewFormView: function() {
            var self = this;
            var formOpts = {
                collection: window.todosCollection,
                submit: false,
                className: 'house-form todo'
            };
            formOpts.beforeSubmit = function(form){
                if(self.filteredByTodoList) {
                    var todoList = self.filteredByTodoList;
                    var setDoc = {};
                    setDoc.list = {
                        id: todoList.id,
                        name: todoList.get('name')
                    }
                    form.model.set(setDoc, {silent: true});
                }
            };
            formOpts.fields = {
                "title": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "next todo item",
                    className: "form-control"
                },
            }
            self.todosFormView = window.todosCollection.getFormView(formOpts);
            self.todosFormView.on('saved', function(todo){
                console.log(todo)
                self.todosFormView.render().$el.remove();
                self.getNewFormView();
                self.todosFormView.focus('title');
                setTimeout(function(){
                    // $('body').scrollTo($(todo.getRow().$el[0]));
                    $('body').scrollTo($(document).height());
                },100);
            });
            this.$el.find('.todos').after(self.todosFormView.render().$el);
        },
        render: function() {
            var self = this;
            this.$el.append(this.$todoNav);
            this.$el.append(self.todosView.render(false).$el);
            this.$el.find('.todos').after(self.todosFormView.render().$el);
            return this;
        },
        filterByTodoList: function(todoList) {
            var self = this;
            // this.todosView.filterByTodoList(todoList);
            this.$el.addClass('filteredByList');
            this.filteredByTodoList = todoList;
            this.todosView.filter(function(model){
                // console.log(todoList.id)
                // console.log(model.get('title'))
                if(model.get('list.id') == todoList.id) {
                    // console.log(true)
                    return self.todosView.filterView.getFilterFunc()(model, self.todosView.getCombinedFilterObj());
                }
                return false;
            });
            
        },
        resetFilters: function(todoList) {
            // this.todosView.filterByTodoList(false);
            this.$el.removeClass('filteredByList');
            this.todosView.filter(function(){
                return true;
            });
        },
        events: {
            "click .focusForm": "focusForm"
        },
        focusForm: function() {
            this.todosFormView.focus('title');
            return false;
        }
    });
    
    var AllTodoListsView = Backbone.View.extend({
        tag: 'span',
        className: 'allTodoLists',
        initialize: function() {
            var self = this;
            this.$todoListNav = $('<div class="todoListNav"><span class="focusFormCol"><button class="focusForm btn btn-primary" title="New List"><span class="glyphicon glyphicon-pencil"></span></button><div class="navbar-header-form"></div></span></div>');
            self.todoListsView = window.todoListsCollection.getView({
                headerEl: this.$todoListNav.find('.navbar-header-form'),
                selection: true,
                mason: false,
                search: {
                    'fieldName': 'name'
                },
                // filters: {
                //     'todo': {
                //         txt: 'Todos',
                //         glyphicon: 'unchecked',
                //         filter: filterFunc,
                //         load: {
                //             "done": 0
                //         }
                //     },
                //     'done': {
                //         txt: 'Done',
                //         glyphicon: 'check',
                //         filter: filterFunc,
                //         load: {
                //             "done": 1
                //         }
                //     }
                // },
                // tags: {
                //     'fieldName': 'tags'
                // },
                sorts: [{
                    name: 'Created At',
                    field: 'at',
                    type: 'date',
                    glyphicon: 'time',
                    default: -1
                }, {
                    name: 'Name',
                    field: 'name',
                    type: 'text',
                    glyphicon: 'sort-by-alphabet',
                    // default: -1
                }],
            });
            self.todoListsView.on('selectName', function(row) {
                self.options.app.router.navigate(row.model.getNavigatePath(), {trigger: true});
            });
            self.todoListsView.collection.on('goToNavigatePath', function(model) {
                // self.options.app.router.navigate(model.getNavigatePath(), {trigger: true});
                self.options.app.router.navigate(model.getNavigatePathEdit(), {trigger: true});
            });
            self.getNewFormView();
        },
        getNewFormView: function() {
            var self = this;
            var formOpts = {
                collection: window.todoListsCollection,
                submit: false,
                className: 'house-form todoList'
            };
            // formOpts.beforeSubmit = function(form){
            //     if(self.filteredByTodoList) {
            //         var todoList = self.filteredByTodoList;
            //         var setDoc = {};
            //         setDoc.list = {
            //             id: todoList.id,
            //             name: todoList.get('name')
            //         }
            //         form.model.set(setDoc, {silent: true});
            //     }
            // };
            formOpts.fields = {
                "name": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "list name",
                    className: "form-control"
                },
            }
            self.formView = window.todosCollection.getFormView(formOpts);
            self.formView.on('saved', function(todo){
                // console.log(todo)
                self.formView.render().$el.remove();
                self.getNewFormView();
                self.formView.focus('title');
                setTimeout(function(){
                    // $('body').scrollTo($(todo.getRow().$el[0]));
                    $('body').scrollTo($(document).height());
                },100);
            });
            // this.$el.find('.todos').after(self.formView.render().$el);
        },
        render: function() {
            var self = this;
            this.$el.append(this.$todoListNav);
            this.$el.append(self.todoListsView.render(false).$el);
            this.$el.append(self.formView.render().$el);
            return this;
        },
        events: {
            "click .focusForm": "focusForm"
        },
        focusForm: function() {
            this.formView.focus('name');
            return false;
        }
    });

    var AppView = Backbone.View.extend({
        tag: 'span',
        className: 'app',
        initialize: function() {
            var self = this;
            self.editForms = {};
            require(['/desktop/jquery.scrollTo.min.js'], function(){
                require(['/todos/todoLists.js'], function(TodoListsBackbone){
                    window.TodoListsBackbone = TodoListsBackbone;
                    window.todoListsCollection = new TodoListsBackbone.Collection(); // collection
                    window.todoListsCollection.pageSize = 0;
                    require(['/todos/todos.js'], function(ModelBackbone){
                        window.TodosBackbone = ModelBackbone;
                        window.todosCollection = new ModelBackbone.Collection(); // collection
                        window.todosCollection.pageSize = 0;
                        // window.todosCollection.getView()
                        // console.log(window.todosCollection.view.cid)
                        // require(['/files/backbone-files.js'], function(FilesBackbone){
                            // console.log(window.todosCollection.view.cid)
                            // window.FilesBackbone = FilesBackbone;
                            // window.filesCollection = new FilesBackbone.Collection(); // collection
                            
                            if(window.account) {
                                window.account.on('loggedIn', function(loginView){
                                    // self.loadCollections();
                                });
                            }
                            
                            var initComplete = function() {
                                self.allTodosView = new AllTodosView({app: self});
                                // self.allTodosView.todosView.filterView.filterBy('todo');
                                self.allTodoListsView = new AllTodoListsView({app: self});
                                if(!self.initialized) {
                                   self.initialized = true;
                                   self.trigger('initialized');
                                }
                            }
                            // self.loadCollections(function(){
                            window.todoListsCollection.load(null, function(){
                                self.router.trigger('loadingProgress', 30);
                                initComplete();
                            });
                            // });
                    // });
                    });
                });
            });
        },
        loadCollections: function(callback) {
            var self = this;
            window.todoListsCollection.load(null, function(){
                self.router.trigger('loadingProgress', 30);
                window.todosCollection.load(null, function(){
                    self.router.trigger('loadingProgress', 30);
                    
                    // if(!self.initialized) {
                    //     self.initialized = true;
                    //     self.trigger('initialized');
                    // }
                    if(callback) {
                        callback();
                    }
                });
            });
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.setElement(this.$el);
            if(!this.initialized) {
                this.once('initialized', function(){
                    self.render();
                });
                return this;
            }
            
            this.$el.append(self.allTodosView.render().$el);
            this.$el.append(self.allTodoListsView.render().$el);
            return this;
        },
        events: {
        },
        findTodoById: function(id, callback) {
            window.todosCollection.getOrFetch(id, callback);
        },
        findTodoListById: function(id, callback) {
            window.todoListsCollection.getOrFetch(id, callback);
        },
        findTodoListBySlug: function(slug, callback) {
            window.todoListsCollection.getOrFetchSlug(slug, callback);
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
            nav.list.on('home', function(){
                nav.router.navigate('', true);
            });
            nav.col.add({title: "Lists", navigate: "lists", glyphicon: 'list'});
            // nav.col.add({title: "All Todos", navigate: ""});
            this.bindRouter(nav.router);
            if(window.account && (account.isUser() || account.isAdmin())) {
            }
        },
        bindRouter: function(router) {
            var self = this;
            var routerReset = function() {
                // $('body').attr('class', '');
                router.reset();
            }
            self.router = router;
            router.on('title', function(title){
                var $e = $('.pageTitle');
                $e.html(title);
                // $e.attr('class', '');
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
                $('#header').removeAttr('class');
                self.$el.removeAttr('data-nav');
                self.nav.unselect();
            });
            
            router.on('root', function(){
                routerReset();
                // self.loadCollections(function(){
                router.trigger('loadingProgress', 30);
                if(self.allTodosView.todosView.selectionView) {
                    self.allTodosView.todosView.selectionView.listDeselect();
                }
                self.allTodosView.$el.show();
                self.allTodosView.$el.siblings().hide();
                self.allTodosView.resetFilters();
                delete self.allTodosView.filteredByTodoList;
                self.allTodosView.todosView.filterView.filterBy('todo');
                router.setTitle('To Do');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
                // });
            });
            
            router.route('id/:id', 'todoById', function(id){
                routerReset();
                
                self.findTodoById(id, function(doc){
                    if(doc) {
                        router.setTitle(doc.get('title').substring(0,20));
                        self.allTodosView.$el.show();
                        self.allTodosView.$el.siblings().hide();
                        var formView = doc.getFormView();
                        formView.on('saved', function(){
                            box.remove();
                            self.router.back();
                        });
                        var box = utils.appendLightBox(formView.render().$el, false, false, {closeBtn: false, backdrop: 'static'});
                        box.on('removed', function(){
                            self.router.back();
                        });
                    }
                    router.trigger('loadingComplete');
                });
                self.nav.selectByNavigate('');
            });
            
            router.route('list/id/:id', 'todoList', function(id){
                routerReset();
                self.allTodosView.todosView.selectionView.listDeselect();
                self.allTodosView.$el.show();
                self.allTodosView.$el.siblings().hide();
                self.findTodoListById(id, function(doc){
                    if(doc) {
                        router.setTitle(doc.get('name'));
                        self.allTodosView.filterByTodoList(doc);
                    }
                    router.trigger('loadingComplete');
                });
                self.nav.selectByNavigate('lists');
            });
            router.route('list/:slug/edit', 'todoListSlugEdit', function(slug){
                routerReset();
                // self.allTodosView.$el.show();
                // self.allTodosView.$el.siblings().hide();
                self.findTodoListBySlug(slug, function(doc){
                    if(doc) {
                        router.setTitle(doc.get('name')+' edit');
                        // self.allTodosView.filterByTodoList(doc);
                        var formView = doc.getFormView();
                        formView.on('saved', function(){
                            box.remove();
                            // self.router.back();
                        });
                        var box = utils.appendLightBox(formView.render().$el, false, false, {closeBtn: false, backdrop: 'static'});
                        formView.focus('name');
                        box.on('removed', function(){
                            self.router.back();
                        });
                    }
                    router.trigger('loadingComplete');
                });
                self.nav.selectByNavigate('lists');
            });
            router.route('list/:slug', 'todoListSlug', function(slug){
                routerReset();
                if(self.allTodosView.todosView.selectionView) {
                    self.allTodosView.todosView.selectionView.listDeselect();
                }
                self.allTodosView.$el.show();
                self.allTodosView.$el.siblings().hide();
                self.findTodoListBySlug(slug, function(doc){
                    if(doc) {
                        router.setTitle(doc.get('name'));
                        self.allTodosView.filterByTodoList(doc);
                    }
                    router.trigger('loadingComplete');
                });
                self.nav.selectByNavigate('lists');
            });
            
            router.route('lists', 'lists', function(id){
                routerReset();
                router.setTitle('Lists');
                self.nav.selectByNavigate('lists');
                    router.trigger('loadingComplete');
                // window.todoListsCollection.load(null, function(){
                    // self.router.trigger('loadingProgress', 30);
                    self.allTodoListsView.render().$el.show();
                    self.allTodoListsView.$el.siblings().hide();
                    self.allTodoListsView.todoListsView.doRenderPage(1);
                // });
            });
            router.route('nolist', 'nolist', function(){
                routerReset();
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('nolist');
            });
        }
    });
    
    if(define) {
        define(function () {
            return AppView;
        });
    }
    
})();
