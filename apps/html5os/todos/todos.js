(function() {
    
    var Model = Backbone.Model.extend({
        collectionName: "todos",
        initialize: function(attr, opts) {
            var colOpts = {
                image: this
            };
            this.on("change", function(model, options){
                console.log(arguments);
            });
            this.views = {};
            this.statusNames = { 0: "todo", 1: "done" };
        },
        defaults: function() {
          return {
            done:  0
          };
        },
        getStatus: function() {
            return this.statusNames[this.get("done")];
        },
        toggle: function() {
            var self = this;
            this.set({'done': Math.abs(this.get("done")-1)}, {silent: true});
            var saveModel = this.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.renderViews();
            });
        },
        getOwner: function(callback) {
            if(this.has('owner')) {
                var owner = this.get('owner');
                var user = window.usersCollection.getOrFetch(owner.id, callback);
            }
        },
        getRow: function(options) {
            options = options || {};
            options.model = this;
            if (!this.row) {
                var row = this.row = new RowView(options);
                this.views.row = row;
            }
            return this.row;
        },
        renderViews: function() {
            for(var i in this.views) {
                this.views[i].render();
            }
        },
        getNavigatePath: function() {
            return 'id/'+this.id;
        },
        getList: function(callback) {
            if(this.has('list')) {
                var listDoc = this.get('list');
                console.log(listDoc);
                if(listDoc && listDoc.id) {
                    window.todoListsCollection.getOrFetch(listDoc.id, function(todoList){
                        console.log(todoList);
                        if(todoList) {
                            callback(todoList)
                        } else {
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            }
        }
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'todos',
        url: '/api/todos',
        initialize: function() {
            var self = this;
            self.pageSize = 1000;
            this.resetFilters();
            require(['/desktop/socket.io.min.js'], function() {
                var socketOpts = {};
                if(window.location.protocol.indexOf('https') !== -1) {
                    socketOpts.secure = true;
                } else {
                    socketOpts.secure = false;
                }
                var socket = self.io = io.connect('//'+window.location.host+'/socket.io/io', socketOpts);
                if(socket.socket.connected) {
                    //console.log('already connected and now joining '+self.collectionName);
                    socket.emit('join', self.collectionName);
                }
                socket.on('connect', function(data) {
                    //console.log('connected and now joining '+self.collectionName);
                    socket.emit('join', self.collectionName);
                });
                var insertOrUpdateDoc = function(doc) {
                    console.log(doc);
                    if(_.isArray(doc)) {
                        _.each(doc, insertOrUpdateDoc);
                        return;
                    }
                    var model = self.get(doc.id);
                    if(!model) {
                        var model = new self.model(doc);
                        self.add(model);
                    } else {
                        console.log(model);
                        model.set(doc, {silent:true});
                        model.renderViews();
                    }
                }
                socket.on('insertedTodos', function(doc) {
                    console.log('inserted todo');
                    insertOrUpdateDoc(doc);
                    self.count++;
                    self.trigger('count', self.count);
                });
                socket.on('updatedTodos', function(doc) {
                    insertOrUpdateDoc(doc);
                });
                socket.on('deletedTodos', function(id) {
                    self.remove(id);
                    self.count--;
                    self.trigger('count', self.count);
                });
                
                self.initialized = true;
                self.trigger('initialized');
            });
        },
        headCount: function(options, callback) {
            if (!options) {
                options = {};
            }
            var self = this;
            var aj = $.ajax({
                type: "HEAD",
                url: self.url,
                data: options,
                complete: function(json) {
                    callback(aj.getResponseHeader("X-Count"));
                },
                xhrFields: {
                    withCredentials: true
                }
            });
        },
        refreshCount: function(options) {
            var self = this;
            self.headCount(options, function(count){
                self.count = count;
                self.trigger('count', count);
            });
        },
        load: function(options, success) {
            var self = this;
            if(!options) {
                options = {};
            }
            if(!options.limit) {
                options.limit = self.pageSize;
            }
            if(!options.sort) {
                options.sort = "at-";
            }
            if(!this.count) {
                this.refreshCount(options);
            }
            this.applyFilters(options);
            this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                    if(success) {
                        success();
                    }
                },
                error: function(collection, response){
                }
            });
        },
        getNextPage: function(callback) {
            if(this.length < this.count) {
                this.load({skip:this.length}, callback);
            }
        },
        applyFilters: function(options) {
            
        },
        updateFilter: function(filter) {
            this.reset();
            this.load();
        },
        comparator: function(doc) {
            var d;
            if(doc.get("dueAt")) {
                d = new Date(doc.get("dueAt")).getTime();
                return d * -1;
            } else if(doc.get("at")) {
                d = new Date(doc.get("at")).getTime();
                return d * -1;
            } else {
                return 1;
            }
        },
        resetFilters: function() {
        },
        getOrFetch: function(id, callback) {
            var self = this;
            var doc;
            doc = this.get(id);
            if(doc) {
                callback(doc);
            } else {
                var options = { "_id": id };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = self.get(id);
                            callback(doc);
                        } else {
                            callback(false);
                        }
                    },
                    error: function(collection, response){
                        callback(false);
                    }
                });
            }
        },
        getNewView: function(options) {
            var self = this;
            if (!options) options = {};
            if(!options.collection) options.collection = this;
            return new ListView(options);
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("view")) {
                this.view = this.getNewView(options);
                this.view.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.view;
        },
        getNewForm: function(options) {
            var self = this;
            if (!options) options = {};
            if(!options.collection) options.collection = this;
            return new FormView(options);
        },
        getForm: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("formView")) {
                if(!options.collection) options.collection = this;
                this.formView = new FormView(options);
            }
            return this.formView;
        },
        getSelectView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("selectView")) {
                options.collection = this;
                this.selectView = new SelectListView(options);
                this.selectView.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.selectView;
        }
    });
    
    var ListView = Backbone.View.extend({
        layout: 'row',
        initialize: function() {
            var self = this;
            self.loading = false;
            this.$filters = $('<div class="list-filters" data-filter="showTodo"><button class="showTodo">show todos</button> <button class="showAll">show all</button></div>');
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> todos</div>');
            var $ul = this.$ul = $('<ul class="todos"></ul>');
            this.collection.on('add', function(doc) {
                var view;
                if(self.layout === 'row') {
                    view = doc.getRow({list: self});
                }
                self.appendRow(view);
                self.renderPager();
                doc.on('remove', function(){
                    view.$el.remove();
                    return false;
                });
            });
            this.collection.on('remove', function(doc, col, options) {
                self.renderPager();
            });
            this.collection.on('count', function() {
                self.renderPager();
            });
            this.collection.on('reset', function(){
                self.render();
            });
            
            this.filterShowTodo();
        },
        getFilterDefault: function() {
            return {"done": 0};
        },
        filterByTodoList: function(todoList, callback) {
            var self = this;
            console.log(todoList)
            console.log(self.todoList)
            if(!todoList) {
                delete self.todoList;
                this.filter(this.getFilterDefault());
                return;
            }
            self.todoList = todoList.clone();
            this.filter({"list.id": todoList.id}, function(){
                if(callback) {
                    callback();
                }
                //self.todoList = todoList;
                console.log(self.todoList)
            });
        },
        applyFilter: function(obj) {
            if(!this.currentFilterO) {
                this.currentFilterO = {};
            }
            for(var o in obj) {
                this.currentFilterO[o] = obj[o];
                if(_.isNull(obj[o])) {
                    delete this.currentFilterO[o];
                }
            }
            this.filter(this.currentFilterO);
        },
        filter: function(f, callback) {
            var self = this;
            for(var i in this.$ul[0].dataset) {
                delete this.$ul[0].dataset[i];
            }
            if (f && typeof f == "function") {
                this.currentFilter = f;
                var flen = this.collection.filter(function(model) {
                    if (f(model)) {
                        self.getDocLayoutView(model).$el.show();
                        return true;
                    }
                    self.getDocLayoutView(model).$el.hide();
                    return false;
                }).length;
                this.filterLength = flen;
                self.renderPager();
                if(callback) {
                    callback();
                }
            } else if(f) {
                for(var i in f) {
                    this.$ul.attr('data-filter-'+i.replace(/\./g,'-'), f[i]);
                    if(i == 'list.id') {
                        var todoList = todoListsCollection.get(f[i]);
                        if(todoList) {
                            //this.$ul.attr('data-todo-list-name')
                        }
                    }
                }
                this.currentFilterO = _.clone(f);
                this.currentFilter = function(model) {
                    var l = _.size(this.currentFilterO);
                    for(var i in this.currentFilterO) {
                      if(this.currentFilterO[i] instanceof RegExp) {
                          if(this.currentFilterO[i].test(model.get(i))) {
                              l--;
                          }
                      } else {
                        if(i == 'list.id') {
                            var list = model.get('list');
                            if(list && list.id && list.id == this.currentFilterO[i]) {
                                l--;
                            }
                        } else if (this.currentFilterO[i] === model.get(i)) {
                            l--;
                        }
                      }
                    }
                    if(l === 0) {
                        return true;
                    }
                    return false;
                }
                var flen = this.collection.filter(function(model) {
                    if (self.currentFilter(model)) {
                        self.getDocLayoutView(model).$el.show();
                        return true;
                    }
                    self.getDocLayoutView(model).$el.hide();
                    return false;
                }).length;
                delete this.collection.count;
                this.filterLength = flen;
                self.filterLoadOptions = _.clone(f);
                var loadO = _.clone(f);
                loadO.skip = 0; //flen;
                this.collection.load(loadO, function(){
                    self.filterLength = self.collection.filter(self.currentFilter).length
                    self.renderPager();
                    if(callback) {
                        callback();
                    }
                });
            } else {
                self.$ul.children().show();
                self.currentFilter = false;
                self.filterLength = false;
                self.filterLoadOptions = false;
                delete this.collection.count;
                this.collection.load({}, function(){
                    self.renderPager();
                    if(callback) {
                        callback();
                    }
                });
            }
        },
        deselectAll: function() {
            this.$ul.children().removeClass('selected');
            this.$ul.children().removeAttr('selected');
        },
        events: {
          "click .list-pager": "loadMore",
          "click .list-filters .showTodo": "filterShowTodo",
          "click .list-filters .showAll": "filterShowAll"
        },
        loadMore: function() {
            var self = this;
            this.collection.getNextPage(function(){
                self.loading = false;
            });
        },
        filterShowTodo: function() {
            var self = this;
            this.$filters.attr('data-filter', 'showTodo');
            this.applyFilter({"done": 0});
        },
        filterShowAll: function() {
            var self = this;
            this.$filters.attr('data-filter', 'showAll');
            this.applyFilter({"done": null});
        },
        getDocLayoutView: function(doc) {
            var view;
            if(this.layout === 'row') {
                view = doc.getRow({list: self});
            } else if(this.layout === 'avatar') {
                view = doc.getAvatar({list: self});
            }
            return view;
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append(this.$ul);
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view = self.getDocLayoutView(doc);
                self.appendRow(view);
            });
            this.$el.append(this.$filters);
            this.$el.append(this.$pager);
            this.renderPager();
            this.trigger('resize');
            this.setElement(this.$el);
            return this;
        },
        renderPager: function() {
            var len = this.collection.length;
            var c = this.collection.count > len ? this.collection.count : len;
            if(this.currentFilter) {
                c = this.collection.count;
                len = this.collection.filter(this.currentFilter).length;
            } else {
                
            }
            if(len > c) {
                len = c;
            }
            this.$pager.find(".list-length").html(len);
            this.$pager.find(".list-count").html(c);
        },
        appendRow: function(row) {
            var rank = new Date(row.model.get('rank'));
            rank = rank.getTime();
            var rowEl = row.render().$el;
            if(this.currentFilter && !this.currentFilter(row.model)) {
                rowEl.hide();
            }
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$ul.children();
            var last = $lis.last();
            var lastRank = parseInt(last.attr('data-sort-rank'), 10);
            if(rank > lastRank) {
                $lis.each(function(i,e){
                    if(d) return;
                    var r = parseInt($(e).attr('data-sort-rank'), 10);
                    if(rank > r) {
                        $(e).before(rowEl);
                        d = true;
                    }
                });
            }
            if(!d) {
                this.$ul.append(rowEl);
            }
        }
    });
    
    var SelectListView = Backbone.View.extend({
        tagName: "select",
        className: "selectPost",
        initialize: function() {
            var self = this;
        },
        events: {
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append('<option></option>');
            //this.collection.sort({silent:true});
            postsCollection.each(function(doc){
                self.$el.append('<option value="'+doc.id+'">'+doc.get('title')+'</option>');
            });
            this.setElement(this.$el);
            return this;
        },
        val: function(v) {
            if(v) {
                this.$el.val(v.id);
            } else {
                var post_id = this.$el.val();
                if(post_id) {
                    var post = postsCollection.get(post_id);
                    var p = {
                        id: post_id
                    }
                    p.title = post.title;
                    if(post.has('slug')) {
                        p.slug = post.get('slug');
                    }
                    if(post.has('seq')) {
                        p.seq = post.get('seq');
                    }
                    if(post.has('youtube') && post.get('youtube').id) {
                        p.youtube = post.get('youtube');
                    }
                    return p;
                } else {
                    return false;
                }
            }
        }
    });
    
    var ActionsView = Backbone.View.extend({
        tagName: "span",
        className: "actions",
        render: function() {
            var self = this;
            this.$el.html('');
            //self.$el.append(this.tagsView.render().$el);
            //self.$el.append(this.groupsView.render().$el);
            //self.$el.append(this.editView.render().$el);
            self.$el.append(this.deleteView.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.actions = [];
            //this.groupsView = new GroupsView({id: this.id, model: this.model});
            //this.tagsView = new TagsView({id: this.id, model: this.model});
            this.deleteView = new ActionDeleteView({id: this.id, model: this.model});
            //this.editView = new ActionEditView({id: this.id, model: this.model});
        }
    });

    var ActionFeedView = Backbone.View.extend({
        tagName: "span",
        className: "feed",
        render: function() {
            if(!this.model.has('feed')) {
                this.$el.html('<button class="publish">publish to feed</button>');
            } else {
                var feed = this.model.get('feed');
                this.$el.html('published at <a href="/feed/item/'+feed.id+'" target="_new">'+feed.at+'</a><button class="unpublish">remove from feed</button>');
            }
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click .publish": "publish",
          "click .unpublish": "unpublish",
        },
        publish: function() {
            var self = this;
            console.log(this.model);
            this.model.set({"feed": 0},{silent: true});
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.render();
            });
            return false;
        },
        unpublish: function() {
            var self = this;
            console.log(this.model);
            this.model.unset("feed", {silent: true});
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.render();
            });
            return false;
        }
    });

    var ActionDeleteView = Backbone.View.extend({
        tagName: "span",
        className: "delete",
        render: function() {
            this.$el.html('<button>x</button>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click button": "select",
        },
        select: function() {
            var self = this;
            if(confirm("Are you sure that you want to delete this post?")) {
                this.model.destroy({success: function(model, response) {
                  window.history.back(-1);
                }, 
                errorr: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            }
            return false;
        }
    });
    
    var ActionEditView = Backbone.View.extend({
        tagName: "span",
        className: "edit",
        render: function() {
            this.$el.html('<button>edit</button>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click button": "select",
        },
        select: function() {
            var self = this;
            
             this.model.collection.trigger('editModel', this.model);
            
            return false;
        }
    });
    
    var TagsView = Backbone.View.extend({
        tagName: "span",
        className: "tags",
        render: function() {
            this.$el.html('');
            var tags = this.model.get("tags");
            if(tags) {
                for(var i in tags) {
                    var tagName = tags[i];
                    if(!_.isString(tagName)) {
                        var $btn = $('<button class="tag">'+tagName+'</button>');
                        $btn.attr('data-tag', JSON.stringify(tagName));
                        this.$el.append($btn);
                    } else {
                        this.$el.append('<button class="tag">'+tagName+'</button>');
                    }
                }
            }
            this.$el.append('<button class="newTag">+ tag</button>');
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click .newTag": "newTag",
          "click .tag": "removeTag"
        },
        removeTag: function(e) {
            var self = this;
            if(confirm("Are you sure that you want to remove this tag?")) {
                var tags = this.model.get("tags");
                var $tag = $(e.target);
                var tagName = '';
                if($tag.attr('data-tag')) {
                    tagName = JSON.parse($tag.attr('data-tag'));
                } else {
                    tagName = e.target.innerHTML;
                }
                this.model.pull({"tags": tagName}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        newTag: function() {
            var self = this;
            var tagName = prompt("Enter tags, separated, by commas.");
            if(tagName) {
                tagName = tagName.split(',');
                for(var i in tagName) {
                    var tag = tagName[i];
                    tagName[i] = tag.trim(); // trim extra white space
                }
                if(tagName) {
                    if(!this.model.has("tags")) {
                        this.model.set({'tags': tagName}, {silent: true});
                        var saveModel = this.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        saveModel.done(function() {
                            console.log('tags saved');
                        });
                    } else {
                        this.model.pushAll({"tags": tagName}, {silent: true});
                        var saveModel = this.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        saveModel.done(function() {
                            self.render();
                        });
                    }
                }
            }
        }
    });

    var GroupsView = Backbone.View.extend({
        tagName: "span",
        className: "groups",
        initialize: function() {
        },
        render: function() {
            this.$el.html('');
            var groups = this.model.get("groups");
            if(groups) {
                for(var i in groups) {
                    var groupName = groups[i];
                    this.$el.append('<button class="group">'+groupName+'</button>');
                }
                if(groups.indexOf('public') === -1) {
                    this.$el.append('<button class="publicGroup">+ public</button>');
                }
                if(groups && groups.length > 0) {
                    this.$el.append('<button class="privateGroup">+ private</button>');
                }
            }
            this.$el.append('<button class="newGroup">+ group</button>');
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click .newGroup": "newGroup",
          "click .group": "removeGroup",
          "click .publicGroup": "publicGroup",
          "click .privateGroup": "privateGroup"
        },
        privateGroup: function() {
            var self = this;
            if(confirm("Are you sure that you want to make this private?")) {
                this.model.set({"groups": []}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        publicGroup: function() {
            var self = this;
            if(confirm("Are you sure that you want to make this public?")) {
                this.model.push({"groups": "public"}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        removeGroup: function(e) {
            var self = this;
            if(confirm("Are you sure that you want to remove this group?")) {
                var groups = this.model.get("groups");
                var name = e.target.innerHTML;
                this.model.pull({"groups": name}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        newGroup: function() {
            var self = this;
            var groupName = prompt("Enter groups, separated, by commas.");
            if(groupName) {
                groupName = groupName.split(',');
                
                for(var i in groupName) {
                    var g = groupName[i];
                    groupName[i] = g.trim(); // trim extra white space
                }
                if(groupName) {
                    if(!this.model.get("groups")) {
                        this.model.set({'groups': groupName}, {silent: true});
                    } else {
                        this.model.pushAll({"groups": groupName}, {silent: true});
                    }
                    var saveModel = this.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
        }
    });


    var RowView = Backbone.View.extend({
        tagName: "li",
        className: "row",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.actions = new ActionsView({model: this.model});
            this.$check = $('<input class="check" type="checkbox" />');
            this.$title = $('<span class="title"></span>');
            this.$listRef = $('<span class="listRef"></span>');
            
            this.$titleInput = $('<input type="text" name="title" />');
            this.$dueAtInput = $('<span class="due">due on <span class="dueAt"></span></span>');
            this.$dueAtDateInput = $('<input name="dueAt-date" type="date" title="Due At" />');
            //this.$dueAtTimeInput = $('<input name="dueAt-time" type="time" />');
            
            this.selectTodoListView = new todoListsCollection.getSelectView({todo: this.model});
        },
        render: function() {
            var self = this;
            console.log('render todo row');
            if(this.model.get('done')) {
                this.$check.attr('checked', 'checked');
            } else {
                this.$check.removeAttr('checked');
            }
            
            if(this.model.get('title')) {
                this.$title.text(this.model.get('title'));
                this.$titleInput.val(this.model.get('title'));
            }
            
            if(this.model.has('dueAt')) {
                var m = moment(this.model.get('dueAt'));
                this.$dueAtDateInput.val(m.format('YYYY-MM-DD'));
                //this.$dueAtTimeInput.val(m.format('HH:mm'));
                this.$dueAtInput.find('.dueAt').html(m.calendar());
                this.$dueAtInput.attr('data-at', m);
            }
            
            if(this.model.has('list')) {
                var list = this.model.get('list');
                console.log(list);
                if(list) {
                    this.$listRef.attr('data-id', list.id);
                    this.$listRef.text(list.name);
                    this.selectTodoListView.val(this.model.get('list'));
                    
                    // improve the list data from src
                    this.model.getList(function(list){
                        
                        list.on('change', function(){
                            console.log('`````````````````listchanged');
                            self.render();
                        });
                        
                        var $listA = '<a href="'+list.getNavigatePath()+'">'+list.get('name')+'</a>';
                        self.$listRef.html($listA);
                        
                        if(list.has('color')) {
                            self.$el.css('border-left-color', list.get('color'));
                        }
                    });
                } else {
                    this.$listRef.removeAttr('data-id');
                    this.$listRef.text('');
                    this.selectTodoListView.val('');
                }
            } else {
                this.$listRef.removeAttr('data-id');
                this.$listRef.text('');
                this.selectTodoListView.val('');
            }
            
            this.$el.append(this.$check);
            this.$el.append(this.$titleInput);
            this.$el.append(this.$dueAtInput);
            this.$el.append(this.$dueAtDateInput);
            //this.$el.append(this.$dueAtTimeInput);
            this.$el.append(this.$title);
            this.$el.append(this.$listRef);
            
            this.$el.append(this.selectTodoListView.render().$el);
            
            this.$el.append(this.actions.render().$el);
            
            this.$el.attr('data-id', this.model.id);
            this.setElement(this.$el);
            return this;
        },
        expand: function(expand) {
            if(expand === false) {
                this.$el.removeClass('expanded');
            } else {
                this.$el.toggleClass('expanded');
            }
        },
        isSelected: function() {
            return (this.$el.hasClass('selected'));
        },
        events: {
          "click input[type=checkbox]" : "toggleDone",
          "click": "select",
          "click .listRef a": "selectTodoList",
          "blur input[name=title]": "saveTitle",
          "keypress input[name=title]": "saveOnEnter",
          "click .due": "setDueDate",
          "change input[name=dueAt-date]": "changeDueDate",
          "change select.todoListSelect": "changeTodoList"
        },
        select: function(e) {
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            deselectSiblings(this.$el);
            var deselect = false;
            if(this.isSelected()) {
                deselect = true;
            }
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.hasOwnProperty('list')) {
                this.list.trigger('select', this);
            }
            if(deselect === false) {
                this.$titleInput.focus();
            }
            this.trigger('select');
        },
        selectTodoList: function(e) {
            var self = this;
            this.model.getList(function(list){
                if(self.hasOwnProperty('list')) {
                    self.list.trigger('selectTodoList', list);
                }
                self.trigger('selectTodoList', list);
            });
            return false;
        },
        toggleDone: function(e) {
            this.model.toggle();
            e.stopPropagation();
        },
        saveTitle: function() {
            var self = this;
            var t = this.$titleInput.val();
            if(t && t != this.model.get('title')) {
                this.model.set({'title': this.$titleInput.val()}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
        },
        saveOnEnter: function(e) {
            if (e.keyCode == 13) {
                this.saveTitle();
            }
        },
        setDueDate: function() {
            
        },
        changeDueDate: function() {
            var self = this;
            console.log(this.$dueAtDateInput);
            
            var atDate = this.$dueAtDateInput.val();
            var atTime = '00:00';//this.$inputAtTime.val();
            
            if(atDate && atTime) {
                var formDate = moment(atDate+' '+atTime, "YYYY-MM-DD HH:mm");
                var at = new Date(this.model.get('at'));
                if(formDate && at.getTime() !== formDate.toDate().getTime()) {
                    //setDoc.at = formDate.toDate();
                    this.model.set({'dueAt': formDate.toDate()}, {silent: true});
                    var saveModel = this.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.render();
                        });
                    }
                }
            }
        },
        changeTodoList: function(e) {
            var self = this;
            //console.log(this.selectTodoListView.val());
            var list = this.selectTodoListView.val();
            if(list) {
                this.model.set({'list': list}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                }
            } else {
                this.model.unset('list', {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
        },
        remove: function() {
          this.$el.remove();
        }
    });
    
    window.nl2br = function(str) {
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + "<br />");
    };
    
    var SelectGroupsView = Backbone.View.extend({
        tagName: "select",
        className: "groups",
        initialize: function() {
            this.$options = $('<option value="public">public</option><option value="private">private</option>');
        },
        render: function() {
            var self = this;
            this.$el.attr('name', 'groups');
            this.$el.append(this.$options);
            if(this.model && this.model.has('groups') && this.model.get('groups').indexOf('public') !== -1) {
                this.$el.val('public');
                this.$options.find('option[value="public"]').attr('selected','selected');
            } else {
                this.$el.val('private');
                this.$options.find('option[value="private"]').attr('selected','selected');
            }
            this.setElement(this.$el);
            return this;
        },
        val: function() {
            var groups = [];
            if(this.$el.val() == 'public') {
                groups = ['public'];
            }
            return groups;
        },
        events: {
        },
    });
    
    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "form",
        initialize: function() {
            console.log(this.options);
            var self = this;
            if(this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
            } else {
                if(!this.model) {
                    this.model = new Model({}, {
                        collection: this.collection
                    });
                } else {
                }
            }
            
            this.$inputTitle = $('<input type="text" name="title" placeholder="The next thing to do..." autocomplete="off" />');
            this.$form = $('<form class="todo"><fieldset></fieldset><controls></controls></form>');
            this.$form.find('fieldset').append(this.$inputTitle);
            this.$form.find('controls').append('<input type="submit" value="Save" />');
        },
        render: function() {
            var self = this;
            if(this.$el.find('form').length === 0) {
                this.$el.append(this.$form);
            }
            if(this.model) {
                if(this.model.has('title')) {
                    this.$inputTitle.val(this.model.get('title'));
                } else {
                    this.$inputTitle.val('');
                }
            } else {
                this.$inputTitle.val('');
            }
            this.setElement(this.$el);
            return this;
        },
        events: {
            "submit form": "submit"
        },
        submit: function() {
            var self = this;
            var setDoc = {};
            var title = this.$inputTitle.val();
            if(title !== '' && title !== this.model.get('title')) {
                setDoc.title = title;
            } else {
                //alert('Enter something you need to do.');
                self.focus();
                return false;
            }
            //console.log('setDoc')
            //console.log(setDoc)
            if(self.collection.view.todoList) {
                var todoList =self.collection.view.todoList;
                setDoc.list = {
                    id: todoList.id,
                    name: todoList.get('name')
                }
            }
            this.model.set(setDoc, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.collection.add(self.model);
                    self.trigger("saved", self.model);
                });
            } else {
                self.trigger("saved", self.model);
            }
            return false;
        },
        clear: function() {
            this.$inputTitle.val('');
        },
        focus: function() {
            this.$inputTitle.focus();
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    if(define) {
        define(function () {
            return {
                Collection: Collection,
                Model: Model,
                List: ListView,
                Row: RowView,
                Form: FormView
            }
        });
    }
})();