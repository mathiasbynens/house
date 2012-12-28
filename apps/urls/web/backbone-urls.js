(function() {
    
    var Model = Backbone.Model.extend({
        collectionName: "url",
        initialize: function(attr, opts) {
            this.on("change", function(model, options){
            });
            this.views = {};
        },
        getFullView: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.full) {
                var view = this.full = new FullView(options);
                this.views.full = view;
            }
            return this.full;
        },
        getAvatarView: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.avatar) {
                var view = this.avatar = new AvatarView(options);
                this.views.avatar = view;
            }
            return this.avatar;
        },
        getRowView: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.row) {
                var view = this.row = new RowView(options);
                this.views.row = view;
            }
            return this.row;
        },
        renderViews: function() {
            console.log(this.views);
            for(var i in this.views) {
                this.views[i].render();
            }
        }
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'urls',
        url: '/api/urls',
        initialize: function() {
            var self = this;
            self.pageSize = 10;
            this.resetFilters();
            require(['//'+window.location.host+'/desktop/socket.io.min.js'], function() {
                var socketOpts = {};
                if(window.location.protocol.indexOf('https') !== -1) {
                    socketOpts.secure = true;
                } else {
                    socketOpts.secure = false;
                }
                var socket = self.io = io.connect('//'+window.location.host+'/socket.io/io', socketOpts);
                socket.on('connect', function(data) {
                    console.log('connected and now joining '+self.collectionName);
                    socket.emit('join', self.collectionName);
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
                        console.log('update model with doc')
                        model.set(doc, {silent:true});
                        model.renderViews();
                    }
                }
                socket.on('insertedUrls', function(doc) {
                    insertOrUpdateDoc(doc);
                    self.count++;
                    self.trigger('count', self.count);
                });
                socket.on('updatedUrls', function(doc) {
                    insertOrUpdateDoc(doc);
                });
                socket.on('deletedUrls', function(id) {
                    self.remove(id);
                    self.count--;
                    self.trigger('count', self.count);
                });
                
                self.initialized = true;
                self.trigger('initialized');
            });
        },
        headCount: function(callback) {
            var self = this;
            var aj = $.ajax({
                type: "HEAD",
                url: self.url,
                data: {},
                success: function(json) {
                    callback(aj.getResponseHeader('X-Count'));
                },
                xhrFields: {
                    withCredentials: true
                }
            });
        },
        refreshCount: function() {
            var self = this;
            self.headCount(function(count){
                self.count = count;
                self.trigger('count', count);
            });
        },
        load: function(options, success) {
            var self = this;
            if(!this.count) {
                this.refreshCount();
            }
            if(!options) {
                options = {};
            }
            if(!options.limit) {
                options.limit = self.pageSize;
            }
            if(!options.sort) {
                options.sort = "at-";
            }
            this.applyFilters(options);
            this.fetch({data: options, add: true, success: function(collection, response){
                    if(success) {
                        success();
                    }
                },
                error: function(collection, response){
                }
            });
        },
        getNextPage: function() {
            if(this.length < this.count) {
                this.load({skip:this.length});
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
            if(doc.get("at")) {
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
                this.fetch({data: options, add: true, success: function(collection, response){
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
                this.view = new ListView(options);
                this.view.on("selected", function(view) {
                    self.trigger("selected", view.model);
                });
            }
            return this.view;
        },
    });
    
    var ListView = Backbone.View.extend({
        layout: 'row',
        initialize: function() {
            var self = this;
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> urls</div>');
            var $ul = this.$ul = $('<ul id="wallpaper"></ul>');
            
            this.collection.bind("add", function(doc) {
                var view;
                if(self.layout === 'row') {
                    view = doc.getRowView({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatarView({list: self});
                } else if(self.layout === 'fullView') {
                    view = doc.getFullView({list: self});
                }
                self.appendRow(view.render().el);
                self.renderPager();
            });
            
            this.collection.on('reset', function(){
                self.render();
            });
        },
        events: {
          "click .list-pager": "loadMore",
        },
        loadMore: function() {
            this.collection.getNextPage();
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append(this.$ul);
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view;
                if(self.layout === 'row') {
                    view = doc.getRowView({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatarView({list: self});
                } else if(self.layout === 'fullView') {
                    view = doc.getFullView({list: self});
                }
                
                self.appendRow(view.render().el);
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
        refreshPager: function() {
        },
        appendRow: function(row) {
            this.$ul.append(row);
        }
    });
    
    var Actions = Backbone.View.extend({
        tagName: "span",
        className: "actions",
        render: function() {
            var self = this;
            //this.$el.html('');
            //self.$el.append(this.tags.render().$el);
            //self.$el.append(this.groups.render().$el);
            //self.$el.append(this.actionEdit.render().$el);
            self.$el.append(this.actionProc.render().$el);
            self.$el.append(this.actionFeed.render().$el);
            self.$el.append(this.actionDelete.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.actions = [];
            var opts = {id: this.id, model: this.model};
            //this.groups = new Groups({id: this.id, model: this.model});
            //this.tags = new Tags({id: this.id, model: this.model});
            //this.actionEdit = new ActionEdit({id: this.id, model: this.model});
            this.actionProc = new ActionProcess(opts);
            this.actionFeed = new ActionFeedView(opts);
            this.actionDelete = new ActionDelete(opts);
        }
    });

    var ActionEdit = Backbone.View.extend({
        tagName: "span",
        className: "edit",
        initialize: function() {
            
        },
        render: function() {
            this.$el.html('<button>edit</button>');
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select",
        },
        select: function() {
            var self = this;
            var form = new FormView({
                model: self.model,
                collection: self.model.collection
            });
            var $light = utils.appendLightBox(form.render().$el);
            form.on("saved", function(doc) {
                $light.trigger("close");
            });
            $light.on("close", function() {
            });
            return false;
        }
    });
    var ActionProcess = Backbone.View.extend({
        tagName: "span",
        className: "proc",
        render: function() {
            if(this.model.get('proc')) {
                this.$el.addClass('processed');
            }
            
            this.$el.html(this.$button);
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$button = $('<button>process</button>');
        },
        events: {
          "click": "select",
        },
        select: function() {
            var self = this;
            
            if(!this.model.has('proc') || confirm("Are you sure that you want to process this?")) {
                if(!this.model.get('proc')) {
                    this.model.set({proc: 1}, {silent: false});
                }
                this.model.set({proc: 0}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
            return false;
        }
    });
    var ActionDelete = Backbone.View.extend({
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
          "click": "select",
        },
        select: function() {
            var self = this;
            
            if(confirm("Are you sure that you want to delete this?")) {
                this.model.destroy({success: function(model, response) {
                  //console.log('delete');
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
    
    var ActionTags = Backbone.View.extend({
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

    var ActionGroups = Backbone.View.extend({
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

    var RowView = Backbone.View.extend({
        tagName: "li",
        className: "row",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.actions = new Actions({id: this.id, model: this.model});
        },
        render: function() {
            var self = this;
            this.$el.html('<span class="url"><a href="'+this.model.get('url')+'" target="_new">'+this.model.get('url')+'</a></span><actions><button class="handle">▼</button></actions>');
            this.$el.find('actions').append(this.actions.render().$el);
            if(this.model.has('title')) {
                this.$el.find('.url').after('<span class="title">'+this.model.get('title')+'</span>');
            } else {
                if(this.model.has('file')) {
                    this.$el.find('.url').after('<span class="contentType">'+this.model.get('file').contentType+'</span>');
                }
            }
            
            if(this.model.has('image')) {
                if(!this.hasOwnProperty('imageView')) {
                    self.imageView = new ImagesBackbone.Model(self.model.get('image')).getAvatar();
                }
                self.$el.append(self.imageView.render().$el);
            }
            
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select",
          "click .url a": "clickUrl"
        },
        clickUrl: function() {
            
        },
        select: function(e) {
            if(this.options.list) {
                this.options.list.trigger('selected', this);
            }
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
            this.model.bind('destroy', this.remove, this);
    
            this.$actions = $('<div class="actions"></div>');
            this.actions = new Actions({id: this.id, model: this.model});
            
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append(this.$actions);
            this.$actions.append(this.actions.render().el);
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
    
    var AvatarView = Backbone.View.extend({
        tagName: "span",
        className: "avatar",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        render: function() {
            var self = this;
            this.$el.html('');
            if(this.model.has('image')) {
                if(!this.hasOwnProperty('imageView')) {
                    self.imageView = new ImagesBackbone.Model(self.model.get('image')).getAvatar();
                }
                self.$el.append(self.imageView.render().$el);
            }
            if(this.model.has('title')) {
                this.$el.find('.url').after('<span class="title">'+this.model.get('title')+'</span>');
            } else {
                if(this.model.has('file')) {
                    this.$el.find('.url').after('<span class="contentType">'+this.model.get('file').contentType+'</span>');
                }
            }
            this.$el.append('<span class="url"><a href="'+this.model.get('url')+'" target="_new">'+this.model.get('url')+'</a></span>');
            
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select"
        },
        select: function(e) {
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "form",
        initialize: function() {
            var self = this;
            self.initialized = true;
            if(this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
            } else {
                
            }
            this.$inputUrl = $('<input type="url" name="url" placeholder="http://example.com" />');
        },
        render: function() {
            var self = this;
            this.$el.html('<h4>URL</h4><form class="urlForm"><input type="submit" value="Save" /></form>');
            this.$el.find('form').prepend(this.$inputUrl);
            if(this.model) {
                this.$inputUrl.val(this.model.get('url'));
            }
            this.setElement(this.$el);
            return this;
        },
        events: {
            "submit form": "submit",
        },
        submit: function() {
            var self = this;
            
            this.$el.find('input').attr('disabled', true);
            
            var setDoc = {};
            if(!this.model) {
                this.model = new Model({}, {
                    collection: this.collection
                });
            } else {
            }
            var url = this.$inputUrl.val();
            if(!url) {
                alert('URL required!');
                self.$el.find('input').removeAttr('disabled');
                return false;
            }
            setDoc.url = url;
            this.model.set(setDoc, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.$el.find('input').removeAttr('disabled');
                    self.trigger("saved", self.model);
                    if(!self.collection.get(self.model.id)) {
                        self.collection.add(self.model);
                    }
                });
            }
            return false;
        },
        focus: function() {
            this.$inputUrl.focus();
        },
        remove: function() {
            $(this.el).remove();
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
                Form: FormView
            }
        });
    }
})();