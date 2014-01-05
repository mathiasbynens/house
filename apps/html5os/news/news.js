(function() {
    
    var Model = Backbone.Model.extend({
        collectionName: "news",
        initialize: function(attr, opts) {
            var colOpts = {
                image: this
            };
            //attr.sizes = attr.sizes || [];
            //this.imageSizeCollection = new ImageSizeCollection(attr.sizes, colOpts);
            this.on("change", function(model, options){
                // console.log(arguments);
                //model.renderViews();
            });
            this.views = {};
        },
        getFromUrlSub: function(callback) {
            if(this.has('fromUrl')) {
                window.subsCollection.getOrFetchUrl(this.get('fromUrl'), callback);
            }
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
        getAvatar: function(options) {
            options = options || {};
            options.model = this;
            if (!this.avatar) {
                var view = this.avatar = new AvatarView(options);
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
        slugStr: function(str) {
            return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
        },
        setSlug: function(slug) {
            this.set('slug', this.slugStr(slug));
        },
        getNavigatePath: function() {
            return 'news/'+this.id;
        }
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'news',
        url: '/api/news',
        initialize: function() {
            var self = this;
            self.pageSize = 10;
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
                        // console.log(doc);
                    if(_.isArray(doc)) {
                        _.each(doc, insertOrUpdateDoc);
                        return;
                    }
                    var model = self.get(doc.id);
                    if(!model) {
                        var model = new self.model(doc);
                        self.add(model);
                    } else {
                        //console.log(model);
                        model.set(doc, {silent:true});
                        model.renderViews();
                    }
                }
                socket.on('insertedNews', function(doc) {
                    // console.log('inserted news');
                    insertOrUpdateDoc(doc);
                    self.count++;
                    self.trigger('count', self.count);
                });
                socket.on('updatedNews', function(doc) {
                    insertOrUpdateDoc(doc);
                });
                socket.on('deletedNews', function(id) {
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
                options.sort = "date-";
            }
            
            if(window.account && window.account.isUser()) {
                options.user_id = window.account.get('user');
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
            this.filterRead = true;
            this.$filters = $('<div class="list-filters"></div>');
            //this.$controls = $('<div class="list-controls"><a href="/" class="allNew"><b>new</b> / all</a> <a href="/" class="expandCollapse"><b>expanded</b> / list</a></div>');
            var allNew = '<div class="btn-group allNew" data-toggle="buttons"><label class="btn btn-default new active disabled" title="Show New"><input type="radio" name="options" id="new"><span class="glyphicon glyphicon-unchecked"></span></label><label class="btn btn-default all" title="Show All"><input type="radio" name="options" id="all"><span class="glyphicon glyphicon-check"></span></label></div>';
            var expandCollapse = '<div class="btn-group expandCollapse" data-toggle="buttons"><label class="btn btn-default expanded active disabled" title="Expanded View"><input type="radio" name="options" id="expanded"><span class="glyphicon glyphicon-list"></span></label><label class="btn btn-default list" title="List View"><input type="radio" name="options" id="list"><span class="glyphicon glyphicon-th-list"></span></label></div>';
            this.$controls = $('<div class="list-controls pull-right">'+allNew+' '+expandCollapse+'</div>');
            
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> news articles</div>');
            var $ul = this.$ul = $('<ul class="news expanded list-unstyled col-lg-6 col-lg-offset-3"></ul>');
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
            self.$el.scroll(_.throttle(function(){
                if(self.$el.is(":visible")) {
                    if(self.$ul.hasClass('expanded')) {
                        self.collection.each(function(doc){
                            if(!doc.getRow().$el.is(":visible")) {
                                // console.log('row is not visible!!!');
                            } else {
                                if(!doc.has('read')) {
                                    if(doc.getRow().$el.offset().top < 0) {
                                        doc.getRow().markAsRead();
                                    }
                                }
                            }
                        });
                    }
                  if(!self.loading && $(this).scrollTop() + $(this).innerHeight() + 250 >= $(this)[0].scrollHeight) {
                    self.loading = true;
                    self.loadMore();
                  }
                }
            }, 300));
             $(window).scroll(_.throttle(function(){
                if(self.$el.is(":visible")) {
                    if(self.$ul.hasClass('expanded')) {
                        self.collection.each(function(doc){
                            if(!doc.getRow().$el.is(":visible")) {
                                // console.log('row is not visible!!!');
                            } else {
                                if(!doc.has('read')) {
                                    if(doc.getRow().$el.offset().top < $(window).scrollTop() + doc.getRow().list.$el.offset().top) {
                                        doc.getRow().markAsRead();
                                    }
                                }
                            }
                        });
                    }
                    if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()) {
                        self.loading = true;
                        self.loadMore();
                    }
                }
            },300));
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
                
            } else if(f) {
                this.currentFilterO = _.clone(f);
                this.currentFilter = function(model) {
                    var l = _.size(this.currentFilterO);
                    for(var i in this.currentFilterO) {
                      if(this.currentFilterO[i] instanceof RegExp) {
                          if(this.currentFilterO[i].test(model.get(i))) {
                              l--;
                          }
                      } else {
                        if (this.currentFilterO[i] === model.get(i)) l--;
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
                if(!this.filterRead) {
                    loadO.read = true;
                }
                loadO.skip = 0; //flen;
                this.collection.load(loadO, function(){
                    if(self.currentFilter) {
                        self.filterLength = self.collection.filter(self.currentFilter).length;
                    } else {
                        self.filterLength = self.collection.length;
                    }
                });
            } else {
                // show all
                var loadO = {};
                if(!this.filterRead) {
                    loadO.read = true;
                }
                this.collection.load(loadO);
                self.$ul.children().show();
                self.currentFilter = false;
            }
        },
        events: {
          "click .list-pager": "loadMore",
          "click label.expanded": "expandCollapse",
          "click label.list": "expandCollapse",
          "click label.new": "allNew",
          "click label.all": "allNew",
        },
        expandCollapse: function(e) {
            this.$ul.toggleClass('expanded');
            
            if(this.$ul.hasClass('expanded')) {
                this.$el.find('.expandCollapse label.list').removeClass('disabled').removeClass('active');
                this.$el.find('.expandCollapse label.expanded').addClass('disabled').addClass('active');
            } else {
                this.$el.find('.expandCollapse label.expanded').removeClass('disabled').removeClass('active');
                this.$el.find('.expandCollapse label.list').addClass('disabled').addClass('active');
            }
            return false;
        },
        allNew: function(e) {
            if(this.filterRead) {
                this.$el.find('label.new').removeClass('disabled').removeClass('active');
                this.$el.find('label.all').addClass('disabled').addClass('active');
                this.filterRead = false;
                //this.$el.find('.allNew').html('new / <b>all</b>')
                if(this.filterLoadOptions) {
                    this.filter(this.filterLoadOptions);
                } else {
                    this.filter(false);
                }
            } else {
                this.$el.find('label.all').removeClass('disabled').removeClass('active');
                this.$el.find('label.new').addClass('disabled').addClass('active');
                this.filterRead = true;
                //this.$el.find('.allNew').html('<b>new</b> / all')
                this.filter(function(doc){
                    if(!doc.has('read')) {
                        return true;
                    }
                    return false;
                });
            }
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
            if(this.layout === 'row') {
                view = doc.getRow({list: self});
            } else if(this.layout === 'avatar') {
                view = doc.getAvatar({list: self});
            }
            return view;
        },
        render: function() {
            var self = this;
            this.$el.append(this.$filters);
            this.$el.append(this.$controls);
            this.$el.append(this.$ul);
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
            var rank = new Date(row.model.get('date'));
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
            //self.$el.append(this.deleteView.render().$el);
            self.$el.append(this.readView.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.actions = [];
            //this.groupsView = new GroupsView({id: this.id, model: this.model});
            //this.tagsView = new TagsView({id: this.id, model: this.model});
            //this.deleteView = new ActionDeleteView({id: this.id, model: this.model});
            //this.editView = new ActionEditView({id: this.id, model: this.model});
            this.readView = new ActionReadView({id: this.id, model: this.model});
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
    
    var ActionReadView = Backbone.View.extend({
        tagName: "span",
        className: "markReadBtn",
        initialize: function() {
            this.$span = $('<div class="checkbox" title="Mark un/read"><input type="checkbox" name="newsRead" value="isRead" id="read-'+this.model.id+'"><label for="read-'+this.model.id+'"> </label></div>');
        },
        render: function() {
            if(this.model.has('read')) {
                this.$span.find('input').prop('checked', true);
            } else {
                this.$span.find('input').removeAttr('checked');
            }
            this.$el.append(this.$span);
            this.setElement(this.$el);
            return this;
        },
        events: {
            //"change input": "select",
            "click .checkbox": "clickCheckbox"
        },
        clickCheckbox: function() {
            this.select();
            return false;
        },
        markRead: function() {
            var self = this;
            this.model.set({"read": true}, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.render();
            });
        },
        select: function() {
            var self = this;
            if(!this.model.has('read') || !this.model.get('read')) {
                this.markRead();
            } else {
                this.markedUnread = true; // flag so we don't override the user intention via scroll
                this.model.set({"read": null}, {silent: true});
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
        className: "story",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            //this.$span = $('<span></span>');
            this.starEmpty = '☆';
            this.starFull = '★';
            this.$star = $('<span title="Star this story" class="rating"><span class="star">'+this.starEmpty+'</span></span>'); // ★☆
            this.$byline = $('<span class="byline"><span class="author"></span> <span class="date"></span></span>');
            this.$el.append('<a target="_new" class="title"></a><span class="enclosure"></span>');
            this.$enclosure = this.$el.find('.enclosure');
            this.$summary = $('<span class="summary"></span>');
            this.$summaryFull = $('<span class="summary full"></span>');
            this.$el.append(this.$summary);
            this.$el.append(this.$summaryFull);
            this.$el.append(this.$star);
            this.$el.append('<span class="fromUrl"></span>');
            this.$el.append(this.$byline);
            this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            var self = this;
            this.$el.html(this.$span);
            
            var enclosureImgSrc = '';
            var enclosureAudioSrc = '';
            if(this.model.has('enclosures')) {
                // console.log(this.model.get('enclosures'))
                var enclosuresArr = this.model.get('enclosures');
                for(var e in enclosuresArr) {
                    var enclosure = enclosuresArr[e];
                    // length: "123699"
                    // type: "image/jpeg"
                    // url: "http://i.imgur.com/e5kWlOr.jpg"
                    console.log(enclosure)
                    if(enclosure.type.indexOf('image') === 0) {
                        if(enclosure.url) {
                            enclosureImgSrc = enclosure.url;
                        }
                    } else if (enclosure.type.indexOf('audio') === 0) {
                        if(enclosure.url) {
                            enclosureAudioSrc = enclosure.url;
                            console.log(enclosureAudioSrc)
                            var encloseureHtml = '<audio controls preload="none" src="'+enclosureAudioSrc+'" class="enclosureAudio"></audio>';
                            if(this.$enclosure.html() !== encloseureHtml) {
                                this.$enclosure.html(encloseureHtml);
                            }
                        }
                    }
                }
            }
            if(this.model.has('title')) {
                this.$el.find('.title').html(this.model.get('title'));
                var msgStr = '';
                var msgStrAbbr = '';
                if(this.model.has('summary')) {
                    msgStr = this.model.get('summary');
                } else if(this.model.has('description')) {
                    msgStr = this.model.get('description');
                }
                var regex = /<img.*?src=('|")(.*?)('|")/;
                var matches = regex.exec(msgStr);
                var msgStrTxt = ($('<span>'+br2nl(msgStr)+'</span>').text());
                var trimLen = 333;
                if(msgStrTxt.length > trimLen) {
                    msgStrAbbr = msgStrTxt.substr(0, trimLen);
                    msgStrAbbr += ' ... ';
                    
                    var imgsrc = '';
                    if(enclosureImgSrc) {
                        msgStrAbbr = '<img src="'+enclosureImgSrc+'" class="enclosureImg">'+msgStrAbbr;
                    } else if(matches && matches.length > 2) {
                        imgsrc = matches[2];
                        if(imgsrc.indexOf('http://yarpp.org') === -1 && imgsrc.indexOf('http://feeds.feedburner.com/') === -1 && imgsrc.indexOf('buysellads.com') === -1) {
                            msgStrAbbr = '<img src="'+imgsrc+'" class="abbrImg">'+msgStrAbbr;
                        }
                    }
                } else {
                    if(enclosureImgSrc) {
                        msgStrAbbr = '<img src="'+enclosureImgSrc+'" class="enclosureImg">'+msgStrTxt;
                    } else if(matches && matches.length > 2) {
                        imgsrc = matches[2];
                        if(imgsrc.indexOf('http://yarpp.org') === -1 && imgsrc.indexOf('http://feeds.feedburner.com/') === -1 && imgsrc.indexOf('buysellads.com') === -1) {
                            msgStrAbbr = '<img src="'+imgsrc+'" class="enclosureImg">'+msgStrAbbr;
                        }
                    } else {
                        msgStrAbbr = msgStrTxt;
                    }
                }
                this.$summary.html('<p>'+msgStrAbbr+'</p>');
                if(msgStr.indexOf('<p>') === -1) {
                    msgStr = '<p>'+msgStr+'</p>';
                }
                this.$summaryFull.html(msgStr);
            } else {
                console.log(this.model.attributes)
                if(this.model.get('summary')) {
                    // this.$summary.html(this.model.get('summary'));
                    this.$el.find('.title').html(this.model.get('summary'));
                } else if(this.model.get('description')) {
                    this.$el.find('.title').html(this.model.get('description'));
                }
            }
            if(this.model.has('link')) {
                this.$el.find('.title').attr('href', this.model.get('link'));
            }
            if(this.model.has('author')) {
                this.$el.find('.author').html(''+this.model.get('author')+'');
            }
            if(this.model.has('fromUrl')) {
                this.$el.find('.fromUrl').html(this.model.get('fromUrl'));
                this.$el.find('.fromUrl').attr('data-fromUrl', this.model.get('fromUrl'));
            }
            if(this.model.has('date')) {
                var $at = this.$el.find('.date');
                if(window.clock) {
                    $at.attr('title', clock.moment(this.model.get('date')).format('LLLL'));
                    $at.html(' &middot; '+clock.moment(this.model.get('date')).calendar()+' &middot; ');
                } else {
                    $at.html(this.model.get('date'));
                }
            }
            if(this.model.has('owner')) {
                //$byline.append(' by '+this.model.get('owner').name);
            }
            if(this.model.has('fromUrl')) {
                this.model.getFromUrlSub(function(sub){
                    if(sub) {
                        self.renderSub(sub);
                    }
                });
            }
            if(this.model.has('fav')) {
                //this.$star.find('.star').html(this.starFull);
                this.$star.addClass('selected');
            } else {
                this.$star.removeClass('selected');
            }
            this.$el.attr('data-id', this.model.id);
            this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        renderSub: function(sub) {
            var self = this;
            sub.once("change", function(model){
                // console.log('sub changed!!!');
                self.renderSub(model);
            });
            self.$el.find('.fromUrl').html('');
            self.$el.find('.fromUrl').append(sub.getNewAvatar().render().$el);
            sub.bind('destroy', self.remove, self);
        },
        events: {
            "click .star": "fav",
            // "click .title": "selectTitle",
            "click": "select"
        },
        fav: function() {
            if(!this.model.has('fav')) {
                this.model.set({"fav": true}, {silent: true});
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
                this.model.set({"fav": null}, {silent: true});
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
        markAsRead: function(e) {
            if(!this.actions.readView.hasOwnProperty('markedUnread')) { // check the user didnt already mark this unread manually
                this.actions.readView.markRead();
            }
        },
        selectTitle: function(e) {
            // alert('title')
            // if(this.$el.hasClass("selected")) {
            //     //this.$el.removeClass("selected");
            //     //this.$el.removeAttr("selected");
                
            // } else {
            //     this.select();
            //     return false;
            // }
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
          this.$el.remove();
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
            
            //this.$el.append(this.actions.render().$el);
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
    window.br2nl = function(str) {
        return str.replace(/<br\s*\/?>/mg,"\n");
    }
    
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
            self.uploadAvatarFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'image', metadata:{groups: ['public']}});
            self.uploadAvatarFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(data.image) {
                    if(!self.model.isNew()) {
                        var setDoc = {
                            avatar: data.image
                        }
                        self.model.set(setDoc, {silent: true});
                        var saveModel = self.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        if(saveModel) {
                            saveModel.done(function() {
                                self.trigger("newImage", self.model);
                                self.render();
                            });
                        }
                    } else {
                        
                    }
                }
            });
            self.uploadMediaAudioFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'audio', metadata:{groups: ['public']}});
            self.uploadMediaAudioFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(!self.model.isNew()) {
                    var setDoc = {
                        audio: data.file
                    }
                    self.model.set(setDoc, {silent: true});
                    var saveModel = self.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.trigger("newAudio", self.model);
                            self.render();
                        });
                    }
                } else {
                    
                }
            });
            self.uploadMediaVideoFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'video', metadata:{groups: ['public']}});
            self.uploadMediaVideoFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(!self.model.isNew()) {
                    var setDoc = {
                        video: data.file
                    }
                    self.model.set(setDoc, {silent: true});
                    var saveModel = self.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.trigger("newVideo", self.model);
                            self.render();
                        });
                    }
                } else {
                    
                }
            });
            
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
            
            this.$inputAtDate = $('<input name="at-date" type="date" />');
            this.$inputAtTime = $('<input name="at-time" type="time" />');
            
            this.$inputSeq = $('<input type="text" name="seq" placeholder="sequence #" />');
            
            this.atPublished = $('<span class="published"><span class="by">by <span class="owner"></span></span><br /><span class="at">at </span></span>');
            this.atPublished.find('.owner').append(this.$owner);
            this.atPublished.find('.at').append(this.$inputAtDate);
            this.atPublished.find('.at').append(this.$inputAtTime);
            
            this.youtubeView = new YoutubeView({model: this.model});
            this.inputGroupsView = new SelectGroupsView({model: this.model});
            this.feedView = new ActionFeedView({model: this.model});
            this.deleteView = new ActionDeleteView({model: this.model});
            
            this.$form = $('<form class="post"><fieldset></fieldset><controls></controls></form>');
            this.$form.find('fieldset').append(this.$inputTitle);
            this.$form.append(this.$msgToolbar);
            this.$form.find('fieldset').append(this.$inputMsg);
            this.$form.find('fieldset').append('<hr />');
            this.$form.find('fieldset').append(this.$slugShare);
            this.$form.find('fieldset').append(this.$inputSeq);
            this.$form.find('fieldset').append(this.atPublished);
            this.$form.find('fieldset').append(this.youtubeView.render().$el);
            
            this.$form.find('fieldset').append('<span class="avatar"><span class="embed"></span><button class="attachImage">Attach Image</button></span>');
            this.$form.find('fieldset').append('<span class="audio"><span class="embed"></span><button class="attachAudio">Attach Audio</button></span>');
            this.$form.find('fieldset').append('<span class="video"><span class="embed"></span><button class="attachVideo">Attach Video</button></span>');
            
            this.$form.find('fieldset').append(this.uploadAvatarFrame.render().$el.hide());
            this.$form.find('fieldset').append(this.uploadMediaAudioFrame.render().$el.hide());
            this.$form.find('fieldset').append(this.uploadMediaVideoFrame.render().$el.hide());
            
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
                if(this.model.has('seq')) {
                    this.$inputSeq.val(this.model.get('seq'));
                } else if(this.model.isNew()) {
                    var ii = parseInt(this.model.collection.count) + 1;
                    this.$inputSeq.val(ii);
                }
                if(this.model.has('msg')) {
                    this.$inputMsg.val(this.model.get('msg'));
                }
                if(this.model.has('slug')) {
                    this.$inputSlug.val(this.model.get('slug'));
                }
                if(this.model.has('youtube')) {
                    var youtube = this.model.get('youtube');
                    this.youtubeView.val(youtube.id);
                }
                
                if(this.model.has('avatar')) {
                    var avatarImage = this.model.get('avatar');
                    var $avatarImg = $('<img src="/api/files/'+avatarImage.filename+'" />');
                    // TODO detatch media
                    this.$form.find('.avatar .embed').html($avatarImg);
                }
                if(this.model.has('audio')) {
                    var media = this.model.get('audio');
                    var $mediaEmbed = $('<audio controls preload="none" src="/api/files/'+media.filename+'" />');
                    // TODO detatch media
                    this.$form.find('.audio .embed').html($mediaEmbed);
                }
                if(this.model.has('video')) {
                    var media = this.model.get('video');
                    var $mediaEmbed = $('<video controls preload="none" src="/api/files/'+media.filename+'" />');
                    // TODO detatch media
                    this.$form.find('.video .embed').html($mediaEmbed);
                }
                
                if(this.model.has('groups')) {
                    this.inputGroupsView.val(this.model.get('groups'));
                }
                if(this.model.has('at')) {
                    var m = moment(this.model.get('at'));
                    this.$inputAtTime.val(m.format('HH:mm'));
                    this.$inputAtDate.val(m.format('YYYY-MM-DD'));
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
            'blur input[name="title"]': "blurTitle",
            "click .attachImage": "attachImage",
            "click .attachAudio": "attachAudio",
            "click .attachVideo": "attachVideo"
        },
        attachImage: function() {
            this.uploadAvatarFrame.pickFiles();
            this.uploadAvatarFrame.$el.show();
            return false;
        },
        attachAudio: function() {
            this.uploadMediaAudioFrame.pickFiles();
            this.uploadMediaAudioFrame.$el.show();
            return false;
        },
        attachVideo: function() {
            this.uploadMediaVideoFrame.pickFiles();
            this.uploadMediaVideoFrame.$el.show();
            return false;
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
            var seq = this.$inputSeq.val();
            var msg = this.$inputMsg.val();
            var slug = this.$inputSlug.val();
            var groups = this.inputGroupsView.val();
            var youtube = this.youtubeView.val();
            
            var atDate = this.$inputAtDate.val();
            var atTime = this.$inputAtTime.val();
            
            if(atDate && atTime) {
                var formDate = moment(atDate+' '+atTime, "YYYY-MM-DD HH:mm");
                var at = new Date(this.model.get('at'));
                if(formDate && at.getTime() !== formDate.toDate().getTime()) {
                    setDoc.at = formDate.toDate();
                }
            }
            if(title !== '' && title !== this.model.get('title')) {
                setDoc.title = title;
            }
            if(seq !== '' && seq !== this.model.get('seq')) {
                setDoc.seq = parseInt(seq, 10);
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
            if(youtube && !_.isEqual(youtube, this.model.get('youtube'))) {
                setDoc.youtube = youtube;
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