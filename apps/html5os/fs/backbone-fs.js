(function() {
    
    var Model = Backbone.Model.extend({
        collectionName: "fs",
        initialize: function(attr, opts) {
            var colOpts = {
                image: this
            };
            //attr.sizes = attr.sizes || [];
            //this.imageSizeCollection = new ImageSizeCollection(attr.sizes, colOpts);
            this.on("change", function(model, options){
                console.log(arguments);
            });
            this.views = {};
        },
        getOwner: function(callback) {
            if(this.has('owner')) {
                var owner = this.get('owner');
                var user = window.usersCollection.getOrFetch(owner.id, callback);
            }
        },
        getFullView: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.fullView) {
                var view = this.fullView = new FullView(options);
                view.on('goToProfile', function(model){
                    options.list.trigger('goToProfile', model);
                });
                this.views.fullView = view;
            }
            return this.fullView;
        },
        getAvatar: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.avatar) {
                var view = this.avatar = new AvatarView(options);
                this.views.avatar = view;
            }
            return this.avatar;
        },
        getRow: function(options) {
            options = options || {};
            options.id = this.get("_id");
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
            return this.id+'/';
        }
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'fs',
        url: '/api/fs',
        initialize: function(models, options) {
            var self = this;
            var path = options.path || '/';
            this.url = this.url + path;
            if(this.url.substr(-1) == '/') {
                this.url = this.url.substr(0, this.url.length-1);
            }
            this.path = path;
            this.resetFilters();
            
            require(['//'+window.location.host+'/desktop/socket.io.min.js'], function() {
                /*
                var socketOpts = {};
                if(window.location.protocol.indexOf('https') !== -1) {
                    socketOpts.secure = true;
                } else {
                    socketOpts.secure = false;
                }
                var socket = self.io = io.connect('//'+window.location.host+'/socket.io/io', socketOpts);
                socket.on('connect', function(data) {
                    console.log('connected and now joining '+self.collectionName);
                    socket.emit('join', self.collectionName+path);
                });
                var insertOrUpdateDoc = function(doc) {
                        console.log(doc);
                    if(_.isArray(doc)) {
                        _.each(doc, insertOrUpdateDoc);
                        return;s
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
                socket.on('insertedFs', function(doc) {
                    console.log('inserted fs');
                    insertOrUpdateDoc(doc);
                    self.count++;
                    self.trigger('count', self.count);
                });
                socket.on('updatedFs', function(doc) {
                    insertOrUpdateDoc(doc);
                });
                socket.on('deletedFs', function(id) {
                    self.remove(id);
                    self.count--;
                    self.trigger('count', self.count);
                });
                
                */
                self.initialized = true;
                self.trigger('initialized');
            });
        },
        headCount: function(callback) {
            var self = this;
            var aj = $.ajax({type: "HEAD",url: self.url,data: {},
                complete: function(json) {
                    callback(aj.getResponseHeader('X-Count'));
                },xhrFields: {withCredentials: true}
            });
        },
        refreshCount: function() {
            var self = this;
            self.headCount(function(count){
                self.count = count;
                self.trigger('count', count);
            });
        },
        parse: function(response) {
          if(!_.isArray(response) && response.hasOwnProperty('data')) {
            this.trigger('file', response);
            return [];
          } else {
            return response;
          }
        },
        load: function(options, success) {
            var self = this;
            if(!options) {
                options = {};
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
        applyFilters: function(options) {
            
        },
        updateFilter: function(filter) {
            this.reset();
            this.load();
        },
        comparator: function(doc) {
            var d;
            if(doc.get("name")) {
                return name;
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
        getOrFetchSlug: function(slug, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({slug:slug}));
            if(doc) {
                callback(doc);
            } else {
                var options = { "slug": slug };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = _.first(self.where({slug:slug}));
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
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("view")) {
                options.collection = this;
                this.view = new ListView(options);
                this.view.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.view;
        }
    });
    
    var ListView = Backbone.View.extend({
        layout: "row",
        className: "list",
        initialize: function() {
            var self = this;
            self.loading = false;
            this.$pager = $('<div class="list-pager"><span class="list-length"></span> files</div>');
            var $ul = this.$ul = $('<ul class="files" data-path="'+this.collection.path+'"></ul>');
            this.collection.on('add', function(doc) {
                console.log(doc)
                var view;
                if(self.layout === 'row') {
                    view = doc.getRow({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatar({list: self});
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
            /*
            $(window).scroll(function(){
                if(self.$el.is(":visible")) {
                  if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()){
                    self.loading = true;
                    self.loadMore();
                  }
                }
            });*/
        },
        filter: function(f) {
            var self = this;
            if(f && typeof f == 'function') {
                this.currentFilter = f;
                this.collection.filter(function(model) {
                  if(f(model)) {
                      self.getDocLayoutView(model).$el.show();
                      return true;
                  }
                  self.getDocLayoutView(model).$el.hide();
                  return false;
                });
            } else {
                // show all
                self.$ul.children().show();
                self.currentFilter = false;
            }
        },
        events: {
          //"click .list-pager": "loadMore",
        },
        loadMore: function() {
            var self = this;
            this.collection.getNextPage(function(){
                self.loading = false;
            });
        },
        getDocLayoutView: function(doc) {
            var view;
            if(this.layout === 'row') {
                view = doc.getRow({list: this});
            } else if(this.layout === 'avatar') {
                view = doc.getAvatar({list: this});
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
            this.$el.append(this.$pager);
            this.renderPager();
            this.trigger('resize');
            this.setElement(this.$el);
            return this;
        },
        renderPager: function() {
            var len = this.collection.length;
            var c = this.collection.count > len ? this.collection.count : len;
            this.$pager.find('.list-length').html(len);
            this.$pager.find('.list-count').html(c);
        },
        appendRow: function(row) {
            var rank = row.model.get('name');
            var rowEl = row.render().$el;
            /*if(this.currentFilter && !this.currentFilter(row.model)) {
                rowEl.hide();
            }*/
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$ul.children();
            var last = $lis.last();
            var lastRank = last.attr('data-sort-rank');
            if(rank < lastRank) {
                $lis.each(function(i,e){
                    if(d) return;
                    var r = $(e).attr('data-sort-rank');
                    if(rank < r) {
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
            this.model.set({"feed": 0}, {silent: true});
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
            this.$el.html('<button>delete</button>');
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
            if(confirm("Are you sure that you want to delete this file?")) {
                this.model.destroy({success: function(model, response) {
                  
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
            console.log(arguments);
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.actions = new ActionsView({model: this.model});
            this.actions.render().$el.hide();
        },
        render: function() {
            this.$el.html('');
            if(this.model.has('name')) {
                this.$el.append('<strong class="name">'+this.model.get('name')+'</strong>');
            }
            this.$el.attr('data-id', this.model.get("_id"));
            this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select",
          "contextmenu": "toggleActions"
        },
        select: function(e) {
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.hasOwnProperty('list')) {
                this.list.trigger('selected', this);
            }
            this.trigger('selected');
        },
        toggleActions: function(e) {
            console.log(e);
            this.actions.$el.toggle();
            return false;
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var FullView = Backbone.View.extend({
        tagName: "div",
        className: "fullView",
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            var self = this;
            this.$el.html('');
            var $byline = $('<span></span>');
            if(this.model.has('title')) {
                this.$el.append('<h1 class="title">'+this.model.get('title')+'</h1>');
            }
            if(this.model.has('owner')) {
                $byline.append(' <i>by</i> <span class="owner">'+this.model.get('owner').name+'</span>');
                $byline.attr('data-owner-id', this.model.get('owner').id);
                var owner = this.model.getOwner(function(owner){
                    if(owner) {
                        $byline.find('.owner').html('');
                        var ownerAvatarName = owner.getAvatarNameView();
                        ownerAvatarName.on('goToProfile', function(user){
                            self.trigger('goToProfile', user);
                        });
                        $byline.find('.owner').append(ownerAvatarName.render().$el);
                    }
                });
            }
            if(this.model.has('at')) {
                var $at = $('<span class="at"></span>');
                if(window.clock) {
                    $at.attr('title', clock.moment(this.model.get('at')).format('LLLL'));
                    $at.html(clock.moment(this.model.get('at')).calendar());
                } else {
                    $at.html(this.model.get('at'));
                }
                $byline.append(' ');
                $byline.append($at);
            }
            if(this.model.has('msg')) {
                var $msg = $('<span class="msg"></span>');
                $msg.html(this.model.get('msg'));
                this.$el.append($msg);
            }
            this.$el.append($byline);
            
            if(window.account && (account.isAdmin() || account.isOwner(this.model.get('owner').id))) {
                this.$el.append(this.actions.render().$el);
            }
            this.trigger('resize');
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            return this;
        },
        renderActions: function() {
            this.actions.render();
        },
        show: function() {
            this.$el.show();
        },
        events: {
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    
    window.nl2br = function(str) {
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + "<br />");
    };
    
    var AvatarView = Backbone.View.extend({
        tagName: "span",
        className: "avatar",
        render: function() {
            this.$el.html('');
            var $byline = $('<span class="byline"></span>');
            if(this.model.has('title')) {
                this.$el.append('<strong class="title">'+this.model.get('title')+'</strong>');
            }
            if(this.model.has('at')) {
                var $at = $('<span class="at"></span>');
                if(window.clock) {
                    $at.attr('title', clock.moment(this.model.get('at')).format('LLLL'));
                    $at.html(clock.moment(this.model.get('at')).calendar());
                } else {
                    $at.html(this.model.get('at'));
                }
                $byline.append($at);
            }
            if(this.model.has('owner')) {
                $byline.append(' by '+this.model.get('owner').name);
            }
            if(this.model.has('msg')) {
                var $msg = $('<span class="msg"></span>');
                $msg.html(this.model.get('msg'));
                this.$el.append($msg);
            }
            this.$el.append($byline);
            this.$el.attr('data-id', this.model.get("_id"));
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click": "select"
        },
        select: function(e) {
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            
            deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            
            if(this.hasOwnProperty('list')) {
                this.list.trigger('select', this);
            }
                
            this.trigger('select');
            this.trigger('resize');
        },
        remove: function() {
          $(this.el).remove();
        }
    });
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
            } else {
                console.log('rpv')
                this.$el.val('private');
                this.$options.find('option[value="private"]').attr('selected','selected');
            }
            this.setElement(this.$el);
            return this;
        },
        val: function() {
            var groups = [];
            if(this.$el.find('input').val() == 'public') {
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
            var self = this;
            this.$owner = $('');
            if(this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
                this.$owner = $(''+this.model.get('owner').name);
            } else {
                if(!this.model) {
                    this.model = new Model({}, {
                        collection: this.collection
                    });
                } else {
                }
            }
            this.wsyi_id = 'wysihtml5-'+this.cid;
            this.$inputTitle = $('<input type="text" name="title" placeholder="Title of your post" autocomplete="off" />');
            this.$msgToolbar = $('<div class="wysihtml5-toolbar" id="'+this.wsyi_id+'-toolbar"><header><ul class="commands">\
                  <li data-wysihtml5-command="bold" title="Make text bold (CTRL + B)" class="command"></li>\
                  <li data-wysihtml5-command="italic" title="Make text italic (CTRL + I)" class="command"></li>\
                  <li data-wysihtml5-command="insertUnorderedList" title="Insert an unordered list" class="command"></li>\
                  <li data-wysihtml5-command="insertOrderedList" title="Insert an ordered list" class="command"></li>\
                  <li data-wysihtml5-command="createLink" title="Insert a link" class="command"></li>\
                  <li data-wysihtml5-command="insertImage" title="Insert an image" class="command"></li>\
                  <li data-wysihtml5-command="formatBlock" data-wysihtml5-command-value="h1" title="Insert headline 1" class="command"></li>\
                  <li data-wysihtml5-command="formatBlock" data-wysihtml5-command-value="h2" title="Insert headline 2" class="command"></li>\
                  <li data-wysihtml5-command="insertSpeech" title="Insert speech" class="command"></li>\
                  <li data-wysihtml5-action="change_view" title="Show HTML" class="action"></li></ul></header>\
              <div data-wysihtml5-dialog="createLink" style="display: none;"><label>Link:<input data-wysihtml5-dialog-field="href" value="http://"></label><a data-wysihtml5-dialog-action="save">OK</a>&nbsp;<a data-wysihtml5-dialog-action="cancel">Cancel</a></div>\
              <div data-wysihtml5-dialog="insertImage" style="display: none;">\
                <label>Image:<input data-wysihtml5-dialog-field="src" value="http://"></label>\
                <a data-wysihtml5-dialog-action="save">OK</a>&nbsp;<a data-wysihtml5-dialog-action="cancel">Cancel</a></div></div>');
            this.$inputMsg = $('<textarea id="'+this.wsyi_id+'-textarea" name="msg" placeholder="Your message..."></textarea>');
            this.$inputSlug = $('<input type="text" name="slug" placeholder="post-title" />');
            this.$slugShare = $('<span class="slugShare"></span>');
            this.$slugShare.html('/posts/'); //window.location.origin+
            this.$slugShare.append(this.$inputSlug);
            
            this.$inputAtDate = $('<input name="at-date" type="date"/>');
            this.$inputAtTime = $('<input type="time"/>');
            
            this.atPublished = $('<span class="published"><span class="by">by <span class="owner"></span></span><br /><span class="at">at </span></span>');
            this.atPublished.find('.owner').append(this.$owner);
            this.atPublished.find('.at').append(this.$inputAtDate);
            this.atPublished.find('.at').append(this.$inputAtTime);
            
            this.inputGroupsView = new SelectGroupsView({model: this.model});
            this.feedView = new ActionFeedView({model: this.model});
            this.deleteView = new ActionDeleteView({model: this.model});
            
            this.$form = $('<form class="post"><fieldset></fieldset><controls></controls></form>');
            this.$form.find('fieldset').append(this.$inputTitle);
            this.$form.append(this.$msgToolbar);
            this.$form.find('fieldset').append(this.$inputMsg);
            this.$form.find('fieldset').append('<hr />');
            this.$form.find('fieldset').append(this.$slugShare);
            this.$form.find('fieldset').append(this.atPublished);
            this.$form.find('fieldset').append(this.feedView.render().$el);
            this.$form.find('fieldset').append(this.deleteView.render().$el);
            this.$form.find('controls').append(this.inputGroupsView.render().$el);
            this.$form.find('controls').append('<input type="submit" value="POST" />');
        },
        render: function() {
            var self = this;
            if(this.$el.find('form').length === 0) {
                console.log('append form');
                this.$el.append(this.$form);
            }
            if(this.model) {
                if(this.model.has('title')) {
                    this.$inputTitle.val(this.model.get('title'));
                }
                if(this.model.has('msg')) {
                    this.$inputMsg.val(this.model.get('msg'));
                }
                if(this.model.has('slug')) {
                    this.$inputSlug.val(this.model.get('slug'));
                }
                if(this.model.has('groups')) {
                    this.inputGroupsView.val(this.model.get('groups'));
                }
                if(this.model.has('at')) {
                    this.$inputAtDate.val(this.model.get('at').substr(0,10));
                    this.$inputAtTime.val(this.model.get('at').substr(11,5));
                }
                if(this.model.has('owner')) {
                    
                    this.model.getOwner(function(owner){
                        if(owner) {
                            self.$owner.html(owner.getAvatarNameView().render().$el);
                        }
                    });
                }
            }
            this.setElement(this.$el);
            return this;
        },
        wysiEditor: function() {
            // set h/w of textarea
            $('#'+this.wsyi_id+'-textarea').css('height', $('#'+this.wsyi_id+'-textarea').outerHeight());
            $('#'+this.wsyi_id+'-textarea').css('width', $('#'+this.wsyi_id+'-textarea').outerWidth());
            this.editor = new wysihtml5.Editor(this.wsyi_id+"-textarea", { // id of textarea element
              toolbar:      this.wsyi_id+"-toolbar", // id of toolbar element
              parserRules:  wysihtml5ParserRules // defined in parser rules set 
            });
        },
        events: {
            "submit form": "submit",
            'keyup input[name="title"]': "throttleTitle",
            'blur input[name="title"]': "blurTitle"
        },
        blurTitle: function() {
            console.log('blur title');
            var titleStr = this.$inputTitle.val().trim();
            if(titleStr != '') {
                // autosave
            }
        },
        throttleTitle: _.debounce(function(){
            this.refreshTitle.call(this, arguments);
        }, 300),
        refreshTitle: function(e) {
            var titleStr = this.$inputTitle.val().trim();
            this.trigger('title', titleStr);
            //this.model.set('title', titleStr);
            if(!this.model.has('slug') || this.model.isNew()) {
                //this.model.setSlug(titleStr);
                 this.$inputSlug.val(this.model.slugStr(titleStr));
            }
            //this.render();
            //this.focus();
        },
        submit: function() {
            var self = this;
            var setDoc = {};
            var title = this.$inputTitle.val();
            var msg = this.$inputMsg.val();
            var slug = this.$inputSlug.val();
            var groups = this.inputGroupsView.val();
            if(title !== '' && title !== this.model.get('title')) {
                setDoc.title = title;
            }
            if(msg !== '' && msg !== this.model.get('msg')) {
                setDoc.msg = msg;
            }
            if(slug !== '' && slug !== this.model.get('slug')) {
                setDoc.slug = slug;
            }
            if(groups.length > 0 && groups !== this.model.get('groups')) {
                setDoc.groups = groups;
            }
            console.log('setDoc')
            console.log(setDoc)
            this.model.set(setDoc, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false ,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.trigger("saved", self.model);
                    self.collection.add(self.model);
                });
            } else {
                self.trigger("saved", self.model);
            }
            return false;
        },
        focus: function() {
            this.$inputTitle.focus();
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    
    
    
    var FileModel = Backbone.Model.extend({
        collectionName: "fs",
        initialize: function(attr, opts) {
            this.on("change", function(model, options){
            });
            this.views = {};
        },
        isJs: function() {
            if(this.get('filename').substr(-3) == '.js') {
                return true;
            }
            return false;
        },
        isCss: function() {
            if(this.get('filename').substr(-4) == '.css') {
                return true;
            }
            return false;
        },
        isLess: function() {
            if(this.get('filename').substr(-5) == '.less') {
                return true;
            }
            return false;
        },
        isHtm: function() {
            return this.isHtml();
        },
        isHtml: function() {
            if(this.get('filename').substr(-4) == '.htm' || this.get('filename').substr(-5) == '.html' ) {
                return true;
            }
            return false;
        },
        getFileName: function(options) {
            options = options || {};
            options.model = this;
            if (!this.row) {
                var row = this.row = new FileNameView(options);
                this.views.row = row;
            }
            return this.row;
        },
        getFullView: function(options) {
            options = options || {};
            options.model = this;
            if (!this.fullview) {
                this.fullview = new FileFullView(options);
            }
            return this.fullview;
        },
        renderViews: function() {
            for(var i in this.views) {
                this.views[i].render();
            }
        },
        getNavigatePath: function() {
            return this.get('filename');
        }
    });
    
    var FilesCollection = Backbone.Collection.extend({
        model: FileModel,
        collectionName: 'fs',
        url: '/api/fs',
        initialize: function() {
            var self = this;
        },
        load: function(options, success) {
            var self = this;
            if(!options) {
                options = {};
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
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("view")) {
                options.collection = this;
                this.view = new FileListView(options);
                this.view.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.view;
        }
    });
    
    var FileListView = Backbone.View.extend({
        layout: "FileName",
        className: "list",
        initialize: function() {
            var self = this;
            self.loading = false;
            this.$pager = $('<div class="list-pager"><span class="list-length"></span> files</div>');
            var $ul = this.$ul = $('<ul class="files"></ul>');
            this.collection.on('add', function(doc) {
                console.log(doc)
                var view = doc.getFileName({list: self});
                self.appendRow(view);
                doc.on('remove', function(){
                    view.$el.remove();
                    return false;
                });
            });
            this.collection.on('remove', function(doc, col, options) {
            });
            this.collection.on('count', function() {
            });
            this.collection.on('reset', function(){
                self.render();
            });
            /*
            $(window).scroll(function(){
                if(self.$el.is(":visible")) {
                  if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()){
                    self.loading = true;
                    self.loadMore();
                  }
                }
            });*/
        },
        events: {
          //"click .list-pager": "loadMore",
        },
        getDocLayoutView: function(doc) {
            return doc.getFileName({list: self});
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
            this.setElement(this.$el);
            return this;
        },
        appendRow: function(row) {
            var rank = row.model.get('name');
            var rowEl = row.render().$el;
            /*if(this.currentFilter && !this.currentFilter(row.model)) {
                rowEl.hide();
            }*/
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$ul.children();
            var last = $lis.last();
            var lastRank = last.attr('data-sort-rank');
            if(rank < lastRank) {
                $lis.each(function(i,e){
                    if(d) return;
                    var r = $(e).attr('data-sort-rank');
                    if(rank < r) {
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
    var FileNameView = Backbone.View.extend({
        tagName: "li",
        className: "filename",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        render: function() {
            this.$el.html('');
            console.log(this.model);
            if(this.model.has('filename')) {
                this.$el.append('<strong class="filename" title="'+this.model.get('filename')+'">'+this.model.get('filename')+'</strong>');
            }
            if(this.model.has('stat')) {
                var $at = $('<span class="at"></span>');
                if(window.clock) {
                    $at.attr('title', clock.moment(this.model.get('stat').atime).format('LLLL'));
                    $at.html(clock.moment(this.model.get('stat').atime).calendar());
                } else {
                    $at.html(this.model.get('stat').atime);
                }
            }
            //this.$el.append($byline);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "clickSelect"
        },
        clickSelect: function(e) {
            this.selected();
            if(this.hasOwnProperty('list')) {
                this.list.trigger('selected', this);
            }
            this.trigger('selected');
        },
        selected: function() {
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
        },
        remove: function() {
            this.$el.remove();
        }
    });
    var FileFullView = Backbone.View.extend({
        tagName: "span",
        className: "fullview",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            //this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        render: function() {
            var self = this;
            this.$el.html('');
            console.log(this.model);
            this.$el.append('<controls><button class="save">save</button> <button class="cleanup">cleanup</button></controls>');
            if(this.model.has('filename')) {
            if(this.model.has('data')) {
                this.$el.append('<div id="'+this.model.get('filename')+'" class="data" title="'+this.model.get('filename')+'"></div>');
            }
            }
            // cheap mime for now since get('mime') isnt consistent
            if((/\.(gif|jpg|jpeg|tiff|png)$/i).test(this.model.get('filename'))) {
                this.notText = true;
                
                this.$el.find('.data').append('<img />');
                var mime = this.model.get('mime');
                if(!mime) {
                    var ext = this.model.get('filename').substr(this.model.get('filename').lastIndexOf('.')+1);
                    mime = 'image/'+ext;
                    console.log('assume mime: '+mime);
                }
                this.$el.find('.data img').attr('src', 'data:'+mime+';base64,'+this.model.get('data'));
                
            } else if((/\.(mp3|m4a|wma|wav|mp4|mpeg|flv|avi)$/i).test(this.model.get('filename'))) {
                this.notText = true;
            }
            
            //this.$el.append($byline);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        renderAce: function() {
            var self = this;
            if(this.notText) return;
            console.log('renderAce')
            require(['js-beautify/beautify.js'], function(js_beautify){
            window.js_beautify = js_beautify;
            require(['js-beautify/beautify-css.js'], function(css_beautify){
            window.css_beautify = css_beautify.css_beautify;
            require(['js-beautify/beautify-html.js'], function(html_beautify){
            window.html_beautify = html_beautify.html_beautify;
            require(['ace/ace'], function(){
                self.editor = ace.edit(self.model.get('filename'));
                self.editor.getSession().setTabSize(4);
                //editor.getSession().setUseSoftTabs(true);
                self.editor.getSession().setUseWrapMode(false);
                self.editor.setHighlightActiveLine(true);
                self.editor.setShowPrintMargin(false);
                self.editor.setReadOnly(false);
                self.editor.setTheme("ace/theme/monokai");
                
                var mime = self.model.get('mime');
                if(mime && mime.indexOf('text') === 0) {
                    self.editor.setValue(self.model.get('data'));
                } else {
                    // assume base64, but lets try to textify it
                    if(window.atob) {
                        self.editor.setValue(atob(self.model.get('data')));
                    }
                }
                
                console.log("self.model");
                console.log(self.model);
                if(self.model.isCss()) {
                    self.editor.getSession().setMode("ace/mode/css");
                } else if(self.model.isHtml()) {
                    self.editor.getSession().setMode("ace/mode/html");
                } else if(self.model.isLess()) {
                    self.editor.getSession().setMode("ace/mode/less");
                } else {
                    self.editor.getSession().setMode("ace/mode/javascript");
                }
                
                self.editor.gotoLine(1);
                //editor.getValue(); // or session.getValue
                self.editor.commands.addCommand({
                    name: 'save',
                    bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
                    exec: function(editor) {
                        console.log('save')
                        //console.log(editor.getValue());
                        self.model.set({data: editor.getValue()}, {silent: true});
                        var saveModel = self.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        saveModel.done(function() {
                            self.$el.find('.save').html('saved');
                            self.$el.find('.save').attr('disabled', 'disabled');
                            self.editor.dirty = false;
                        });
                        return true;
                    },
                    readOnly: false
                });
                console.log(self.editor.dirty);
                self.editor.getSession().on('change', function(e) {
                    // e.type, etc
                    console.log(e.type);
                    console.log(self.editor.dirty);
                    if(self.editor.getValue() !== self.model.get('data')) {
                        if(!self.editor.dirty) {
                            self.editor.dirty = true;
                            self.$el.find('.save').html('save');
                            self.$el.find('.save').removeAttr('disabled');
                        }
                    } else {
                        if(self.editor.dirty) {
                            self.editor.dirty = false;
                            self.$el.find('.save').html('saved');
                            self.$el.find('.save').attr('disabled', 'disabled');
                        }
                    }
                    // TODO autosaving
                });
            });
            });
            });
            });
        },
        events: {
          "click": "select"
          , "click button.save": "saveDoc"
          , "click button.cleanup": "cleanupDoc"
        },
        saveDoc: function() {
            var self = this;
            self.model.set({data: this.editor.getValue()}, {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.$el.find('.save').html('saved');
                self.$el.find('.save').attr('disabled', 'disabled');
                self.editor.dirty = false;
            });
        },
        cleanupDoc: function() {
            var self = this;
            var v = this.editor.getValue();
            var cleanVal = '';
            var p = this.editor.getCursorPositionScreen();
            var firstRow = this.editor.getFirstVisibleRow();
            if(self.model.isJs()) {
                cleanVal = js_beautify(v, {
                    "indent_size": 4,
                    "indent_char": " ",
                    "indent_level": 0,
                    "indent_with_tabs": false,
                    "preserve_newlines": true,
                    "max_preserve_newlines": 10,
                    "jslint_happy": false,
                    "brace_style": "collapse",
                    "keep_array_indentation": false,
                    "keep_function_indentation": false,
                    "space_before_conditional": false,
                    "break_chained_methods": false,
                    "eval_code": false,
                    "unescape_strings": false,
                    "wrap_line_length": 0
                });
            } else if(self.model.isCss()) {
                cleanVal = css_beautify(v);
            } else if(self.model.isHtml()) {
                cleanVal = html_beautify(v);
            } else {
                cleanVal = v;
            }
            
            this.editor.setValue(cleanVal, -1);
            this.editor.gotoLine(firstRow);
            this.editor.moveCursorToPosition(p);
            
            return false;
        },
        select: function(e) {
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.hasOwnProperty('list')) {
                this.list.trigger('selected', this);
            }
            this.trigger('selected');
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var FileForm = Backbone.View.extend({
        tagName: "div",
        className: "fileForm",
        initialize: function(options) {
            var self = this;
            self.options = options = options || {};
            self.options.path = options.path || '/';
            var typeName = 'file';
            var acceptType = '*/*';
            if(options.type) {
                typeName = options.type;
                if(typeName == 'image') {
                    acceptType = 'image/*';
                } else if (typeName == 'audio') {
                    acceptType = 'audio/*';
                } else if (typeName == 'video') {
                    acceptType = 'video/*';
                } else if (typeName == 'text') {
                    acceptType = 'text/*';
                } else {
                    acceptType = '*/*';
                }
            }
            this.$html = $('<button class="upload">Choose '+typeName+'</button>');
            this.$input = $('<input class="uploadInput" style="display:none" type="file" multiple accept="'+acceptType+'" capture="camera">');
        },
        uploadFile: function(blobOrFile, callback) {
            var self = this;
            var formData = new FormData;
            var xhr = new XMLHttpRequest;
            var onReady = function(e) {
            };
            var onError = function(err) {
                console.log(err);
                self.trigger('failed', err);
            };
            formData.append("files", blobOrFile);
            xhr.open("POST", "/api/fs"+self.options.path, true);
            xhr.addEventListener("error", onError, false);
            xhr.addEventListener("readystatechange", onReady, false);
            xhr.onload = function(e) {
                var data = JSON.parse(e.target.response);
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(self.options.collection && data.file) {
                    self.options.collection.add(data.file);
                }
                self.trigger('uploaded', {localfile: blobOrFile, data: data});
                if (callback) callback(data);
            };
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    self.trigger('progress', {localfile: blobOrFile, loaded: e.loaded, total: e.total});
                }
            };
            xhr.setRequestHeader('cache-control', 'no-cache');
            xhr.send(formData);
        },
        render: function() {
            var self = this;
            this.$el.append(this.$html);
            this.$el.append(this.$input);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click button.upload": "click",
            "change .uploadInput": "fileChangeListener"
        },
        click: function() {
            this.$input.click();
            return false;
        },
        fileChangeListener: function(e) {
            e.stopPropagation();
            e.preventDefault();
            var self = this;
            //self.$input.hide();
            var files = e.target.files;
            var queue = [];
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                queue.push(file);
                self.trigger('file', file);
            }
            var process = function() {
                if (queue.length) {
                    var f = queue.shift();
                    self.uploadFile(f, function(data) {
                        console.log(data);
                        if(_.isArray(data)) {
                            data = _.first(data);
                        }
                        //self.trigger("uploaded", data);
                        if (queue.length > 0) {
                            process();
                        } else {
                            console.log('uploads finished');
                        }
                    });
                }
            };
            process();
            return false;
        }
    });
    
    var DragDropView = Backbone.View.extend({
        tagName: "span",
        className: "dropzone",
        initialize: function(options) {
            var self = this;
            self.options = options || {};
            options.path = options.path || '/';
        },
        uploadFile: function(blobOrFile, callback) {
            var self = this;
            var formData = new FormData;
            var xhr = new XMLHttpRequest;
            var onReady = function(e) {
            };
            var onError = function(err) {
                console.log(err);
                self.trigger('failed', err);
            };
            formData.append("files", blobOrFile);
            xhr.open("POST", "/api/fs"+self.options.path, true);
            xhr.addEventListener("error", onError, false);
            xhr.addEventListener("readystatechange", onReady, false);
            xhr.onload = function(e) {
                var data = JSON.parse(e.target.response);
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                console.log(data);
                console.log(self.options);
                if(self.options.collection && data.file) {
                    self.options.collection.add(data.file);
                }
                self.trigger('uploaded', {localfile: blobOrFile, data: data});
                if (callback) callback(data);
            };
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    self.trigger('progress', {localfile: blobOrFile, loaded: e.loaded, total: e.total});
                }
            };
            xhr.setRequestHeader('cache-control', 'no-cache');
            xhr.send(formData);
        },
        render: function() {
            this.$el.html('Drop files here');
            this.setElement(this.$el);
            return this;
        },
        events: {
            "dragenter": "handleDragEnter",
            "dragleave": "handleDragLeave",
            "dragover": "handleDragOver",
            "drop": "handleFileSelect"
        },
        handleDragOver: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            return;
        },
        handleFileSelect: function(e) {
            /*
            if (path.indexOf('.AppleDouble') != -1) {
            continue;
            }         
            var size = file.size || file.fileSize || 4096;
            if(size < 4095) { 
            continue;
            }
            */
            e.stopPropagation();
            e.preventDefault();
            var self = this;
            var files = e.originalEvent.dataTransfer.files;
            var queue = [];
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                queue.push(file);
                self.trigger('file', file);
            }
            var process = function() {
                if (queue.length) {
                    var f = queue.shift();
                    self.uploadFile(f, function(data) {
                        console.log(data);
                        if(_.isArray(data)) {
                            data = _.first(data);
                        }
                        if (queue.length > 0) {
                            process();
                        } else {
                            console.log('uploads finished');
                        }
                    });
                }
            };
            process();
            this.$el.removeClass('dragover');
            return false;
        },
        handleDragEnter: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            this.$el.addClass('dragover');
            e.originalEvent.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
            return false;
        },
        handleDragLeave: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            this.$el.removeClass('dragover');
            return false;
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var UploadFrame = Backbone.View.extend({
        tagName: "span",
        className: "uploadFrame",
        initialize: function(options) {
            options = options || {};
            var self = this;
            options.path = options.path || '/';
            this.fileForm = new FileForm(options);
            this.fileForm.on('file', function(f) {
                self.appendFile(f);
            });
            this.fileForm.on('progress', function(progress) {
                var name = progress.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                $file.find('.meter').show();
                var per = Math.floor((progress.loaded / progress.total) * 100);
                $file.find('.bar').css('width', per+'%');
            });
            this.fileForm.on('uploaded', function(data) {
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                console.log(data);
                var name = data.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                console.log($file);
                $file.remove();
                self.trigger('uploaded', data.data);
            });
            this.uploadDragDrop = new DragDropView(options);
            this.uploadDragDrop.on('file', function(f) {
                self.appendFile(f);
            });
            this.uploadDragDrop.on('progress', function(progress) {
                var name = progress.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                $file.find('.meter').show();
                var per = Math.floor((progress.loaded / progress.total) * 100);
                $file.find('.bar').css('width', per+'%');
            });
            this.uploadDragDrop.on('uploaded', function(data) {
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                console.log(data);
                var name = data.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                console.log($file);
                $file.remove();
                self.trigger('uploaded', data.data);
            });
            this.$uploadFileList = $('<ul class="uploadFileList"></ul>');
        },
        render: function() {
            this.$el.html('');
            this.$el.append(this.uploadDragDrop.render().$el);
            this.$el.append('<span style="display:block;text-align:center"><br />or</span>');
            this.$el.append(this.fileForm.render().$el);
            this.$el.append(this.$uploadFileList);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .pickFiles": "pickFiles"
        },
        pickFiles: function() {
            this.fileForm.click();
        },
        appendFile: function(f, callback) {
            var self = this;
            var $localFile = $('<li class="localFile"></li>');
            var $title = $('<span class="title"></span> ');
            $title.html(f.webkitRelativePath || f.mozFullPath || f.name);
            $localFile.append($title);
            $localFile.append('<div class="meter" style="display:none"><div class="bar" style="width:0%"></div></div>');
            var url;
            if(window.createObjectURL){
              url = window.createObjectURL(f)
            }else if(window.createBlobURL){
              url = window.createBlobURL(f)
            }else if(window.URL && window.URL.createObjectURL){
              url = window.URL.createObjectURL(f)
            }else if(window.webkitURL && window.webkitURL.createObjectURL){
              url = window.webkitURL.createObjectURL(f)
            }
            $localFile.attr('data-filename', $title.html());
            self.$uploadFileList.append($localFile);
            console.log($localFile);
            if(callback) callback();
        },
        remove: function() {
          this.$el.remove();
        },
        setPath: function(p) {
            this.uploadDragDrop.options.path = this.fileForm.options.path = this.options.path = p;
        }
    });
    
    if(define) {
        define(function () {
            return {
                Collection: Collection,
                Model: Model,
                List: ListView,
                Row: RowView,
                Avatar: AvatarView,
                Full: FullView,
                Form: FormView,
                FilesCollection: FilesCollection,
                FileModel: FileModel,
                FileName: FileNameView,
                FileList: FileListView,
                UploadFrame: UploadFrame,
                DragDropView: DragDropView,
                FileForm: FileForm
            }
        });
    }
})();