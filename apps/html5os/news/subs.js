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
                return 'subs/url/'+encodeURIComponent(this.get('url')); //encodeURIComponent
            }
            return 'subs/'+this.id;
        },
        getAtFormatted: function(format) {
            if(!format) {
                format = "YYYY-MM-DDTHH:mm:ssZZ"
            }
            return this.getAt().format(format);
        },
        getAt: function() {
            if(!this.atMoment) {
                if(window.clock) {
                    this.atMoment = clock.moment(this.get('at'));
                }
            }
            // $permalink.find('time').attr('datetime', m.format("YYYY-MM-DDTHH:mm:ssZZ"));
            // $at.attr('title', m.format('LLLL'));
            // $permalink.find('time').html(m.calendar());
            return this.atMoment;
        },
        getUrlDocLastUpdate: function() {
            if(!this.urlDocLastUpdate) {
                var urlDoc = this.get('urlDoc');
                if(urlDoc && urlDoc.lastUpdate) {
                    if(window.clock) {
                        this.urlDocLastUpdate = clock.moment(urlDoc.lastUpdate);
                    }
                }
            }
            return this.urlDocLastUpdate;
        },
        getChannelLast: function() {
            if(!this.channelLast) {
                var urlDoc = this.get('urlDoc');
                if(urlDoc && urlDoc.channel && urlDoc.channel.last) {
                    if(window.clock) {
                        this.channelLast = clock.moment(urlDoc.channel.last);
                    }
                }
            }
            return this.channelLast;
        },
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'subs',
        url: '/api/subs',
        initialize: function() {
            var self = this;
            self.pageSize = 25;
            this.resetFilters();
            
            require(['/desktop/socket.io.min.js'], function() {
                var socketOpts = {
                    'max reconnection attempts': Infinity // defaults to 10
                };
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
                socket.on('connecting', function(data) {
                    console.log('connecting...');
                });
                socket.on('connect_failed', function(data) {
                    console.log('connect_failed.');
                });
                socket.on('disconnect', function(data) {
                    console.log('disconnected.');
                });
                socket.on('error', function(data) {
                    console.log('error');
                });
                socket.on('reconnect_failed', function(data) {
                    console.log('reconnect_failed!');
                });
                socket.on('reconnect', function(data) {
                    console.log('reconnected & rejoining..');
                });
                socket.on('reconnecting', function(data) {
                    console.log('reconnecting...');
                });
                
                var insertOrUpdateDoc = function(doc) {
                    // console.log(doc);
                    if(_.isArray(doc)) {
                        _.each(doc, insertOrUpdateDoc);
                        return;s
                    }
                    var model = self.get(doc.id);
                    if(!model) {
                        var model = new self.model(doc);
                        self.add(model);
                    } else {
                        // console.log(model);
                        model.set(doc, {silent:true});
                        model.renderViews();
                    }
                }
                socket.on('insertedSubs', function(doc) {
                    // console.log('inserted subs');
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
            if(!this.fetchingUrl) {
                this.fetchingUrl = {};
            }
            if(this.fetchingUrl.hasOwnProperty(url) && this.fetchingUrl[url]) {
                this.once('fetchedUrl'+encodeURIComponent(url), function(doc){
                    if(doc) {
                        callback(doc);
                    } else {
                        //self.getOrFetchUrl(url, callback);
                        callback(false);
                    }
                });
                return;
            }
            this.fetchingUrl[url] = true;
            var doc;
            doc = _.first(this.where({url:url}));
            if(doc) {
                delete self.fetchingUrl[url];
                callback(doc);
                self.trigger('fetchedUrl'+encodeURIComponent(url), doc);
            } else {
                var options = { "url": url };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        delete self.fetchingUrl[url];
                        if(response) {
                            doc = _.first(self.where({url:url}));
                            callback(doc);
                            self.trigger('fetchedUrl'+encodeURIComponent(url), doc);
                        } else {
                            callback(false);
                            self.trigger('fetchedUrl'+encodeURIComponent(url));
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
        initialize: function(options) {
            var self = this;
            var layout = options.layout || 'row';
            this.initLayout(layout);
            
            this.pagesLength = 1;
            this.currentPage = 1;
            
            self.loading = false;
            this.$deselect = $('<div class="showAllFeeds col-lg-6 col-lg-offset-3"><button class="btn btn-link"><span class="glyphicon glyphicon-list-alt"></span> All News</button> <label class="unreadCount total"></label> <span class="addNewFeed pull-right"><button class="btn btn-default"><span class="glyphicon glyphicon-plus"></span> Add Feed</button></span></div>');
            this.$saved = $('<div class="saved col-lg-6 col-lg-offset-3"><a href="#"><span class="star">★</span> Saved Stories</a> <span class="savedCount"></span></div>');
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> subs</div>');
            
            if(newsCollection) {
                newsCollection.on('add', function(doc) {
                    self.renderTotalUnreadVal();
                });
                newsCollection.on('remove', function(doc, col, options) {
                    self.renderTotalUnreadVal();
                });
                newsCollection.on('count', function() {
                    self.renderTotalUnreadVal();
                });
                newsCollection.on('reset', function(){
                    self.renderTotalUnreadVal();
                });
            }
            
            var $ul = this.$ul = $('<ul class="subs list-unstyled col-lg-6 col-lg-offset-3"></ul>');
            this.pageSize = this.collection.pageSize;
            this.collection.bind("add", function(doc) {
                var view = self.getDocLayoutView(doc);
                self.appendRow(view);
                //self.renderPagination();
                doc.on('remove', function() {
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
        initLayout: function(layout) {
            this.setLayout(layout, false);
        },
        setLayout: function(layout, render) {
            if (render !== false) {
                render = true;
            }
            var oldLayout = this.layout;
            this.layout = layout;
            //if (this.layout !== oldLayout) {
                if(this.$wrap) {
                    this.$wrap.remove();
                }
                console.log(this.layout)
                if (this.layout == 'table') {
                    this.$wrap = $('<table class="urlsList table table-striped table-hover"></table>');
                    this.$ul = $('<tbody></tbody>');
                    this.$wrap.append(this.$ul);
                } else if (this.layout == 'avatar') {
                    this.$wrap = this.$ul = $('<div class="urlsList"></div>');
                } else if (this.layout == 'row') {
                    this.$wrap = this.$ul = $('<ul class="urlsList"></ul>');
                }
            //}
            this.$el.prepend(this.$wrap);
            if (render) {
                this.renderPage(this.currentPage);
            }
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
          "click .addNewFeed button": "clickNewFeed",
          "click .list-pager": "loadMore",
          "click .showAllFeeds": "clickShowAll",
          "click .saved": "clickShowSaved",
        },
        clickNewFeed: function() {
            this.trigger('newFeed');
            return false;
        },
        clickShowAll: function() {
            this.trigger('deselect');
            return false;
        },
        clickShowSaved: function() {
            this.trigger('showSaved');
            return false;
        },
        loadMore: function() {
            var self = this;
            this.collection.getNextPage(function(){
                self.loading = false;
            });
        },
        getDocLayoutView: function(doc) {
            var view;
            var viewOpts = {
                list: this
            };
            if (this.options.rowOptions) {
                viewOpts = this.options.rowOptions;
                viewOpts.list = this;
            }
            if (this.layout === 'row') {
                view = doc.getRow(viewOpts);
            } else if (this.layout === 'table') {
                view = doc.getTableRowView(viewOpts);
            } else if (this.layout === 'avatar') {
                view = doc.getAvatarView(viewOpts);
            }
            return view;
        },
        renderTotalUnreadVal: function() {
            var c = newsCollection.count || 0;
            this.$deselect.find('.unreadCount').html(c.toLocaleString());
        },
        render: function() {
            var self = this;
            this.$el.html('');
            self.renderTotalUnreadVal();
            this.$el.append(this.$deselect);
            this.$el.append(this.$saved);
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
        initialize: function() {
        },
        render: function() {
            var self = this;
            this.$el.html('<div class="btn-group">\
  <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button>\
  <ul class="dropdown-menu pull-right" role="menu">\
    <li role="presentation" class="dropdown-header">Details</li>\
    <li class="refresh"><a href="#" class="glyphicon glyphicon-refresh"> Refresh</a></li>\
    <li class="delete"><a href="#" class="glyphicon glyphicon-remove"> Delete</a></li>\
  </ul>\
</div>');
            var atMoment = this.model.getAt();
            var updatedMoment = this.model.getChannelLast();
            //var updatedMoment = this.model.getUrlDocLastUpdate();
            var actionsHeader = '';
            if(updatedMoment) {
                actionsHeader += 'Updated: '+updatedMoment.format('lll')+'<br>';
            }
            if(atMoment) {
                actionsHeader += 'Created: '+atMoment.format('lll')+'<br>';
            }
            this.$el.find('.dropdown-header').html(actionsHeader);
            //self.$el.append(this.tagsView.render().$el);
            //self.$el.append(this.groupsView.render().$el);
            //self.$el.append(this.editView.render().$el);
            //self.$el.append(this.deleteView.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .refresh": "clickRefresh",
            "click .delete": "clickDelete",
            "click .btn": "clickBtn"
        },
        clickBtn: function(e) {
            $(e.currentTarget).dropdown('toggle');
            e.stopPropagation();
            e.preventDefault();
        },
        clickRefresh: function(e) {
            var self = this;
            
            var newSub = new Model({}, {
                collection: this.model.collection
            });
            newSub.set({url: this.model.get('url')}, {silent: true});
            var saveModel = newSub.save(null, {
                silent: false ,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    // self.trigger("saved", self.model);
                    // self.collection.add(self.model);
                    self.render();
                });
            } else {
            }
            
            $(e.currentTarget).dropdown('toggle');
            e.stopPropagation();
            e.preventDefault();
        },
        clickDelete: function(e) {
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
            $(e.currentTarget).dropdown('toggle');
            e.stopPropagation();
            e.preventDefault();
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
            this.$el.html('<button class="btn btn-link" title="unsubscribe"><span class="glyphicon glyphicon-trash"></span></button>');
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

    var getFilenameSrc = function(filename) {
        return '/api/files/'+encodeURIComponent(filename);
    }

    var RowView = Backbone.View.extend({
        tagName: "li",
        className: "sub",
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
            this.$el.attr('title', this.model.get('url'));
            if(this.model.has('urlDoc')) {
                var urlDoc = this.model.get('urlDoc');
                var channelLinkUrl = urlDoc.url;
                if(urlDoc.channel) {
                    if(urlDoc.channel.link) {
                        channelLinkUrl = urlDoc.channel.link;
                    }
                    var $channel = $('<span class="channel"></span>');
                    if(urlDoc.channel.url && urlDoc.channel.url.faviconfile && urlDoc.channel.url.faviconfile.contentType.indexOf('image') === 0) {
                        $channel.append('<span class="favicon"><img src="'+getFilenameSrc(urlDoc.channel.url.faviconfile.filename)+'" /></span>');
                    } else if(this.model.has('channelUrlDoc') && this.model.get('channelUrlDoc').faviconfile && this.model.get('channelUrlDoc').faviconfile.contentType.indexOf('image') === 0) {
                        $channel.append('<span class="favicon"><img src="'+getFilenameSrc(this.model.get('channelUrlDoc').faviconfile.filename)+'" /></span>');
                    } else if(urlDoc.channel && urlDoc.channel.hasOwnProperty('image')) {
                        $channel.append('<span class="favicon"><img src="'+getFilenameSrc(urlDoc.channel.image.filename)+'" /></span>');
                    } else {
                        $channel.append('<span class="favicon"><img src="favicon.ico" /></span>');
                    }
                    if(urlDoc.channel.title) {
                        if(channelLinkUrl) {
                            $channel.append('<span class="title"><a href="'+channelLinkUrl+'" target="_new">'+urlDoc.channel.title+'</a></span>');
                        } else {
                            $channel.append('<span class="title"><a href="#" target="_new">'+urlDoc.channel.title+'</a></span>');
                        }
                    } else if(urlDoc.channel.meta && urlDoc.channel.meta.name) {
                        if(channelLinkUrl) {
                            $channel.append('<span class="title"><a href="'+channelLinkUrl+'" target="_new">'+urlDoc.channel.meta.name+'</a></span>');
                        } else {
                            $channel.append('<span class="title"><a href="#" target="_new">'+urlDoc.channel.meta.name+'</a></span>');
                        }
                    } else {
                        if(channelLinkUrl) {
                            $channel.append('<strong class="title"><a href="'+channelLinkUrl+'" target="_new">'+this.model.get('url')+'</a></strong>');
                        } else {
                            $channel.append('<strong class="title url"><a href="#" target="_new">'+this.model.get('url')+'</a></strong>');
                        }
                    }
                    this.$el.append($channel);
                } else if(this.model.has('channelUrlDoc')) {
                    var channelUrlDoc = this.model.get('channelUrlDoc');
                    var $channel = $('<span class="channel"></span>');
                    if(channelUrlDoc.faviconfile && channelUrlDoc.faviconfile.contentType.indexOf('image') === 0) {
                        $channel.append('<span class="favicon"><img src="'+getFilenameSrc(channelUrlDoc.faviconfile.filename)+'" /></span>');
                    } else {
                        $channel.append('<span class="favicon"><img src="favicon.ico" /></span>');
                    }
                    if(channelUrlDoc.title) {
                        if(channelUrlDoc.url) {
                            $channel.append('<span class="title"><a href="'+channelUrlDoc.url+'" target="_new">'+channelUrlDoc.title+'</a></span>');
                        } else {
                            $channel.append('<span class="title">'+channelUrlDoc.title+'</span>');
                        }
                    } else {
                        $channel.append('<strong class="title url"><a href="'+channelUrlDoc.url+'" target="_new">'+channelUrlDoc.url+'</a></strong>');
                    }
                    this.$el.append($channel);
                } else {
                    this.$el.append('<strong class="title url"><a href="'+this.model.get('url')+'" target="_new">'+this.model.get('url')+'</a></strong>');
                }
            } else {
                this.$el.append('<strong class="title url"><a href="'+this.model.get('url')+'" target="_new">'+this.model.get('url')+'</a></strong>');
            }
            
            if(this.model.has('unreadCount')) {
                this.$el.append(' <span class="unreadCount" title="Unread news stories">'+this.model.get('unreadCount').toLocaleString()+'</span>');
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
            this.$el.attr('data-id', this.model.id);
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
            if(this.$el.hasClass("selected")) {
                this.$el.removeClass("selected");
                this.$el.removeAttr("selected");
                if(this.hasOwnProperty('list')) {
                    this.list.trigger('deselect', this);
                }
                this.trigger('deselect');
            } else {
                this.$el.addClass("selected");
                this.$el.attr("selected", true);
                if(this.hasOwnProperty('list')) {
                    this.list.trigger('select', this);
                }
                this.trigger('select');
            }
            this.trigger('resize');
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
            this.$channel = $('<span class="channel"></span>');
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            if(this.options.actions) {
                this.actions = new ActionsView({model: this.model});
            }
        },
        render: function() {
            this.$el.html(''); 
            if(this.model.has('urlDoc')) {
                if(this.model.has('title')) {
                    this.$el.append('<strong class="title">'+this.model.get('title')+'</strong>');
                }
                var urlDoc = this.model.get('urlDoc');
                if(urlDoc.channel) {
                    
                    if(urlDoc.channel.url && urlDoc.channel.url.faviconfile && urlDoc.channel.url.faviconfile.contentType.indexOf('image') === 0) {
                        this.$channel.html('<span class="favicon"><img src="'+getFilenameSrc(urlDoc.channel.url.faviconfile.filename)+'" /></span> ');
                    } else if(this.model.has('channelUrlDoc') && this.model.get('channelUrlDoc').faviconfile && this.model.get('channelUrlDoc').faviconfile.contentType.indexOf('image') === 0) {
                        this.$channel.html('<span class="favicon"><img src="'+getFilenameSrc(this.model.get('channelUrlDoc').faviconfile.filename)+'" /></span> ');
                    } else if(urlDoc.channel && urlDoc.channel.hasOwnProperty('image')) {
                        this.$channel.append('<span class="favicon"><img src="'+getFilenameSrc(urlDoc.channel.image.filename)+'" /></span>');
                    } else {
                        this.$channel.html('<span class="favicon"><img src="favicon.ico" /></span> ');
                    }
                    if(urlDoc.channel.title) {
                        if(urlDoc.channel.link) {
                            this.$channel.html('<span class="title"><a href="'+urlDoc.channel.link+'" target="_new">'+urlDoc.channel.title+'</a></span>');
                        } else {
                            this.$channel.html('<span class="title">'+urlDoc.channel.title+'</span>');
                        }
                    }
                    
                    this.$el.append(this.$channel);
                }
            } else if(this.model.has('channelUrlDoc')) {
                    var channelUrlDoc = this.model.get('channelUrlDoc');
                    var $channel = $('<span class="channel"></span>');
                    if(channelUrlDoc.title) {
                        if(channelUrlDoc.url) {
                            $channel.append('<span class="title"><a href="'+channelUrlDoc.url+'" target="_new">'+channelUrlDoc.title+'</a></span>');
                        } else {
                            $channel.append('<span class="title">'+channelUrlDoc.title+'</span>');
                        }
                    }
                    this.$el.append($channel);
            }
            
            if(this.actions) {
                this.$el.append(this.actions.render().$el);
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
            this.$inputUrl = $('<input class="form-control" type="url" name="url" placeholder="ie. http://www.cnn.com/" autocomplete="off" id="subToUrl" />');
            
            //this.inputGroupsView = new SelectGroupsView({model: this.model});
            //this.feedView = new ActionFeedView({model: this.model});
            //this.deleteView = new ActionDeleteView({model: this.model});
            
            this.$form = $('<form class="subscribe form-horizontal" role="form"><span class="owner"></span><div class="form-group inputs"></div><div class="form-group controls"></div></form>');
            this.$form.find('.inputs').append('<label for="subToUrl" class="control-label col-sm-2">URL</label>');
            this.$form.find('.inputs').append($('<div class="col-sm-10"></div>').append(this.$inputUrl));
            //this.$form.find('fieldset').append('<hr />');
            //this.$form.find('fieldset').append(this.deleteView.render().$el);
            //this.$form.find('controls').append(this.inputGroupsView.render().$el);
            this.$form.find('.controls').append('<div class="col-sm-offset-2 col-sm-10"><button type="submit" class="btn btn-default btn-block">Subscribe</button></div>');
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
            var url = decodeURIComponent(this.$inputUrl.val().trim());
            
            if(url !== '' && url !== this.model.get('url')) {
                setDoc.url = url;
            }
            //console.log('setDoc')
            //console.log(setDoc)
            if(_.size(setDoc) == 0) {
                this.remove();
                return false;
            }
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