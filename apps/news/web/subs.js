(function() {
    
    var Model = Backbone.Model.extend({
        collectionName: "subs",
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
        getNewAvatar: function(options) {
            options = options || {};
            options.model = this;
            return new AvatarView(options);
        },
        getAvatar: function(options) {
            options = options || {};
            options.model = this;
            if (!this.avatar) {
                var view = this.avatar = this.getNewAvatar(options);
                this.views.avatar = view;
            }
            return this.avatar;
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
            if(this.has('url')) {
                return 'subs/url/'+(this.get('url')); //encodeURIComponent
            }
            return 'subs/'+this.id;
        }
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'subs',
        url: '/api/subs',
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
                if(socket.socket.connected) {
                    console.log('already connected and now joining '+self.collectionName);
                    socket.emit('join', self.collectionName);
                }
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
                        console.log(model);
                        model.set(doc, {silent:true});
                        model.renderViews();
                    }
                }
                socket.on('insertedSubs', function(doc) {
                    console.log('inserted subs');
                    insertOrUpdateDoc(doc);
                    self.count++;
                    self.trigger('count', self.count);
                });
                socket.on('updatedSubs', function(doc) {
                    insertOrUpdateDoc(doc);
                });
                socket.on('deletedSubs', function(id) {
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
        getOrFetchUrl: function(url, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({url:url}));
            if(doc) {
                callback(doc);
            } else {
                var options = { "url": url };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = _.first(self.where({url:url}));
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
        },
    });
    
    var ListView = Backbone.View.extend({
        layout: 'row',
        initialize: function() {
            var self = this;
            self.loading = false;
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> subs</div>');
            var $ul = this.$ul = $('<ul class="subs"></ul>');
            this.collection.on('add', function(doc) {
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
            
            $(window).scroll(function(){
                if(self.$el.is(":visible")) {
                  if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()){
                    self.loading = true;
                    self.loadMore();
                  }
                }
            });
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
          "click .list-pager": "loadMore",
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
            var rank = new Date(row.model.get('at'));
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
            if(confirm("Are you sure that you want to unsubscribe?")) {
                this.model.destroy({success: function(model, response) {
                    self.trigger('deleted');
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
            this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            this.$el.html('');
            var $byline = $('<span class="byline"></span>');
            
            if(this.model.has('urlDoc')) {
                var urlDoc = this.model.get('urlDoc');
                if(urlDoc.channel) {
                    var $channel = $('<span class="channel"></span>');
                    if(urlDoc.channel.url && urlDoc.channel.url.faviconfile) {
                        $channel.append('<span class="favicon"><img src="/api/files/'+urlDoc.channel.url.faviconfile.filename+'" /></span>');
                    }
                    if(urlDoc.channel.title) {
                        if(urlDoc.channel.link) {
                            $channel.append('<span class="title"><a href="'+urlDoc.channel.link+'" target="_new">'+urlDoc.channel.title+'</a></span>');
                        } else {
                            $channel.append('<span class="title">'+urlDoc.channel.title+'</span>');
                        }
                    } else {
                        this.$el.append('<strong class="title">'+this.model.get('url')+'</strong>');
                    }
                    this.$el.append($channel);
                } else {
                    this.$el.append('<strong class="title">'+this.model.get('url')+'</strong>');
                }
            } else {
                this.$el.append('<strong class="title">'+this.model.get('url')+'</strong>');
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
            this.$el.append($byline);
            this.$el.attr('data-id', this.model.get("_id"));
            this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
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
            if(this.model.has('seq')) {
                this.$el.append('<span class="seq">#'+this.model.get('seq')+'</span>');
            }
            if(this.model.has('owner')) {
                $byline.append(' <i>by</i> <span class="owner">'+this.model.get('owner').name+'</span>');
                $byline.attr('data-owner-id', this.model.get('owner').id);
                var owner = this.model.getOwner(function(owner){
                    if(owner) {
                        $byline.find('.owner').html('');
                        var ownerAvatarName = owner.getNewAvatarNameView();
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
            if(this.model.has('youtube')) {
                var yt = this.model.get('youtube');
                if(yt.id) {
                    var ytid = yt.id;
                    this.$el.append('<span class="youtube"><div id="ytapiplayer-'+ytid+'"><iframe width="640" height="480" src="https://www.youtube.com/embed/'+ytid+'?rel=0" frameborder="0" allowfullscreen></iframe></div></span>');
                }
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
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        render: function() {
            this.$el.html('');
            if(this.model.has('title')) {
                this.$el.append('<strong class="title">'+this.model.get('title')+'</strong>');
            }
            
            if(this.model.has('urlDoc')) {
                var urlDoc = this.model.get('urlDoc');
                if(urlDoc.channel) {
                    var $channel = $('<span class="channel"></span>');
                    if(urlDoc.channel.title) {
                        if(urlDoc.channel.link) {
                            $channel.append('<span class="title"><a href="'+urlDoc.channel.link+'" target="_new">'+urlDoc.channel.title+'</a></span>');
                        } else {
                            $channel.append('<span class="title">'+urlDoc.channel.title+'</span>');
                        }
                    }
                    this.$el.append($channel);
                }
            }
            
            this.$el.attr('data-id', this.model.id);
            this.setElement(this.$el);
            return this;
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
    
    var YoutubeView = Backbone.View.extend({
        tagName: "span",
        className: "youtube",
        initialize: function() {
            this.$input = $('<input name="youtube_id" placeholder="youtube id" />');
        },
        render: function() {
            var self = this;
            this.$el.append(this.$input);
            this.setElement(this.$el);
            return this;
        },
        val: function(v) {
            if(v) {
                this.$input.val(v);
            } else {
                var ytid = this.$input.val();
                var y = {};
                if(this.model.has('youtube')) {
                    _.clone(this.model.get('youtube'));
                }
                y.id = ytid;
                return y;
            }
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
            this.$inputUrl = $('<input type="url" name="url" placeholder="URL to subscribe to" autocomplete="off" />');
            
            //this.inputGroupsView = new SelectGroupsView({model: this.model});
            //this.feedView = new ActionFeedView({model: this.model});
            //this.deleteView = new ActionDeleteView({model: this.model});
            
            this.$form = $('<form class="subscribe"><span class="owner"></span><fieldset></fieldset><controls></controls></form>');
            this.$form.find('fieldset').append(this.$inputUrl);
            //this.$form.find('fieldset').append('<hr />');
            //this.$form.find('fieldset').append(this.deleteView.render().$el);
            //this.$form.find('controls').append(this.inputGroupsView.render().$el);
            this.$form.find('controls').append('<input style="display:none;" type="submit" value="Subscribe" />');
        },
        render: function() {
            var self = this;
            if(this.$el.find('form').length === 0) {
                console.log('append form');
                this.$el.append(this.$form);
            }
            if(this.model) {
                if(this.model.has('url')) {
                    this.$inputUrl.val(this.model.get('url'));
                }
                
                if(this.model.has('owner')) {
                    this.model.getOwner(function(owner){
                        if(owner) {
                            self.$owner.html(owner.getNewAvatarNameView().render().$el);
                        }
                    });
                } else {
                    // logged in user
                }
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
            var url = this.$inputUrl.val();
            
            if(url !== '' && url !== this.model.get('url')) {
                setDoc.url = url;
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
            this.$inputUrl.focus();
        },
        clear: function() {
            this.$inputUrl.val('');
            this.model = new Model({}, {
                collection: this.collection
            });
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
                Avatar: AvatarView,
                Full: FullView,
                Form: FormView
            }
        });
    }
})();