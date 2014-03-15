(function() {
    var pageSize = 24;
    
    var AllTodosView = Backbone.View.extend({
        tag: 'span',
        className: 'allTodos',
        initialize: function(options) {
            var self = this;
            self.todosView = window.todosCollection.getView();
            self.todosView.on('select', function(row) {
                options.app.router.navigate(row.model.getNavigatePath(), true);
            });
            self.todosView.on('selectTodoList', function(model){
                options.app.router.navigate(model.getNavigatePath(), true);
            });
            
            self.getNewFormView();
        },
        getNewFormView: function() {
            var self = this;
            self.todosFormView = new window.todosCollection.getForm({collection: window.todosCollection});
            self.todosFormView.on('saved', function(todo){
                self.todosFormView.render().$el.remove();
                self.getNewFormView();
                self.todosFormView.focus();
                setTimeout(function(){
                    $('body').scrollTo($(todo.getRow().$el[0]));
                },100);
            });
            this.$el.find('.todos').after(self.todosFormView.render().$el);
        },
        render: function() {
            var self = this;
            this.$el.append('<div style="clear: both;overflow: auto;"><span class="focusFormCol col-xs-1"><button class="focusForm btn btn-primary" title="New Todo">+</button></span>\n\
            <span class="col-xs-7"></span>\n\
            <span class="col-xs-4"></span></div>');
            this.$el.append(self.todosView.render().$el);
            this.$el.find('.todos').after(self.todosFormView.render().$el);
            return this;
        },
        filterByTodoList: function(todoList) {
            this.todosView.filterByTodoList(todoList);
            //this.todosView.filter({"list.id": todoList.id}, function(){            });
        },
        resetFilters: function(todoList) {
            this.todosView.filterByTodoList(false);
            //this.todosView.filter(false);
        },
        events: {
            "click .focusForm": "focusForm"
        },
        focusForm: function() {
            this.todosFormView.focus();
            return false;
        }
    });
    
    var AllTodoListsView = Backbone.View.extend({
        tag: 'span',
        className: 'allTodoLists',
        initialize: function() {
            var self = this;
            
            self.todoListsView = new window.todoListsCollection.getView({collection: window.todoListsCollection});
            self.todoListsView.on('selectName', function(row) {
                self.options.app.router.navigate(row.model.getNavigatePath(), true);
            });
            
            self.todoListsFormView = new window.todoListsCollection.getForm({collection: window.todoListsCollection});
            self.todoListsFormView.on('saved', function(){
                self.getNewFormView();
                self.todoListsFormView.focus();
            });
        },
        getNewFormView: function() {
            var self = this;
            self.todoListsFormView = new window.todoListsCollection.getForm({collection: window.todoListsCollection});
            self.todoListsFormView.on('saved', function(){
                self.getNewFormView();
                self.todoListsFormView.focus();
            });
            self.$el.prepend(self.todoListsFormView.render().$el);
        },
        render: function() {
            var self = this;
            this.$el.append(self.todoListsFormView.render().$el);
            this.$el.append(self.todoListsView.render().$el);
            return this;
        },
        events: {
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
                    require(['/todos/todos.js'], function(ModelBackbone){
                        window.TodosBackbone = ModelBackbone;
                        window.todosCollection = new ModelBackbone.Collection(); // collection
                        window.todosCollection.getView()
                        console.log(window.todosCollection.view.cid)
                        require(['/files/backbone-files.js'], function(FilesBackbone){
                            console.log(window.todosCollection.view.cid)
                            window.FilesBackbone = FilesBackbone;
                            window.filesCollection = new FilesBackbone.Collection(); // collection
                            
                            if(window.account) {
                                window.account.on('loggedIn', function(loginView){
                                    self.loadCollections();
                                });
                            }
                            
                            if(window.todosCollection.initialized) {
                                console.log(window.todosCollection.view.cid)
                                self.allTodosView = new AllTodosView({app: self});
                                self.allTodoListsView = new AllTodoListsView({app: self});
                                // self.loadCollections();
                            } else {
                                window.todosCollection.on('initialized', function() {
                                    console.log(window.todosCollection.view.cid)
                                    self.allTodosView = new AllTodosView({app: self});
                                    self.allTodoListsView = new AllTodoListsView({app: self});
                                    // self.loadCollections();
                                });
                            }
                            if(!self.initialized) {
                                self.initialized = true;
                                self.trigger('initialized');
                            }
                        });
                    });
                });
            });
        },
        loadCollections: function(callback) {
            var self = this;
            window.todosCollection.load(null, function(){
                self.router.trigger('loadingProgress', 30);
                window.todoListsCollection.load(null, function(){
                    self.router.trigger('loadingProgress', 30);
                    
                    if(!self.initialized) {
                        self.initialized = true;
                        self.trigger('initialized');
                    }
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
                this.on('initialized', function(){
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
            nav.col.add({title: "Todo Lists", navigate: "lists"});
            nav.col.add({title: "All Todos", navigate: ""});
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
                var $e = $('#header h1');
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
                $('#header').removeAttr('class');
                self.$el.removeAttr('data-nav');
                self.nav.unselect();
            });
            
            router.on('root', function(){
                routerReset();
                router.trigger('loadingProgress', 30);
                self.loadCollections(function(){
                    router.trigger('loadingComplete');
                });
                self.allTodosView.todosView.deselectAll();
                self.allTodosView.$el.show();
                self.allTodosView.$el.siblings().hide();
                self.allTodosView.resetFilters();
                router.setTitle('To Do');
                self.nav.selectByNavigate('');
            });
            
            router.route('id/:id', 'todoById', function(id){
                routerReset();
                
                self.findTodoById(id, function(doc){
                    if(doc) {
                        router.setTitle(doc.get('title').substring(0,20));
                        self.allTodosView.$el.show();
                        self.allTodosView.$el.siblings().hide();
                        if(!doc.getRow().isSelected()) {
                            doc.getRow().select();
                        }
                    }
                    router.trigger('loadingComplete');
                });
                self.nav.selectByNavigate('');
            });
            
            router.route('list/id/:id', 'todoList', function(id){
                routerReset();
                self.allTodosView.todosView.deselectAll();
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
            router.route('list/:slug', 'todoListSlug', function(slug){
                routerReset();
                self.allTodosView.todosView.deselectAll();
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
                self.allTodoListsView.$el.show();
                self.allTodoListsView.$el.siblings().hide();
                router.setTitle('Lists');
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('lists');
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
