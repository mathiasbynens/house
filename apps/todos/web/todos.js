(function() {
    
    var TodoAppRouter = Backbone.Router.extend({
        routes: {
            "todo/:id": "todoView",
            "todoListId/:id": "todoListId",
            "lists": "todoListsView",
            "todo": "todoListView",
            "nolist": "nolist"
        },
        todoListView: function() {
            todoAppView.pageShow('pTodoList');
            todoAppView.todoListView.filterOnList(false);
        },
        nolist: function() {
            todoAppView.pageShow('pTodoList');
            todoAppView.todoListView.filterOnList('$exists');
        },
        todoView: function(id) {
            $('#'+id).attr('selected', true);
        },
        todoListId: function(id) {
            $('#'+id).attr('selected', true);
            todoAppView.pageShow('pTodoList');
            todoAppView.todoListView.filterOnList(id);
        },
        todoListsView: function() {
            todoAppView.pageShow('pTodoLists');
        }
    });
    
    var timeFromId = function(id) {
        var timestamp = id.toString().substring(0,8);
        var date = new Date( parseInt( timestamp, 16 ) * 1000 );
        return date;
    }
    
    var Todo = Backbone.Model.extend({
        collectionName: "todos",
        initialize: function() {
            if(this.id) {
                this.attributes.createdAt = timeFromId(this.id);
            } else {
                this.attributes.createdAt = new Date();
            }
            this.on("change", function(todo, options){
                var changedAttr = todo.changedAttributes();
                
                console.log(changedAttr);
                var doSave = false;
                
                // Don't update the id or createdAt
                
                delete changedAttr['id'];
                delete changedAttr['owner'];
                delete changedAttr['createdAt'];
                
                for(var i in changedAttr) {
                    if(changedAttr.hasOwnProperty(i)) {
                        doSave = true;
                    }
                }
                if(doSave) {
                    todo.save();
                }
            });
                        
            this.statusName = { 0: "todo", 1: "done" };
        },
        
        defaults: function() {
          return {
            done:  0
          };
        },
        
        getStatus: function() {
            return this.statusName[this.get("done")];
        },
        
        toggle: function() {
            this.set({'done': Math.abs(this.get("done")-1)}, {wait: true});
        },
        
        getRow: function() {
            if (!this.row) {
                this.row = new TodoRow({
                    id: this.get("id"),
                    model: this
                });
            }
            return this.row;
        }
    });
    
    var Todos = Backbone.Collection.extend({
        model: Todo,
        collectionName: 'todos',
        url: '/api/todos',
        initialize: function() {
            var self = this;
            
            this.resetFilters();
            
            // BUG - I bet the reason that nextOrder isnt taking on col.create is that here on init the collection hasn't loaded?
            this.model.defaults = function() {
                return {
                    done: 0,
                    rank: self.nextOrder()
                };
            };
        },
        load: function(options, success) {
            var self = this;
            if(!options) {
                options = {};
            }
            if(!options.limit) {
                options.limit = 50;
            }
            if(!options.done) {
                if(this.filterDone !== false) {
                    options.done = this.filterDone;
                }
            }
            if(this.filterList === '$exists') {
                options.sort = "createdAt";
                
                // filter out todos on a list
                options.list = {"$exists": false};
            } else if(this.filterList !== false) {
                options.list = {"id": this.filterList};
                
                // Check our todo list for done count
                var todoList = todoAppView.todoLists.get(self.filterList);
                
                options.sort = "rank";
            } else {
                // all todos default sort order by creation
                options.sort = "createdAt";
            }
                    
            this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                    
                    if(options.done === 1) {
                        self.collectionDoneCount = collection.collectionCount;
                        
                        if(self.filterList !== false) {
                            
                            var doneCount = todoList.get("doneCount");
                            
                            if(collection.collectionCount && doneCount != collection.collectionCount) {
                                todoList.set({"doneCount": collection.collectionCount});
                            }
                        }
                    } else if(options.done === 0) { // not done aka. todo
                        self.collectionNotDoneCount = collection.collectionCount;                        
                        
                        if(self.filterList !== false && todoList) {
                            
                            var notDoneCount = todoList.get("notDoneCount");
                            
                            if(collection.collectionCount && notDoneCount != collection.collectionCount) {
                                todoList.set({"notDoneCount": collection.collectionCount});
                            }
                        }
                    }
                    
                    if(!self.hasOwnProperty('collectionDoneCount')) {
                        // try getting it from the list
                        if(todoList) {
                            self.collectionDoneCount = todoList.get("doneCount");
                        }
                    }
                    
                    if(success) {
                        success();
                    }
                },
                error: function(collection, response){
                }
            });
        },
        getNextPage: function() {
            if(this.length < this.collectionCount) {
                this.load({skip:this.length});
            }
        },
        updateFilter: function(filter, success) {
            var self = this;
            if(filter === 'all') {
                this.filterDone = false;
            } else if(filter === 'done') {
                this.filterDone = 1;
            } else {
                this.filterDone = 0;
            }
            this.reset();
            this.load({}, success);
        },
        loadListId: function(id, success) {
            this.filterList = id;
            this.reset();
            this.load({}, success);
        },
        nextOrder: function() {
            return this.collectionCount + 1 | 1;
        },
        comparator: function(doc) {
            if(this.filterList !== false) {
                return doc.get("rank");
            } else {
                var d = new Date(doc.get("createdAt")).getTime();
                return d;
            }
        },
        resetFilters: function() {
            this.filterDone = 0;
            this.filterList = false;
        }
    });
    
    var TodoList = Backbone.Model.extend({
        collectionName: "todoLists",
        initialize: function() {
            if(this.id) {
                this.attributes.createdAt = timeFromId(this.id);
            } else {
                this.attributes.createdAt = new Date();
            }
            this.on("change", function(todo, options){
                var changedAttr = todo.changedAttributes();
                
                var doSave = false;
                
                // Don't update the id or createdAt
                
                delete changedAttr['id'];
                delete changedAttr['owner'];
                delete changedAttr['createdAt'];
                
                for(var i in changedAttr) {
                    if(changedAttr.hasOwnProperty(i)) {
                        doSave = true;
                    }
                }
                if(doSave) {
                    todo.save();
                }
            });
                        
            this.statusName = { 0: "todo", 1: "done" };
        },
        
        defaults: function() {
          return {
            done:  0
          };
        },
        
        getStatus: function() {
            return this.statusName[this.get("done")];
        },
        
        toggle: function() {
            this.set({'done': Math.abs(this.get("done")-1)}, {wait: true});
        },
        
        getRow: function() {
            if (!this.row) {
                this.row = new TodoListRow({
                    id: this.get("id"),
                    model: this
                });
            }
            return this.row;
        }
    });
    
    var todoListCollectionName = 'todoLists';
    var TodoLists = Backbone.Collection.extend({
        model: TodoList,
        collectionName: 'todoLists',
        url: '/api/'+todoListCollectionName,
        initialize: function() {
            var self = this;
            
            this.filterDone = 0;
            
            TodoList.defaults = function() {
                return {
                    done: 0,
                    rank: self.nextOrder()
                };
            };
        },
        load: function(options, success) {
            var self = this;
            if(!options) {
                options = {};
            }
            if(!options.limit) {
                options.limit = 50;
            }
            if(!options.done) {
                if(this.filterDone !== false) {
                    options.done = this.filterDone;
                }
            }
                    
            this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                    if(success) {
                        success();
                    }
                },
                error: function(collection, response){
                }
            });
        },
        getNextPage: function() {
            if(this.length < this.collectionCount) {
                this.load({skip:this.length});
            }
        },
        updateFilter: function(filter) {
            if(filter === 'all') {
                this.filterDone = false;
            } else if(filter === 'done') {
                this.filterDone = 1;
            } else {
                this.filterDone = 0;
            }
            this.load();
        },
        nextOrder: function() {
            return this.collectionCount + 1 | 1;
        },
        comparator: function(todoList) {
          return todoList.get("rank");
        }
    });
    
    var BodyView = Backbone.View.extend({
        el: "body",
        render: function() {
            var self = this;
            this.todoListView.render();
            this.todoListsView.render();

            this.todoFormNew.render();
            this.todoListFormNew.render();
            
            require(['jquery.ui.min.js'], function(){
                require(['jquery.touchfix.js']);                
            });
            
            // TODO move the scroller into each page view, not the body
            
            require(['iscroll.js'], function(){
                document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
                
                var pullDownEl = document.getElementById('todo-filters');
                var pullUpEl = document.getElementById('todo-list-pager');
                var pullUpOffset = pullUpEl.offsetHeight;
                var pullDownOffset = pullDownEl.offsetHeight;
                // need filter el height and pager height for pull up

                var scrollOptions = {
                    // Don't scroll when click starts on the given elements
                onBeforeScrollStart: function(e) {
                    var $e = $(e.target);
                    if($e.hasClass('moveHandle')) {
                        e.stop();
                    } else if($e.parents('.moveHandle').length > 0) {
                        e.stop();
                    }
                },
                topOffset: pullDownOffset,
                onRefresh: function () {
                    if (pullDownEl.className.match('loading')) {
                		pullDownEl.className = 'clearfix';
                		//pullDownEl.querySelector('.pullDownLabel').innerHTML = 'Pull down to refresh...';
                	} else if (pullUpEl.className.match('loading')) {
                		pullUpEl.className = 'pTodoList';
                		//pullUpEl.querySelector('.pullUpLabel').innerHTML = 'Pull up to load more...';
                	}
                },
                onScrollMove: function () {
                	if (this.y > -pullDownOffset && !pullDownEl.className.match('flip')) {
                		pullDownEl.className = 'flip clearfix';
                		this.minScrollY = 0;
                		//pullDownEl.querySelector('.pullDownLabel').innerHTML = 'Release to refresh...';
                	} else if (this.y < 5 && (pullDownEl.className.match('flip') || pullDownEl.className.match('loading'))) {
                		pullDownEl.className = 'clearfix';
                		//pullDownEl.querySelector('.pullDownLabel').innerHTML = 'Pull down to refresh...';
                		this.minScrollY = -pullDownOffset;
                	} else if (this.y < (this.maxScrollY - 5) && !pullUpEl.className.match('flip')) {
                		pullUpEl.className = 'pTodoList flip';
                		//pullUpEl.querySelector('.pullUpLabel').innerHTML = 'Release to refresh...';
                		this.maxScrollY = this.maxScrollY;
                	} else if (this.y > (this.maxScrollY + 5) && pullUpEl.className.match('flip')) {
                		pullUpEl.className = 'pTodoList';
                		//pullUpEl.querySelector('.pullUpLabel').innerHTML = 'Pull up to load more...';
                		this.maxScrollY = pullUpOffset;
                	}
                },
                onScrollEnd: function () {
                	if (pullDownEl.className.match('flip')) {
                		pullDownEl.className = 'loading clearfix';
                		//pullDownEl.querySelector('.pullDownLabel').innerHTML = 'Loading...';				
                		//pullDownAction();	// Execute custom function (ajax call?)
                	} else if (pullUpEl.className.match('flip')) {
                		pullUpEl.className = 'loading';
                		//pullUpEl.querySelector('.pullUpLabel').innerHTML = 'Loading...';				
                		//pullUpAction();	// Execute custom function (ajax call?)
                        self.todos.getNextPage();
                	}
                },
                onBeforeScrollEnd: function(e) {
                    // dont pass clicks thru if you've scrolled
                    if(this.moved) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }
                }
                
                self.scroller = new iScroll('scroller', scrollOptions);
                document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
            });
            
            return this;
        },
        loading: function(isLoading) {
            if(isLoading === false) {
                this.$el.removeClass('loading');
            }
        },
        initTodoList: function() {
            var self = this;
            var $todoList = $('<div id="todo-list" class="pTodoList"></div>');
            var $elPager = $('<div id="todo-list-pager" class="pTodoList"><span class="counter">showing <span id="todosCollectionShowing">0</span> of <span id="todosCollectionCount">0</span> todos</span><span class="msg">release to show more</span></div>');
            
            $("#container").append($todoList);
            $("#container").append($elPager);
                        
            this.todos = new Todos; // collection
                        
            this.todoListView = new TodoListView({el:$todoList, collection: this.todos});
            
            this.todoListView.on('resize', function(){
                if(todoAppView.scroller) {
                    todoAppView.scroller.refresh();
                }
            });
            
            self.todoListView.listenToCollectionAdd(this.todos);
            
            this.todoListView.$elPager = $elPager;
            
            $elPager.click(function(){
                self.todos.getNextPage();
            }).css('cursor', 'pointer');
            
            // Append an Edit button
            var todoEditMode = $('<button class="edit pTodoList" id="edit-mode-toggle"><span class="edit icon"><a href="#"></a></span></button>');
            $('header').append(todoEditMode);
            todoEditMode.click(function(){
                if($todoList.hasClass('editMode')) {
                    
                    // Check for a change in sort order
                    if($todoList.find('ul').hasClass('sorted')) {
                        var $todoListUl = $todoList.find('ul');
                        $todoListUl.removeClass('sorted');
                        
                        $todoListUl.find('li.todoRow').each(function(i,e){
                            var todo = self.todoListView.collection.get(this.id);
                            if(todo) {
                            var newRank = i+1;
                            
                            var currentRank = todo.get('rank');
                            //console.log('newRank: '+newRank);
                            //console.log('currentRank: '+currentRank);
                            
                            if(currentRank != newRank) {
                                todo.set({"rank": newRank}, {wait: true});
                            }
                            } else {
                                console.log(this.id);
                            }
                        });
                    }
                }
                $todoList.toggleClass('editMode');
                
                return false;
            });
            
            // Append a Lists button            
            var todoListsLink = $('<button id="todo-lists" class="pTodoList"><span class="list icon"><a href="#"></a></span></button>');
            $('header').append(todoListsLink);
            todoListsLink.click(function(){
                self.todoAppRouter.navigate('lists', true);
                return false;
            });
            
            var todosTitle = $('<h1 id="todos-title" class="pTodoList title">Todos</h1>');
            $('header').append(todosTitle);
            
            /*
             * New Todo Form
             */
            
            var todoForm = $('<div id="todo-form" class="pTodoList"></div>');
            $('footer').append(todoForm);
            this.todoFormNew = new TodoFormNewView({el:todoForm, collection: this.todos});
        },
        initTodoLists: function() {
            var self = this;
            var $todoLists = $('<div id="todoLists" class="pTodoLists" style="display:none"></div>');
            var $todoListsPager = $('<div id="todo-lists-pager" class="pTodoLists" style="display:none">showing <span id="todoListsCollectionShowing">0</span> of <span id="todoListsCollectionCount">0</span> todo lists</div>');
            
            $("#container").append($todoLists);
            $("#container").append($todoListsPager);
            
            this.todoLists = new TodoLists; // collection
            
            this.todoListsView = new TodoListsView({el:$todoLists, collection: this.todoLists});
            this.todoListsView.$todoListsPager = $todoListsPager;
            
            this.todoLists.bind("add", function(todoList) {
                var view = new TodoListRow({model: todoList});
                
                view.on('resize', function(){
                    if(self.scroller) {
                        self.scroller.refresh();
                    }
                });
                
                self.todoListsView.appendRow(view.render().el);
                //self.todoListsView.refreshPager();
                if(self.scroller) {
                    self.scroller.refresh();
                }
            });
            
            $todoListsPager.click(function(){
                self.todoLists.getNextPage();
            }).css('cursor', 'pointer');
            
            // Append a Back button            
            var todoListsBackBtn = $('<button id="todo-lists-back" class="pTodoLists back" style="display:none"><span class="arrow-alt2 back icon"><a href="#"></a></span></button>');
            $('header').append(todoListsBackBtn);
            todoListsBackBtn.click(function(){
                self.todoAppRouter.navigate('todo', true);
                return false;
            });
            
            var todoListsTitle = $('<h1 id="todo-lists-title" class="pTodoLists title" style="display:none">Lists</h1>');
            $('header').append(todoListsTitle);
            
            // Append an Edit button
            var todoListsEditMode = $('<button class="edit pTodoLists" id="lists-edit-mode-toggle" style="display:none"><span class="edit icon"><a href="#"></a></span></button>');
            $('header').append(todoListsEditMode);
            todoListsEditMode.click(function(){
                
                // When ending edit mode
                if($todoLists.hasClass('editMode')) {
                    
                    // Check for a change in sort order
                    if($todoLists.find('ul').hasClass('sorted')) {
                        var $todoListsUl = $todoLists.find('ul');
                        $todoListsUl.removeClass('sorted');
                        
                        $todoListsUl.find('li.todoListRow').each(function(i,e){
                            var todoList = self.todoLists.get(this.id);
                            
                            var newRank = i+1;
                            
                            var currentRank = todoList.get('rank');
                            //console.log('newRank: '+newRank);
                            //console.log('currentRank: '+currentRank);
                            
                            if(currentRank != newRank) {
                                todoList.set({"rank": newRank}, {wait: true});
                            }
                        });
                    }
                }
                $todoLists.toggleClass('editMode');
                return false;
            });
            
            /*
             * New Todo List Form
             */
            
            var todoListForm = $('<div id="todo-list-form" class="pTodoLists" style="display:none"></div>');
            $('footer').append(todoListForm);
            this.todoListFormNew = new TodoListFormNewView({el:todoListForm, collection: this.todoLists});
        },
        initialize: function() {
            var self = this;
            this.todoAppRouter = new TodoAppRouter;
            
            this.initTodoLists();
            this.initTodoList();

            self.todoLists.load(null, function(){
                self.initialized = true;
                self.trigger('initialized');
                self.loading(false);
            });
        },
        pageHideAll: function() {
            $('header').children().hide();
            $('#container').children().hide();
            $('footer').children().hide();
        },
        pageShow: function(klass) {
            this.pageHideAll();
            $('header .'+klass).show();
            $('#container .'+klass).show();
            $('footer .'+klass).show();
            
            if(this.scroller) {
                this.scroller.refresh();
            }
        },
        appendPage: function($page, $header) {
            this.pageHideAll();
            $('header').append($header);
            $('#container').append($page);
        }
    });
    var TodoListView = Backbone.View.extend({
        
        render: function() {
            var self = this;
            //this.$el.html('');
            
            this.$el.append(this.$ul);
            this.$ul.html('');
            
            this.collection.each(function(todo){
                //var $li = $('<li data-id="'+todo.get('id')+'" data-title="'+todo.get('title')+'">'+todo.get('title')+'</li>');
                self.$ul.append(todo.getRow().render().$el);
            });
            
            this.todoListFilterView.render();
            
            this.trigger('resize');
            
            require(['jquery.ui.min.js'], function(){
                var sortUpdate = function(event, ui) {
                    self.$ul.addClass('sorted');
                }
                self.$ul.sortable({ axis: 'y', handle: '.moveHandle', update: sortUpdate });
                self.$ul.disableSelection();
            });
            
            return this;
        },
        initialize: function() {
            var self = this;
            
            var $ul = this.$ul = $('<ul id="todos"></ul>');
            
            // Lets keep a seperate collection for each todos list
            
            this.allTodos = this.collection;
            
            this.allTodos.on('reset', function(){
                self.render();
            });
            
            // TODO if we can't keep a this.collection pointer to the currently filtered, use a getSelectedCollection()
            
            this.todosByList = {};
            
            // include filter view
            this.$filter = $('<ul id="todo-filters" class="clearfix"></ul>');
            this.$el.append(this.$filter);
            
            this.todoListFilterView = new TodoListFilterView({el: this.$filter, collection: this.collection});
            //this.todoListFilterView.render();
            this.todoListFilterView.on('filter', function(newFilter) {

                self.collection.updateFilter(newFilter, function(){
                    self.render();
                    self.refreshPager();
                });
                //self.refreshPager();
                self.trigger('resize');
            });
        },
        listenToCollectionAdd: function(col) {
            var self = this;
            
            col.bind("add", function(todo) {
                var view = todo.getRow();
                
                view.on('resize', function(){
                    if(todoAppView.scroller) {
                        todoAppView.scroller.refresh();
                    }
                });
                
                self.appendRow(view.render().el);
                //self.refreshPager();
                if(todoAppView.scroller) {
                    todoAppView.scroller.refresh();
                }
            });
        },
        refreshPager: function() {
            
            console.log(this.collection.collectionNotDoneCount);
            console.log(this.collection.collectionDoneCount);
            
            $('#todosCollectionShowing').html(this.collection.length);
            $('#todosCollectionCount').html(this.collection.collectionCount);
            $('#todosCollectionDoneCount').html(this.collection.collectionDoneCount);
            $('#todosCollectionNotDoneCount').html(this.collection.collectionNotDoneCount);
        },
        appendRow: function(row) {
            this.$ul.append(row);
        },
        filterOnList: function(id) {
            var self = this;
            
            if(id === '$exists') {
                // Show all todos view
                if(!self.hasOwnProperty('todosNoList')) {
                    self.todosNoList = new Todos;
                    self.todosNoList.on('reset', function(){
                        self.render();
                    });
                    self.listenToCollectionAdd(self.todosNoList);
                }
                // TODO render this including todos count
                $('#todos-title').html('Todos');
                $('#todo-list ul').attr('class', '');
                
                this.selectedList = id;
                this.useCollection(self.todosNoList);
                
                this.collection.resetFilters();
                this.collection.filterList = id;
                this.collection.reset();
                this.collection.load({}, function(){
                    self.refreshPager();
                });
            } else if(id !== false) {
                
                // Use a new collection per list
                if(!this.todosByList.hasOwnProperty(id)) {
                    this.todosByList[id] = new Todos;
                    
                    this.todosByList[id].on('reset', function(){
                        self.render();
                    });
                    self.listenToCollectionAdd(this.todosByList[id]);
                }
                this.selectedList = todoAppView.todoLists.get(id);
                
                this.useCollection(this.todosByList[id]);
                
                $('#todos-title').html(this.selectedList.get('name'));
                
                $('#todo-list ul').addClass('filterList');
                
                this.collection.resetFilters();
                this.collection.reset();
                
                this.collection.loadListId(id, function(){
                    self.refreshPager();
                });
            } else {
                
                // Show all todos view
                
                // TODO render this including todos count
                $('#todos-title').html('Todo');
                $('#todo-list ul').attr('class', '');
                
                this.selectedList = id;
                this.useCollection(this.allTodos);
                
                this.collection.resetFilters();
                this.collection.reset();
                this.collection.load({}, function(){
                    self.refreshPager();
                });
            }
        },
        useCollection: function(col) {
            
            // TODO will this ref work? so long as we rebind events?
            this.collection = col;
            
        }
    });
    var TodoFormNewView = Backbone.View.extend({
        
        events: {
          "touchstart input": "touchstartstopprop",
          "submit form": "submit",
          "click form button": "submit"
        },
        
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        
        loading: function(isLoading) {
            
            if(isLoading !== false) {
                this.form.find('input').attr('disabled', true);
                this.form.find('button').attr('disabled', true);
            } else {
                this.form.find('input').removeAttr('disabled');
                this.form.find('button').removeAttr('disabled');
            }
        },
        
        submit: function(e) {
            var self = this;
            var newTodo = todoAppView.todos.model.defaults(); // Why do I have to do this here and rank doesn't come through on new todos.model(), but the Todo.default defined done=0 does?

            var v = this.form.serializeArray();

            for(var i in v) {
               if(v.hasOwnProperty(i)) {
                   var field = v[i];
                   
                   newTodo[field.name] = field.value;
               }
            }

            this.loading();

            if(todoAppView.todoListView.collection.filterList !== false && todoAppView.todoListView.collection.filterList !== '$exists') {
                newTodo.list = {id: todoAppView.todoListView.selectedList.get('id'), name: todoAppView.todoListView.selectedList.get('name')};
            }
            
            if(newTodo.hasOwnProperty('title') && newTodo.title != '') {
                todoAppView.todoListView.collection.create(newTodo, {"wait": true,
                    "success":function(){
                        self.formTitle.val('');
                        self.loading(false);
                        self.formTitle.focus();
                        
                        // scroll to the bottom of the list when needed
                        if($('#scroller').height() < $('#container').height()) {
                            todoAppView.scroller.scrollToElement('#todos li:last-child', 500);
                        }
                    }
                });
            } else {
                // failed validation
                alert('title required');
                self.loading(false);
            }
            
            
            return false;
        },
        
        render: function() {
            var self = this;
            this.form = $('<form><input type="text" placeholder="type a todo title" name="title" /><button><span class="update icon"><a href="#"></a></span></button></form>'); //.submit(this.submit);
            this.formTitle = this.form.find('input');
            $(this.el).html(this.form);
            
            return this;
        },
        initialize: function() {
            
        }
    });
    
    var TodoListFormNewView = Backbone.View.extend({
        
        events: {
          "touchstart input": "touchstartstopprop",
          "submit form": "submit",
          "click form button": "submit"
        },
        
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        
        loading: function(isLoading) {

            if(isLoading !== false) {
                this.form.find('button').attr('disabled', true);
            } else {
                this.form.find('button').removeAttr('disabled');
            }
        },
        
        submit: function(e) {
            var self = this;
            var newTodoList = todoAppView.todoLists.model.defaults(); // gets 
    
            var v = this.form.serializeArray();
    
            for(var i in v) {
               if(v.hasOwnProperty(i)) {
                   var field = v[i];
                   
                   newTodoList[field.name] = field.value;
               }
            }
    
            this.loading();  
            //console.log(this.form.serializeArray());
            if(newTodoList.hasOwnProperty('name') && newTodoList.name != '') {
                this.collection.create(newTodoList, {"wait": true, "success":function(){
                    
                    console.log(arguments);
                    self.formName.val('');
                    self.loading(false);
                    self.formName.focus();
                }});
            } else {
                // failed validation
                alert('name required');
                self.loading(false);
            }
            
            
            return false;
        },
        
        render: function() {
            var self = this;
            this.form = $('<form><input type="text" placeholder="new todo list name" name="name" /><button><span class="update icon"><a href="#"></a></span></button></form>'); //.submit(this.submit);
            this.formName = this.form.find('input');
            $(this.el).html(this.form);
            
            return this;
        },
        initialize: function() {
            
        }
    });
    
    var TodoListsView = Backbone.View.extend({
        events: {
            "click li.filterListOff": "filterListOff",
            "click li.filterNoList": "filterNoList"
        },
        render: function() {
            this.$el.html('<ul><li class="filterListOff"><span class="name">All Todos</span></li><li class="filterNoList"><span class="name">Todos not on a list</span></li></ul>');
            
            var $ul = this.$ul = this.$el.find('ul');
            
            require(['jquery.ui.min.js'], function(){
                var sortUpdate = function(event, ui) {
                    $ul.addClass('sorted');
                }
                $ul.sortable({ axis: 'y', handle: '.moveHandle', update: sortUpdate });
                $ul.disableSelection();
            });
                        
            return this;
        },
        initialize: function() {
            require(['jquery.ui.min.js']);
        },
        appendRow: function(e) {
            this.$ul.append(e);
        },
        refreshPager: function() {
            $('#todoListsCollectionShowing').html(this.collection.length);
            $('#todoListsCollectionCount').html(this.collection.collectionCount);
        },
        filterListOff: function() {
            window.todoAppView.todoAppRouter.navigate('todo', true);
        },
        filterNoList: function() {
            window.todoAppView.todoAppRouter.navigate('nolist', true);
        }
    });
    
    var TodoListsSelectorView = Backbone.View.extend({
        
        events: {
          "click li": "select",
        },
        select: function(ev) {
            this.trigger('select', $(ev.currentTarget));
        },
        render: function() {
            $(this.el).html('<ul></ul>');
            
            var $ul = this.$ul = this.$el.find('ul');
            
            this.collection.each(function(todoList){
                var $li = $('<li data-id="'+todoList.get('id')+'" data-name="'+todoList.get('name')+'"><span class="name">'+todoList.get('name')+'</span></li>');
                $ul.append($li);
            });
            
            return this;
        },
        initialize: function() {
            
        }
    });
    
    var TodoListFilterView = Backbone.View.extend({
        
        events: {
          "click li": "filterOn",
        },
        
        filterOn: function(e) {
            var filter = $(e.target).attr('data-filter');
            
            $(e.target).siblings().toggleClass('selected');
            $(e.target).toggleClass('selected');
            
            this.filter = this.$el.find('li.selected').attr('data-filter');
            
            this.trigger('filter', this.filter);
        },
        
        render: function() {

            var filterTodoClass = '';
            var filterDoneClass = '';

            if(this.filter === 'todo') {
                filterTodoClass = ' class="selected"';
            }
            if(this.filter === 'done') {
                filterDoneClass = ' class="selected"';
            }

            this.$el.html('<li data-filter="todo"'+filterTodoClass+'>Todo <span id="todosCollectionNotDoneCount"></span></li><li data-filter="done"'+filterDoneClass+'>Done <span id="todosCollectionDoneCount"></span></li>');
            
            return this;
        },
        initialize: function() {
            this.filter = 'todo';
        }
    });
    
    var TodoListRow = Backbone.View.extend({
        
        tagName: "li",
        
        className: "todoListRow clearfix",
        
        htmlTemplate: '<span class="moveHandle" title="<%= rank %>"><span class="muve icon"><a href="#"></a></span></span>\
                        <span class="name"><%= name %></span>\
                        <span class="progress">\
                            <span class="doneCount"><%= doneCount %></span> / <span class="todosCount"><%= todosCount %></span>\
                        </span>\
                        <span class="createdAt" data-datetime="<%= createdAt %>" title="<%= createdAtFormatted %>"><%= createdAtShort %></span>\
                        <button class="delete iconBtn"><span class="trash icon"><a href="#"></a></span></button>',
        
        template: function(todo) {
            
            var createdAtFormatted = new Date(todo.createdAt);
            todo.createdAtFormatted = createdAtFormatted.toLocaleString();
            
            todo.createdAtShort = (createdAtFormatted.getMonth()+1)+'/'+createdAtFormatted.getDate()+' @ '+createdAtFormatted.getHours()+':'+createdAtFormatted.getMinutes();
            
            var template = $(_.template(this.htmlTemplate, todo));
            
            this.$el.attr('id', this.model.get("id"));
            this.$el.attr('data-rank', this.model.get("rank"));
            
            return template;
        },
        render: function() {
            var modelJson = this.model.toJSON();
            
            if(!modelJson.hasOwnProperty('doneCount')) {
                modelJson.doneCount = 0;
            }
            if(!modelJson.hasOwnProperty('notDoneCount')) {
                modelJson.notDoneCount = 0;
            }
            modelJson.todosCount = modelJson.notDoneCount + modelJson.doneCount;
            
            var html = this.template(modelJson);
            
            this.$el.html('');
            this.$el.append(html);
            
            this.trigger('resize');
            
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click": "select",
          //"touchstart input": "touchstartstopprop",
          "click input[type=checkbox]"  : "toggleDone",
          //"dblclick .title"             : "edit",
          "click .editMode .title"             : "edit",
          "click .selected .title"             : "edit",
          "click .delete"               : "destroy",
          "keypress .title-input"        : "updateOnEnter",
          "blur .title-input"        : "closeAndCancel"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            
            // deselect everything else first
            $(this.el).siblings().removeClass('selected');
            $(this.el).siblings().removeAttr('selected');
            
            $(this.el).addClass("selected");
            $(this.el).attr("selected", true);
            
            if($('#todoLists').hasClass("editMode")) {
                
            } else {
                window.todoAppView.todoAppRouter.navigate('todoListId/'+this.model.get("id"), true);            
            }
            
            this.trigger('resize');
        },
        toggleDone: function(e) {
          
        },
        edit: function(e) {
          $(this.el).addClass("editing");
          $(e.target).hide();
          this.$titleInput = $('<input type="text" value="'+this.model.get('name')+'" class="name-input" />');
          $(e.target).before(this.$titleInput);
          this.$titleInput.focus();
        },
        closeAndSave: function(ele) {
            var val = this.$titleInput.val();
            if(val != '') {
                //$(ele).remove();
                $(this.el).removeClass("editing");
                $(this.el).find('.name').show();
                this.model.set({"name": val}, {wait: true});
            }
        },
        closeAndCancel: function() {
            this.$titleInput.remove();
            $(this.el).removeClass("editing");
            $(this.el).find('.name').show();
        },
        updateOnEnter: function(e) {
          if (e.keyCode == 13) this.closeAndSave(e.target);
        },
        remove: function() {
          $(this.el).remove();
        },
        destroy: function() {
          if(confirm("Are you sure you want to remove this todo list?")) {
            this.model.destroy({success: function(model, response) {
                  console.log('delete');
                }, 
                errorr: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
          }
        }
    });
    
    
    var TodoRow = Backbone.View.extend({
        
        tagName: "li",
        
        className: "todoRow clearfix",
        
        htmlListTemplate: "<span class='list' data-list-id='<%= list ? list.id : '' %>'><%= list ? list.name : '' %></span>",
        
        htmlTemplate: '<span class="moveHandle" title="<%= rank %>"><span class="muve icon"><a href="#"></a></span></span>\
                        <input class="check" type="checkbox" <%= done ? \'checked="checked"\' : \'\' %> /> \
                        <span class="title"><%= title %></span><%= listHtml %><span class="createdAt" data-datetime="<%= createdAt %>" title="<%= createdAtFormatted %>"><%= createdAtShort %></span><button class="edit iconBtn"><span class="edit icon"><a href="#"></a></span></button><button class="move iconBtn"><span class="list icon"><a href="#"></a></span></button><button class="delete iconBtn"><span class="trash icon"><a href="#"></a></span></button>',
        
        template: function(todo) {
            
            var createdAtFormatted = new Date(todo.createdAt);
            todo.createdAtFormatted = createdAtFormatted.toLocaleString();
            todo.createdAtShort = (createdAtFormatted.getMonth()+1)+'/'+createdAtFormatted.getDate()+' @ '+createdAtFormatted.getHours()+':'+createdAtFormatted.getMinutes();
            
            if(!todo.list) { todo.list = false; }
            if(!todo.rank) { todo.rank = ''; }
            
            todo.listHtml = _.template(this.htmlListTemplate, todo);

            var template = $(_.template(this.htmlTemplate, todo));
            
            this.$el.attr('id', this.model.get("id"));
            this.$el.attr('rank', this.model.get("rank"));
            
            return template;
        },
        render: function() {
            var modelJson = this.model.toJSON();
            
            var html = this.template(modelJson);
            
            this.$el.html('');
            this.$el.append(html);
            
            this.trigger('resize');
            
            this.setElement(this.$el);
            
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "touchstart .title": "touchstartstopprop",
          "click .title": "select",
          "touchstart input[type=checkbox]": "touchstartstopprop",
          "click input[type=checkbox]"  : "toggleDone",
          "touchstart .selected .title": "touchstartstopprop",
          "click .selected .title"             : "editName",
          "touchstart .edit": "touchstartstopprop",
          "click .edit"             : "editName",
          "touchstart .delete": "touchstartstopprop",
          "click .delete"               : "destroy",
          "touchstart .move": "touchstartstopprop",
          "click .move"               : "move",
          "keypress .title-input"        : "updateOnEnter",
          "blur .title-input"        : "closeAndCancel"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function(e) {
            // deselect everything else first
            $(this.el).siblings().removeClass('selected');
            $(this.el).siblings().removeAttr('selected');
            
            $(this.el).addClass("selected");
            $(this.el).attr("selected", true);
            
            this.trigger('resize');
        },
        toggleDone: function(e) {
          this.model.toggle();
        },
        editName: function(e) {
            var name = this.model.get('title');
            var val = prompt('edit todo title', name);
            if(val && val !== '' && val !== name) {
                this.model.set({"title": val}, {wait: true});
            }
            //e.stopPropagation();
            //e.preventDefault();
            return false;
        },
        edit: function(e) {
          $(this.el).addClass("editing");
          $(e.target).hide();
          this.$titleInput = $('<input type="text" value="'+this.model.get('title')+'" class="title-input" />');
          $(e.target).before(this.$titleInput);
          this.$titleInput.focus();
        },
        closeAndSave: function(ele) {
            var val = this.$titleInput.val();
            if(val != '') {
                //$(ele).remove();
                $(this.el).removeClass("editing");
                $(this.el).find('.title').show();
                this.model.set({"title": val}, {wait: true});
            }
        },
        closeAndCancel: function() {
            this.$titleInput.remove();
            $(this.el).removeClass("editing");
            $(this.el).find('.title').show();
        },
        updateOnEnter: function(e) {
          if (e.keyCode == 13) this.closeAndSave(e.target);
        },
        move: function() {
            var thisModel = this.model;
            
            var $selectorEl = $('<div id="todoListSelector" class="pTodoListSelector"><ul></ul></div>');
            
            var $selectorPageHeader = $('<button id="todo-list-selector-back" class="pTodoListSelector back" style=""><span class="arrow-alt2 back icon"><a href="#"></a></span></button><h1 id="todos-list-selector-title" class="pTodoListSelector title">Pick a list:</h1>');
            $selectorPageHeader.find('.back').click(function(){
                //body.pageShow('pTodoList');
                todoAppView.todoAppRouter.navigate('todo', true);
                return false;
            });
            todoAppView.appendPage($selectorEl, $selectorPageHeader);
            
            this.todoListsSelectorView = new TodoListsSelectorView({el: $selectorEl, collection: todoAppView.todoLists});
            this.todoListsSelectorView.render();
            this.trigger('resize');
            todoAppView.scroller.scrollTo(0, 0, 0);
            this.todoListsSelectorView.on('select', function(todoList) {
                thisModel.set({"list": {"id": todoList.attr('data-id'), "name": todoList.attr('data-name')}}, {wait: true});
                //body.pageShow('pTodoList');
                todoAppView.todoAppRouter.navigate('todo', true);
            });
        },
        remove: function() {
          $(this.el).remove();
        },
        destroy: function() {
          if(confirm("Are you sure you want to remove this todo?")) {
            this.model.destroy({success: function(model, response) {
                  console.log('delete');
                }, 
                errorr: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
          }
          return false;
        }
    });
    
    if(define) {
        define(function () {
            return BodyView;
        });
    }
    
})();
