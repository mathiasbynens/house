(function() {

    var Model = Backbone.Model.extend({
        collectionName: "url",
        initialize: function(attr, opts) {
            this.on("change", function(model, options) {});
            this.views = {};
        },
        getCommentCollection: function() {
            if(!this.commentCollection) {
                var colOpts = {
                    urlModel: this
                };
                this.commentCollection = new UrlCommentCollection([], colOpts); // could preload comments here from the urlDoc.comments
            }
            return this.commentCollection;
        },
        getOwner: function(callback) {
            if (this.has('owner')) {
                var owner = this.get('owner');
                var user = window.usersCollection.getOrFetch(owner.id, callback);
            }
        },
        getImage: function() {
            if (!this.has('image')) return;
            if (!this.hasOwnProperty('imageModel')) {
                this.imageModel = new ImagesBackbone.Model(this.get('image'));
            }
            return this.imageModel;
        },
        getOgImage: function() {
            if (!this.has('ogImage')) return;
            if (!this.hasOwnProperty('ogImageModel')) {
                this.ogImageModel = new ImagesBackbone.Model(this.get('ogImage'));
            }
            return this.ogImageModel;
        },
        getNewShareView: function(options) {
            options = options || {};
            options.model = this;
            return new ShareView(options);
        },
        getShareView: function(options) {
            options = options || {};
            options.model = this;
            if (!this.shareView) {
                var view = this.shareView = new ShareView(options);
                this.views.shareView = view;
            }
            return this.shareView;
        },
        getFullView: function(options) {
            options = options || {};
            options.model = this;
            if (!this.full) {
                var view = this.full = new FullView(options);
                this.views.full = view;
            }
            return this.full;
        },
        getAvatarView: function(options) {
            options = options || {};
            options.model = this;
            if (!this.avatar) {
                var view = this.avatar = new AvatarView(options);
                this.views.avatar = view;
            }
            return this.avatar;
        },
        getRow: function(options) {
            return this.getRowView(options);
        },
        getRowView: function(options) {
            options = options || {};
            options.model = this;
            if (!this.row) {
                var view = this.row = new RowView(options);
                this.views.row = view;
            }
            return this.row;
        },
        getTableRowView: function(options) {
            options = options || {};
            options.model = this;
            if (!this.trow) {
                var view = this.trow = new TableRowView(options);
                this.views.trow = view;
            }
            return this.trow;
        },
        renderViews: function() {
            //console.log(this.views);
            for (var i in this.views) {
                this.views[i].render();
            }
        },
        getNavigatePath: function() {
            if (this.has('url')) {
                return 'url/' + encodeURIComponent(this.get('url'));
            } else {
                return 'id/' + this.id;
            }
        },
        getSharePath: function() {
            //return 'share/' + encodeURIComponent(this.get('url'));
            return 'share/' + this.id;
        },
        getShareUrl: function() {
            var path = $('base[href]').attr('href')+this.getSharePath();
            return 'http://'+window.location.hostname+path;
        },
        getAtFormatted: function(format) {
            if(!format) {
                format = "YYYY-MM-DDTHH:mm:ssZZ"
            }
            return this.getAt().format(format);
        },
        getAt: function() {
            if(!this.atMoment) {
                var at = this.get('at');
                if(window.clock) {
                    this.atMoment = clock.moment(this.get('at'));
                }
            }
            // $permalink.find('time').attr('datetime', m.format("YYYY-MM-DDTHH:mm:ssZZ"));
            // $at.attr('title', m.format('LLLL'));
            // $permalink.find('time').html(m.calendar());
            return this.atMoment;
        }
    });
    var UrlComment = Backbone.Model.extend({
        initialize: function(attr, opts) {
            this.options = opts;
        },
        getUser: function(callback) {
            if(this.has('user')) {
                var user = this.get('user');
                if(user.id) {
                    window.usersCollection.getOrFetch(user.id, callback);
                } else {
                    
                }
            }
        },
        getView: function(options) {
            if (!options) options = {};
            if (!this.hasOwnProperty("view")) {
                options.model = this;
                this.view = this.getNewView(options);
            }
            return this.view;
        },
        getNewView: function(options) {
            if (!options) options = {};
            options.model = this;
            return new UrlCommentView(options);
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
        }
    });
    var UrlCommentCollection = Backbone.Collection.extend({
        model: UrlComment,
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
            console.log(this.url);
            console.log(this.url());
        },
        url: function() {
            return "/api/urls/" + this.options.urlModel.get("id") + "/comments";
        },
        getView: function(options) {
            var self = this;
            if (!this.hasOwnProperty("view")) {
                if (!options) options = {};
                if(this.options.urlModel) {
                    options.urlModel = this.options.urlModel;
                }
                options.collection = this;
                this.view = new UrlCommentList(options);
                this.view.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.view;
        },
        getForm: function(options) {
            var self = this;
            if(!this.hasOwnProperty('formView')) {
                if (!options) options = {
                };
                if(this.options.urlModel) {
                    options.urlModel = this.options.urlModel;
                }
                options.collection = this;
                this.formView = new UrlCommentForm(options);
            }
            return this.formView;
        },
        load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({
                add: true,
                complete: function() {
                    if (callback) callback();
                }
            });
        },
        comparator: function(a) {
            return a.get("at");
        }
    });
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'urls',
        url: '/api/urls',
        initialize: function() {
            var self = this;
            self.pageSize = 25;
            this.resetFilters();
            require(['/desktop/socket.io.min.js'], function() {
                var socketOpts = {};
                if (window.location.protocol.indexOf('https') !== -1) {
                    socketOpts.secure = true;
                } else {
                    socketOpts.secure = false;
                }
                var socket = self.io = io.connect('//' + window.location.host + '/socket.io/io', socketOpts);
                if (socket.socket.connected) {
                    console.log('already connected and now joining ' + self.collectionName);
                    socket.emit('join', self.collectionName);
                }
                socket.on('connect', function(data) {
                    console.log('connected and now joining ' + self.collectionName);
                    socket.emit('join', self.collectionName);
                });
                var insertOrUpdateDoc = function(doc) {
                    console.log(doc);
                    if (_.isArray(doc)) {
                        _.each(doc, insertOrUpdateDoc);
                        return;
                        s
                    }
                    var model = self.get(doc.id);
                    if (!model) {
                        var model = new self.model(doc);
                        self.add(model);
                    } else {
                        console.log('update model with doc')
                        model.set(doc, {
                            silent: true
                        });
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
                complete: function(json) {
                    callback(aj.getResponseHeader('X-Count'));
                },
                xhrFields: {
                    withCredentials: true
                }
            });
        },
        refreshCount: function() {
            var self = this;
            self.headCount(function(count) {
                self.count = count;
                self.trigger('count', count);
            });
        },
        sortField: 'at-',
        load: function(options, success) {
            var self = this;
            if (!this.count) {
                this.refreshCount();
            }
            if (!options) {
                options = {};
            }
            if (!options.limit) {
                options.limit = self.pageSize;
            }
            if (!options.sort) {
                options.sort = this.sortField; //"at-";
            }
            this.applyFilters(options);
            this.fetch({
                data: options,
                update: true,
                remove: false,
                success: function(collection, response) {
                    if (success) {
                        success();
                    }
                },
                error: function(collection, response) {}
            });
        },
        search: function(term, callback) {
            var self = this;
            if (this.searching) return;
            this.searching = true;
            var limit = this.pageSize || 500;
            this.fetch({
                update: true,
                remove: false,
                data: {
                    q: term,
                    sort: 'at-',
                    limit: limit
                },
                complete: function() {
                    self.searching = false;
                    if (callback) {
                        callback();
                    }
                }
            });
        },
        getNextPage: function(callback) {
            if (this.length < this.count) {
                this.load({
                    skip: this.length
                }, callback);
            }
        },
        applyFilters: function(options) {

        },
        updateFilter: function(filter) {
            this.reset();
            this.load();
        },
        comparator: function(a) {
            var endStr = this.sortField.substr(this.sortField.length - 1);
            var sortStr = this.sortField;
            if (endStr === '-') {
                sortStr = this.sortField.substr(0, this.sortField.length - 1);
            }

            var v;
            if (sortStr === 'at') {
                if (a.has(sortStr)) {
                    v = a.get(sortStr);
                    v = new Date(v).getTime();
                } else {
                    v = new Date().getTime();
                }
            } else if (a.has(sortStr)) {
                v = a.get(sortStr);
            }
            if (endStr === '-') {
                if (typeof v == 'string') {
                    return String.fromCharCode.apply(String, _.map(v.split(''), function(c) {
                        return 0xffff - c.charCodeAt(0);
                    }));
                }
                return v * -1;
            } else {
                return v;
            }
        },
        resetFilters: function() {},
        getOrFetch: function(id, callback) {
            var self = this;
            var doc;
            doc = this.get(id);
            if (doc) {
                callback(doc);
            } else {
                var options = {
                    "_id": id
                };
                this.fetch({
                    data: options,
                    update: true,
                    remove: false,
                    success: function(collection, response) {
                        if (response) {
                            doc = self.get(id);
                            callback(doc);
                        } else {
                            callback(false);
                        }
                    },
                    error: function(collection, response) {
                        callback(false);
                    }
                });
            }
        },
        getOrFetchUrl: function(id, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({
                url: id
            }));
            if (doc) {
                callback(doc);
            } else {
                var options = {
                    "url": id
                };
                this.fetch({
                    data: options,
                    update: true,
                    remove: false,
                    success: function(collection, response) {
                        if (response) {
                            doc = _.first(self.where({
                                url: id
                            }));
                            callback(doc);
                        } else {
                            callback(false);
                        }
                    },
                    error: function(collection, response) {
                        callback(false);
                    }
                });
            }
        },
        newUrl: function(url, callback) {
            var self = this;
            var setDoc = {};
            var model = new Model({}, {
                collection: self
            });
            if (!url) {
                alert('URL required!');
                return false;
            }
            setDoc.url = url;

            /*if(this.$public.is(':checked')) {
                setDoc.groups = ['public'];
            }*/

            model.set(setDoc, {
                silent: true
            });
            var saveModel = model.save(null, {
                silent: false,
                wait: true
            });
            if (saveModel) {
                saveModel.done(function() {
                    //self.trigger("saved", self.model);
                    if (!self.get(model.id)) {
                        self.add(model);
                    }
                    if (callback) {
                        callback(model);
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
        getSearchView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("searchView")) {
                options.collection = this;
                this.searchView = new SearchView(options);
                this.searchView.on("selected", function(view) {
                    self.trigger("selected", view.model);
                });
            }
            return this.searchView;
        }
    });

    var SearchView = Backbone.View.extend({
        tagName: 'div',
        className: 'searchUrls',
        initialize: function() {
            var self = this;
            this.$form = $('<form class="navbar-form navbar-left" role="search">\
            <div class="form-group">\
                <div class="input-group">\
                    <input type="text" class="form-control" placeholder="http://" data-loading-text="loading">\
                    <span class="input-group-btn">\
                        <button class="go btn btn-default" type="button" data-loading-text="...">Go</button>\
                    </span>\
                </div>\
            </div>\
          </form>');
            this.$input = this.$form.find('input');

            this.on('searchComplete', function() {
                //self.$input.button('reset');
                self.$form.find('button.go.btn').button('reset');
            });
            this.on('searchLoading', function(query) {
                if (query) {
                    self.$input.val(query);
                    //self.$input.button('loading');
                }
                self.$form.find('button.go.btn').button('loading');
            });
        },
        events: {
            "submit form": "submit",
            "keyup input": "debouncedKeyUp",
            "click button.go": "clickGo"
        },
        debouncedKeyUp: _.debounce(function(e) {
            this.keyUp(e);
        }, 500),
        keyUp: function(e) {
            if (e.keyCode == 27) {
                this.$input.val('');
            }
            //console.log(e.keyCode)
            //if (this.$input.val()) {
                this.$form.find('button.go.btn').button('loading');
                this.trigger('search', this.$input.val().trim());
            //}
        },
        clickGo: function() {
            this.$form.find('button.go.btn').button('loading');
            this.parseUrlInput();
            this.trigger('submit', this.$input.val().trim());
            return false;
        },
        submit: function(e) {
            this.$form.find('button.go.btn').button('loading');
            this.parseUrlInput();
            this.trigger('submit', this.$input.val());
            return false;
        },
        parseUrlInput: function() {
            var v = this.$input.val();
            v = v.trim();
            if (v !== '' && v.indexOf('http') !== 0) {
                v = 'http://' + v;
            }
            this.$input.val(v);
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append(this.$form);
            this.setElement(this.$el);
            return this;
        },
        focus: function() {
            this.$input.focus();
        }
    });

    // urlcommentlistview
    var UrlCommentList = Backbone.View.extend({
        tagName: "div",
        className: "commentList",
        initialize: function() {
            var self = this;
            this.$ul = $('<ul class="list-unstyled"></ul>');
            this.collection.on("add", function(m) {
                //self.appendModel(m);
                var view = self.getDocLayoutView(m);
                self.appendRow(view);
                //self.renderPagination();
                m.on('remove', function() {
                    view.$el.remove();
                    return false;
                });
            });
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $('<ul class="list-unstyled"></ul>');
                } else {
                    self.$ul.html("");
                }
            });
        },
        render: function() {
            var self = this;
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("<h1>Comments</h1>");
            this.collection.each(function(m, i, c) {
                var view = self.getDocLayoutView(m);
                self.appendRow(view);
                //self.renderPagination();
                m.on('remove', function() {
                    view.$el.remove();
                    return false;
                });
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        getDocLayoutView: function(doc) {
            var view;
            var viewOpts = {
                list: this
            };
            if (this.options.rowOptions) {
                viewOpts = this.options.rowOptions;
                viewOpts.list = this;
            }
            view = doc.getView(viewOpts);
            return view;
        },
        appendRow: function(row) {
            //console.log(row.model)
            var rank = new Date(row.model.get('at'));
            rank = rank.getTime();
            var rowEl = row.render().$el;
            if (this.currentFilter && !this.currentFilter(row.model)) {
                rowEl.hide();
            }
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$ul.children();
            var last = $lis.last();
            var lastRank = parseInt(last.attr('data-sort-rank'), 10);
            if (rank > lastRank) {
                $lis.each(function(i, e) {
                    if (d) return;
                    var r = parseInt($(e).attr('data-sort-rank'), 10);
                    if (rank > r) {
                        $(e).before(rowEl);
                        d = true;
                    }
                });
            }
            if (!d) {
                this.$ul.append(rowEl);
            }
        }
    });

    var ListView = Backbone.View.extend({
        initialize: function(options) {
            var self = this;
            //this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> urls</div>');
            var layout = options.layout || 'table';
            this.initLayout(layout);
            
            this.pagesLength = 1;
            this.currentPage = 1;
            this.$pager = $('<div class="pages"><ul class="pagination"><li class="previous"><a href="#">«</a></li><li><a href="#">1</a></li><li class="next"><a href="#">»</a></li></ul></div>');
            if (!this.collection) {
                this.collection = new Collection();
            }
            this.pageSize = this.collection.pageSize;
            this.collection.bind("add", function(doc) {
                var view = self.getDocLayoutView(doc);
                self.appendRow(view);
                self.renderPagination();
                doc.on('remove', function() {
                    view.$el.remove();
                    return false;
                });
            });

            this.collection.on('reset', function() {
                self.render();
            });
            this.collection.on('count', function() {
                self.renderPagination();
            });
            this.collection.on('reset', function() {
                self.render();
            });
            /*$(window).scroll(function(){
                if(self.$el.is(":visible")) {
                  if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()){
                    self.loading = true;
                    self.loadMore();
                  }
                }
            });*/
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
            if (f && typeof f == 'function') {
                this.currentFilter = f;
                self.searchResults = this.collection.filter(function(model) {
                    if (f(model)) {
                        //self.getDocLayoutView(model).$el.show();
                        return true;
                    }
                    //self.getDocLayoutView(model).$el.hide();
                    return false;
                });
                self.renderPage(1);
                self.renderPagination();
            } else {
                self.currentFilter = false;
                delete self.searchResults;
                self.renderPage(1);
                self.renderPagination();
            }
        },
        search: function(q, callback) {
            var self = this;
            this.searchQ = q;
            console.log(q);
            if (q === '') {
                delete self.searchResults;
                self.renderPage(1);
                self.renderPagination();
                if (callback) {
                    callback();
                }
                return;
            }
            var re = q;
            q = re.replace(/\?/gi, '\\?');
            var regex = new RegExp(q, 'i');
            this.collection.search(q, function() {
                self.searchResults = self.collection.filter(function(e) {
                    return regex.test(e.get('url'));
                });
                self.renderPage(1);
                self.renderPagination();

                if (callback) {
                    callback();
                }
            });
        },
        events: {
            "click .list-pager": "loadMore",
            "click .pagination li": "selectPage",
        },
        selectPage: function(e) {
            var i = $(e.target).attr('href').substr(1);
            if (i == 'next') {
                this.currentPage++;
                this.$pager.find('.active').next().addClass('active').siblings().removeClass('active');
            } else if (i == 'prev') {
                this.currentPage--;
                this.$pager.find('.active').prev().addClass('active').siblings().removeClass('active');
            } else {
                this.currentPage = i;
                $(e.target).parent().addClass('active').siblings().removeClass('active');
            }
            this.renderPage(this.currentPage);
            return false;
        },
        loadMore: function() {
            var self = this;
            this.collection.getNextPage(function() {
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
        renderPagination: function() {
            //var c = this.collection.count > len ? this.collection.count : len;
            var cLen = this.collection.length;
            if (this.searchResults) {
                cLen = this.searchResults.length;
            } else if (this.collection.count) {
                cLen = this.collection.count;
            }
            //var cLen = this.searchResults ? this.searchResults.length : this.collection.length;
            this.pagesLength = Math.ceil(cLen / this.pageSize) + 1;
            if (this.$pager.find('ul li').length !== this.pagesLength + 2) {
                var liPages = '';
                var i = 1;
                while (i < this.pagesLength) {
                    var liClass = '';
                    if (i == this.currentPage) {
                        liClass = ' class="active"';
                    }
                    liPages = liPages + '<li' + liClass + '><a href="#' + i + '">' + i + '</a></li>';
                    i++;
                }
                this.$pager.find('ul').html('<li class="previous"><a href="#prev">«</a></li>' + liPages + '<li class="next"><a href="#next">»</a></li>');
            }
        },
        renderPage: function(pageNum) {
            var self = this;
            this.$ul.html('');
            this.currentPage = pageNum; //
            var s = (pageNum - 1) * this.pageSize;
            var col = this.searchResults ? this.searchResults : this.collection;

            var l = col.length;
            if (col.count) {
                l = col.count;
            }
            var returnSlice = function() {
                var e = (l < s + self.pageSize) ? l : s + self.pageSize;
                col.slice(s, e).forEach(function(doc, i, c) {
                    //console.log(arguments)
                    var view = self.getDocLayoutView(doc);
                    self.appendRow(view);
                    self.renderPagination();
                    doc.on('remove', function() {
                        view.$el.remove();
                        return false;
                    });
                });
            }
            if (col.length < col.count) {
                col.load({
                    skip: col.length
                }, returnSlice);
            } else {
                returnSlice();
            }
        },
        render: function() {
            var self = this;
            // this.$el.html('');
            // this.$el.append(this.$ul);
            // this.$ul.html('');
            this.setLayout(this.layout, true);
            //this.collection.sort({silent:true});
            this.collection.each(function(doc) {
                var view = self.getDocLayoutView(doc);
                self.appendRow(view);
            });
            this.$el.append(this.$pager);
            this.renderPagination();
            this.setElement(this.$el);
            return this;
        },
        renderPager: function() {
            var len = this.collection.length;
            var c = this.collection.count > len ? this.collection.count : len;
            this.$pager.find('.list-length').html(len);
            this.$pager.find('.list-count').html(c);
        },
        refreshPager: function() {},
        getModelSortRank: function(model) {
            var endStr = this.collection.sortField.substr(this.collection.sortField.length - 1);
            var sortField = this.collection.sortField;
            if (endStr === '-') {
                sortField = this.collection.sortField.substr(0, this.collection.sortField.length - 1);
            }
            if(sortField === 'at') {
                var rank = new Date(model.get('at'));
                return rank = rank.getTime();
            } else  if(sortField === 'views') {
                if (endStr === '-') {
                    return model.get('views');
                }
                return model.get('views') * -1;
            }
        },
        appendRow: function(row) {
            //console.log(row.model)
            var rank = this.getModelSortRank(row.model);
            var rowEl = row.render().$el;
            if (this.currentFilter && !this.currentFilter(row.model)) {
                rowEl.hide();
            }
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$ul.children();
            var last = $lis.last();
            var lastRank = parseInt(last.attr('data-sort-rank'), 10);
            if (true) { // rank > lastRank
                $lis.each(function(i, e) {
                    if (d) return;
                    var r = parseInt($(e).attr('data-sort-rank'), 10);
                    if (rank > r) {
                        $(e).before(rowEl);
                        d = true;
                    }
                });
            }
            if (!d) {
                this.$ul.append(rowEl);
            }
        }
    });


    var PrivacyBtnMenu = Backbone.View.extend({
        tagName: "div",
        className: "btn-group",
        initialize: function(options) {
            this.$btn = $('<button title="Privacy" type="button" class="btn btn-link dropdown-toggle" data-toggle="dropdown"><span class="privacyIcon glyphicon glyphicon-lock"></span></button>');
            if(options.btnClass) {
                this.$btn.addClass(options.btnClass);
            }
            this.$menu = $('<ul class="dropdown-menu" role="menu">\
          <li class="public"><a href="#"><span class="glyphicon glyphicon-globe"> </span>Make Public</a></li>\
          <li class="private"><a href="#"><span class="glyphicon glyphicon-lock"> </span>Make Private</a></li>\
          <li class="divider"></li>\
          <li class="owner"><a href="#"> </a></li>\
        </ul>');
        },
        render: function() {
            var self = this;
            
            if (this.model && this.model.has('groups') && this.model.get('groups').indexOf('public') !== -1) {
                this.renderPublic();
            } else if (!this.model.has('groups') || this.model.get('groups').length == 0) {
                this.renderPrivate();
            } else {}
            
            if (this.model.has('owner')) {
                this.model.getOwner(function(owner) {
                    if (owner) {
                        var $a = $('<a href="#"></a>');
                        $a.append(owner.getNewAvatarNameView().render().$el);
                        self.$menu.find('.owner').html('').append($a);
                    }
                });
            }

            if (window.account && (account.isAdmin() || account.isOwner(this.model.get('owner').id))) {} else {
                self.$menu.find('.owner').siblings().hide();
            }
            
            //this.$el.html('');
            this.$el.append(this.$btn);
            this.$el.append(this.$menu);
            this.setElement(this.$el);
            return this;
        },
        renderPublic: function() {
            this.$menu.find('.public').hide();
            this.$menu.find('.private').show();
            this.$btn.find('.privacyIcon.glyphicon').removeClass('glyphicon-lock');
            this.$btn.find('.privacyIcon.glyphicon').addClass('glyphicon-globe');
        },
        renderPrivate: function() {
            this.$menu.find('.public').show();
            this.$menu.find('.private').hide();
            this.$btn.find('.privacyIcon.glyphicon').addClass('glyphicon-lock');
            this.$btn.find('.privacyIcon.glyphicon').removeClass('glyphicon-globe');
        },
        events: {
            "click .private": "clickPrivate",
            "click .public": "clickPublic",
        },
        clickPrivate: function(e) {
            this.renderPrivate();
            this.model.set({
                "groups": []
            }, {
                silent: true
            });
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                //self.render();
            });
            $(e.currentTarget).dropdown('toggle');
            e.stopPropagation();
            e.preventDefault();
        },
        clickPublic: function(e) {
            this.renderPublic();
            this.model.set({
                "groups": ['public']
            }, {
                silent: true
            });
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                //self.render();
            });
            $(e.currentTarget).dropdown('toggle');
            e.stopPropagation();
            e.preventDefault();
        },
    });

    var Actions = Backbone.View.extend({
        tagName: "span",
        className: "actions",
        initialize: function(options) {
            this.actions = [];
            this.options = options;
            //this.groups = new Groups({id: this.id, model: this.model});
            //this.tags = new Tags({id: this.id, model: this.model});
            //this.actionEdit = new ActionEdit({id: this.id, model: this.model});
            //this.actionProc = new ActionProcess(opts);
            //this.actionFeed = new ActionFeedView(opts);
            //this.actionDelete = new ActionDelete(opts);
            this.privacyView = new PrivacyBtnMenu({model: this.model, btnClass: 'btn-xs'});

            this.$btnGroup = $('<div class="btn-group"></div>');
            this.$btn = $('<button type="button" class="btn btn-default btn-xs details">Details</button>');
            this.$btnCaret = $('<button type="button" class="btn btn-default dropdown-toggle btn-xs" data-toggle="dropdown"><span class="caret"></span></button>');
            this.$btnDropdown = $('<ul class="dropdown-menu" role="menu">\
                <li role="presentation" class="dropdown-header">URL Details</li>\
                <li><a href="#" class="share">Share</a></li>\
                <li><a href="#" class="crawl">Crawl</a></li>\
                <li class="divider"></li>\
                <li><a href="#" class="delete"><span class="glyphicon glyphicon-trash"></span> Delete</a></li>\
              </ul>');
            this.$btnGroup.append(this.$btn);
            this.$btnGroup.append(this.$btnCaret);
            this.$btnGroup.append(this.$btnDropdown);
        },
        render: function() {
            var self = this;
            var title = this.model.getAt().format('lll')+'<br>';
            if(this.model.get('file') && this.model.get('file').contentType) {
                title += this.model.get('file').contentType;
            }
            this.$btnDropdown.find('.dropdown-header').html(title);

            this.$el.append(this.$btnGroup);
            this.$el.append(this.privacyView.render().$el);
            //this.$el.html('');
            //self.$el.append(this.tags.render().$el);
            //self.$el.append(this.groups.render().$el);
            //self.$el.append(this.actionEdit.render().$el);
            //self.$el.append(this.actionProc.render().$el);
            //self.$el.append(this.actionFeed.render().$el);
            //self.$el.append(this.actionDelete.render().$el);
            this.setElement(this.$el);
            return this;
        },
        
        events: {
            "click .btn": "clickDropdown",
            "click .details": "clickDetails",
            "click .share": "clickShare",
            "click .crawl": "clickCrawl",
            "click .delete": "clickDelete",
        },
        clickDropdown: function(e) {
            // allows us to capture the remaining avatar/row clicks
            e.stopPropagation();
            $(e.currentTarget).dropdown('toggle');
        },
        clickDetails: function(e) {
            console.log(this.model.get('url'))
            console.log(this.options)
            this.options.list.trigger('detail', this.model);
            stopAndToggleDropdown(e);
            return false;
        },
        clickShare: function(e) {
            console.log(this.model.get('url'))
            console.log(this.options)
            this.options.list.trigger('share', this.model);
            return false;
        },
        clickCrawl: function(e) {
            return false;
        },
        clickDelete: function(e) {
            if (confirm("Are you sure that you want to delete this URL?")) {
                this.model.destroy({
                    success: function(model, response) {
                        //console.log('delete');
                        //window.history.back(-1);
                    },
                    errorr: function(model, response) {
                        console.log(arguments);
                    },
                    wait: true
                });
            }
            stopAndToggleDropdown(e);
        },
    });
    
    var stopAndToggleDropdown = function(e) {
        $(e.currentTarget).dropdown('toggle');
        e.stopPropagation();
        e.preventDefault();
    }

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
            $light.on("close", function() {});
            return false;
        }
    });
    var ActionProcess = Backbone.View.extend({
        tagName: "span",
        className: "proc",
        render: function() {
            if (this.model.get('proc')) {
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

            if (!this.model.has('proc') || confirm("Are you sure that you want to process this?")) {
                if (!this.model.get('proc')) {
                    this.model.set({
                        proc: 1
                    }, {
                        silent: false
                    });
                }
                this.model.set({
                    proc: 0
                }, {
                    silent: true
                });
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

            if (confirm("Are you sure that you want to delete this?")) {
                this.model.destroy({
                    success: function(model, response) {
                        //console.log('delete');
                        window.history.back(-1);
                    },
                    errorr: function(model, response) {
                        console.log(arguments);
                    },
                    wait: true
                });
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
            if (tags) {
                for (var i in tags) {
                    var tagName = tags[i];
                    if (!_.isString(tagName)) {
                        var $btn = $('<button class="tag">' + tagName + '</button>');
                        $btn.attr('data-tag', JSON.stringify(tagName));
                        this.$el.append($btn);
                    } else {
                        this.$el.append('<button class="tag">' + tagName + '</button>');
                    }
                }
            }
            this.$el.append('<button class="newTag">+ tag</button>');
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {},
        events: {
            "click .newTag": "newTag",
            "click .tag": "removeTag"
        },
        removeTag: function(e) {
            var self = this;
            if (confirm("Are you sure that you want to remove this tag?")) {
                var tags = this.model.get("tags");
                var $tag = $(e.target);
                var tagName = '';
                if ($tag.attr('data-tag')) {
                    tagName = JSON.parse($tag.attr('data-tag'));
                } else {
                    tagName = e.target.innerHTML;
                }
                this.model.pull({
                    "tags": tagName
                }, {
                    silent: true
                });
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
            if (tagName) {
                tagName = tagName.split(',');
                for (var i in tagName) {
                    var tag = tagName[i];
                    tagName[i] = tag.trim(); // trim extra white space
                }
                if (tagName) {
                    if (!this.model.has("tags")) {
                        this.model.set({
                            'tags': tagName
                        }, {
                            silent: true
                        });
                        var saveModel = this.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        saveModel.done(function() {
                            console.log('tags saved');
                        });
                    } else {
                        this.model.pushAll({
                            "tags": tagName
                        }, {
                            silent: true
                        });
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
        initialize: function() {},
        render: function() {
            this.$el.html('');
            var groups = this.model.get("groups");
            if (groups) {
                for (var i in groups) {
                    var groupName = groups[i];
                    this.$el.append('<button class="group">' + groupName + '</button>');
                }
                if (groups.indexOf('public') === -1) {
                    this.$el.append('<button class="publicGroup">+ public</button>');
                }
                if (groups && groups.length > 0) {
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
            if (confirm("Are you sure that you want to make this private?")) {
                this.model.set({
                    "groups": []
                }, {
                    silent: true
                });
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
            if (confirm("Are you sure that you want to make this public?")) {
                this.model.push({
                    "groups": "public"
                }, {
                    silent: true
                });
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
            if (confirm("Are you sure that you want to remove this group?")) {
                var groups = this.model.get("groups");
                var name = e.target.innerHTML;
                this.model.pull({
                    "groups": name
                }, {
                    silent: true
                });
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

            for (var i in groupName) {
                var g = groupName[i];
                groupName[i] = g.trim(); // trim extra white space
            }
            if (groupName) {
                if (!this.model.get("groups")) {
                    this.model.set({
                        'groups': groupName
                    }, {
                        silent: true
                    });
                } else {
                    this.model.pushAll({
                        "groups": groupName
                    }, {
                        silent: true
                    });
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
            if (!this.model.has('feed')) {
                this.$el.html('<button class="publish">publish to feed</button>');
            } else {
                var feed = this.model.get('feed');
                this.$el.html('published at <a href="/feed/item/' + feed.id + '" target="_new">' + feed.at + '</a><button class="unpublish">remove from feed</button>');
            }
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {},
        events: {
            "click .publish": "publish",
            "click .unpublish": "unpublish",
        },
        publish: function() {
            var self = this;
            console.log(this.model);
            this.model.set({
                "feed": 0
            }, {
                silent: true
            });
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
            this.model.unset("feed", {
                silent: true
            });
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

    var TableRowView = Backbone.View.extend({
        tagName: "tr",
        className: "row",
        initialize: function(options) {
            if (options.list) {
                this.list = options.list;
            }
            this.$tdFav = $('<td class="faviconfile"><img class="favicon" /></td>');
            this.$tdUrl = $('<td class="url"><a href="#" target="_new"></a><span class="title"></span></td>');
            this.$tdActions = $('<td class="actions"></td>');
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.actions = new Actions({
                model: this.model,
                list: this.list
            });
        },
        render: function() {
            var self = this;
            this.$el.append(this.$tdFav);
            this.$el.append(this.$tdUrl);
            this.$tdActions.append(this.actions.render().$el);
            this.$el.append(this.$tdActions);
            if (this.model.has('url')) {
                this.$tdUrl.find('a').html(this.model.get('url')).attr('href', this.model.get('url'));
            }
            if (this.model.has('title')) {
                this.$tdUrl.find('.title').html(this.model.get('title'));
            } else {}

            if (this.model.has('faviconfile') && this.model.get('faviconfile').contentType.indexOf('image') === 0) {
                var imgSrc = '/api/files/' + this.model.get('faviconfile').filename;
                if(imgSrc !== this.$tdFav.find('img').attr('src')) {
                    this.$tdFav.find('img').attr('src', imgSrc);
                }
                //self.$el.append($fav);
            } else if (this.model.has('file')) {
                var contentTypeKlass = this.model.get('file').contentType.replace(/\//gi, '-');
                //this.$el.find('.url').after('<span title="'+this.model.get('file').contentType+'" class="contentType '+contentTypeKlass+'">'+this.model.get('file').contentType+'</span>');
                var imgSrc = '/files/icon/' + contentTypeKlass + '.png';
                if(imgSrc !== this.$tdFav.find('img').attr('src')) {
                    this.$tdFav.find('img').attr('src', imgSrc).attr('title', this.model.get('file').contentType);
                }
            }

            if (this.model.has('ogImage')) {
                if (!this.hasOwnProperty('ogImageView')) {
                    self.ogImageView = self.model.getOgImage().getAvatar();
                }
                var popOpts = {
                    "trigger": "hover",
                    "content": self.ogImageView.render().$el,
                    "html": true,
                    "placement": "bottom"
                }
                this.$tdUrl.find('a').popover(popOpts);
            } else if (this.model.has('image')) {
                if (!this.hasOwnProperty('imageView')) {
                    self.imageView = self.model.getImage().getAvatar();
                }
                var popOpts = {
                    "trigger": "hover",
                    "content": self.imageView.render().$el,
                    "html": true,
                    "placement": "bottom"
                }
                this.$tdUrl.find('a').popover(popOpts);
            } else if (this.model.has('faviconfile')) {
                var popOpts = {
                    "trigger": "hover",
                    "content": '<img src="/api/files/'+this.model.get('faviconfile').filename+'">',
                    "html": true,
                    "placement": "bottom"
                }
                this.$tdUrl.find('a').popover(popOpts);
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
            if (this.options.list) {
                this.options.list.trigger('selected', this);
            }
        },
        remove: function() {
            this.$el.remove();
        }
    });

    var RowView = Backbone.View.extend({
        tagName: "li",
        className: "row",
        initialize: function(options) {
            if (options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.actions = new Actions({
                id: this.id,
                model: this.model
            });
        },
        render: function() {
            var self = this;
            this.$el.html('<span class="faviconfile"><img class="favicon" /></span><span class="url"><a href="' + this.model.get('url') + '" target="_new">' + this.model.get('url') + '</a></span><span class="details"><button class="handle">▼</button></span>');
            this.$el.find('.details').append(this.actions.render().$el);
            if (this.model.has('title')) {
                this.$el.find('.url').after('<span class="title">' + this.model.get('title') + '</span>');
            } else {}
            if (this.model.has('file')) {
                var contentTypeKlass = 'mime-' + this.model.get('file').contentType.replace(/\//gi, '-');
                this.$el.find('.url').after('<span title="' + this.model.get('file').contentType + '" class="contentType ' + contentTypeKlass + '">' + this.model.get('file').contentType + '</span>');
            }

            if (this.model.has('faviconfile')) {
                var $fav = $('');
                self.$el.find('.faviconfile img').attr('src', '/api/files/' + this.model.get('faviconfile').filename);
                self.$el.append($fav);
            }

            if (this.model.has('image')) {
                if (!this.hasOwnProperty('imageView')) {
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
            if (this.options.list) {
                this.options.list.trigger('selected', this);
            }
        },
        remove: function() {
            $(this.el).remove();
        }
    });

    var ShareView = Backbone.View.extend({
        tagName: "div",
        className: "shareView",
        initialize: function(options) {
            var self = this;
            this.options.iframe = options.hasOwnProperty('iframe') ? options.iframe : true;
            
            this.privacyView = new PrivacyBtnMenu({model: this.model, className: 'btn-group input-group-addon'});
        },
        render: function() {
            var self = this;
            var placeHolder = '';
            var views = this.model.get('views') || 1;
            var commentCount = this.model.get('commentCount') || '';
            var head = '<header class="navbar navbar-inverse navbar-fixed-top" role="banner">\
            <div class="">\
                <div class="navbar-header">\
                  <form class="social navbar-form navbar-left" role="share">\
                    <a target="_new" href="' + this.getMailto() + '" class="connectEmail zocial email icon" title="Share via Email">Email</a>\
                    <a target="_new" href="' + this.getTwitterShareA() + '" class="connectTwitter zocial twitter icon" title="Share to Twitter">Twitter</a>\
                    <a target="_new" href="' + this.getFacebookShareA() + '" class="connectFacebook zocial facebook icon" title="Share to Facebook">Facebook</a>\
                    <a target="_new" href="' + this.getGoogleShareA() + '" class="connectGoogle zocial googleplus icon" title="Share to Google">Google</a>\
                    <button class="btn btn-link views" title="Views"><span class="glyphicon glyphicon-fire"></span> ' + views + '<span class="hidden-xs"> Views</span></button>\
                    <button class="btn btn-link comments" title="Comments"><span class="glyphicon glyphicon-comment"></span> ' + commentCount + '<span class="hidden-xs"> Comments</span></button>\
                    <button class="navbar-toggle" type="button" data-toggle="collapse" data-target=".share-navbar-collapse">\
                      <span class="sr-only">Toggle navigation</span>\
                      <span class="icon-bar"></span>\
                      <span class="icon-bar"></span>\
                      <span class="icon-bar"></span>\
                    </button>\
                  </form>\
                </div>\
                <nav class="collapse navbar-collapse share-navbar-collapse" role="navigation">\
                    <form class="navbar-form navbar-left">\
                        <button type="button" class="homeBtn btn btn-link navbar-left"><span class="glyphicon glyphicon-home"></span></button>\
                    </form>\
                    <div class="sharer"><form class="navbar-form navbar-left" role="share">\
                        <div class="form-group">\
                            <div class="input-group" title="Internet URL. Copy and share.">\
                                <input type="text" class="form-control shareUrl" placeholder="http://" value="' + this.getShareUrl() + '">\
                            </div>\
                        </div>\
                        <label title="Copy and Paste the URL or share via email and social">Share</label>\
                    </form></div>\
                    <ul class="nav navbar-nav navbar-right" id="shareNav">\
                        <li class="backBtn"><a target="_new" href="//' + window.location.host + '/"><span class="badge">Visit ' + window.location.host + '</span></a></li>\
                        <li class="closeBtn"><a target="_new" href="#"><span class="badge">x</span></a></li>\
                    </ul>\
                </nav>\
              </div>\
        </header>';
            var iframe = '';
            if (this.model.has('image')) {
                if (!this.hasOwnProperty('imageView')) {
                    self.imageView = new ImagesBackbone.Model(self.model.get('image')).getAvatar({size: 'full'});
                }
                /*var popOpts = {
                    "trigger": "hover",
                    "content": self.imageView.render().$el,
                    "html": true,
                    "placement": "bottom"
                }
                this.$tdUrl.find('a').popover(popOpts);*/
                placeHolder = self.imageView.render().$el;
            }

            var matches = this.model.get('url').match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
            if (matches && matches.length > 1) {
                var youtubeId = matches[5];
                var height = '100%';
                if (!this.options.iframe) {}

                if (youtubeId) {
                    iframe = '<iframe style="width:100%; height:' + height + '; margin:0; padding:0; border: 0px;" src="//www.youtube.com/embed/' + youtubeId + '?rel=0" frameborder="0" allowfullscreen></iframe>';
                }
                //this.$el.find('.youtube').fitVids();
            } else if (this.model.get('url').indexOf('twitter.com') !== -1) {
                if (this.model.has('image')) {
                    iframe = '<img src="/api/files/' + this.model.get('image').filename + '">';
                } else if (this.model.has('image')) {
                    iframe = '<img src="/api/files/' + this.model.get('image').filename + '">';
                }
            } else {
                // check if this url is known to have a header X-Frame-Options: SAMEORIGIN
                if(this.model.has('file') && this.model.get('file') && this.model.get('file').metadata && this.model.get('file').metadata.responseHeaders && this.model.get('file').metadata.responseHeaders.hasOwnProperty('X-Frame-Options') && (this.model.get('file').metadata.responseHeaders['X-Frame-Options'].toLocaleLowerCase() === 'SAMEORIGIN'.toLocaleLowerCase() || this.model.get('file').metadata.responseHeaders['X-Frame-Options'].toLocaleLowerCase() === 'deny')) {
                    iframe = placeHolder[0].innerHTML;
                } else {
                    iframe = '<iframe id="frame" class="frame" style="width:100%; height:100%; margin:0; padding:0; border: 0px;" src="' + this.model.get('url') + '"> </iframe>';
                }
            }
            var isJsCacher = function() {
                return (!navigator || (navigator.userAgent && navigator.userAgent.indexOf('HouseJs HTML Cacher') !== -1));
            }
            ///desktop/jquery.fitvids.js
            if (this.options.iframe && !isJsCacher()) {
                this.$el.html(head + iframe);
            } else {
                this.$el.html(head);
            }
            this.$el.find('.sharer .input-group').prepend(this.privacyView.render().$el);
            this.setElement(this.$el);
            return this;
        },
        show: function() {
            this.$el.show();
        },
        events: {
            "click button.homeBtn": "clickBack",
            "click li.closeBtn a": "clickClose",
            "click li.backBtn a": "clickHome",
            "click span.share": "clickShare",
            "click input.shareUrl": "clickShareUrl",
            "change input.shareUrl": "changeShareUrl",
            "keyup input.shareUrl": "changeShareUrl",
            // "click button.email": "shareEmail",
            // "click button.twitter": "shareTwitter",
            // "click button.facebook": "shareFacebook",
            // "click button.google": "shareGoogle",
            "click button.comments": "viewComments",
            "click button.views": "viewViews",
        },
        clickHome: function(e) {
            this.trigger('home');
            e.preventDefault();
        },
        clickClose: function(e) {
            this.trigger('close');
            e.preventDefault();
        },
        clickBack: function(e) {
            this.trigger('back');
            //window.location = window.location.protocol + '//' + window.location.host;
            e.preventDefault();
        },
        clickShare: function(e) {
            this.$el.find('input.shareUrl').select();
            e.preventDefault();
        },
        clickShareUrl: function(e) {
            $(e.target).select();
        },
        getShareUrl: function() { // makes sure its NOT https for the iframe to work
            var path = $('base[href]').attr('href')+this.model.getSharePath();
            var host = window.location.host || window.location.hostname;
            return 'http://'+host+path;
            // '/urls/share/'
            //return 'http://' + window.location.href.substr(window.location.href.indexOf('://') + 3);
        },
        changeShareUrl: function(e) {
            if (this.getShareUrl() !== $(e.target).val()) {
                $(e.target).val(this.getShareUrl());
            }
            this.clickShareUrl(e);
            return false;
        },
        getTwitterShareA: function() {
            var subject = 'Check this out: ';

            if (this.model.has('title')) {
                subject = this.model.get('title') + ' ';
            }
            var encodedUrl = encodeURIComponent(this.getShareUrl());
            return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(subject) + '&url=' + encodedUrl;
        },
        getFacebookShareA: function() {
            var encodedUrl = encodeURIComponent(this.getShareUrl());
            return 'http://www.facebook.com/share.php?u=' + encodedUrl;
        },
        getGoogleShareA: function() {
            var encodedUrl = encodeURIComponent(this.getShareUrl());
            return 'https://plus.google.com/share?url=' + encodedUrl;
        },
        getMailto: function() {
            var subject = 'Check this out..';
            if (this.model.has('title')) {
                subject = this.model.get('title');
            }
            var body = encodeURIComponent('Check this out: \n\n' + this.getShareUrl() + '\n');
            return 'mailto:?subject=' + subject + '&body=' + body;
        },
        shareEmail: function(e) {
            window.location = this.getMailto();
            return false;
        },
        shareTwitter: function(e) {
            window.location = this.getTwitterShareA();
            return false;
        },
        shareFacebook: function(e) {
            var encodedUrl = encodeURIComponent(this.getShareUrl());
            window.location = 'http://www.facebook.com/share.php?u=' + encodedUrl;
            return false;
        },
        shareGoogle: function(e) {
            var encodedUrl = encodeURIComponent(this.getShareUrl());
            window.location = 'https://plus.google.com/share?url=' + encodedUrl;
            return false;
        },
        viewComments: function(e) {
            this.trigger('details');
            e.preventDefault();
        },
        viewViews: function(e) {
            this.trigger('details');
            e.preventDefault();
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
            if (options.list) {
                this.list = options.list;
            }
            this.model.bind('destroy', this.remove, this);

            this.$title = $('<h1 class="title"><a href="#" target="_new"></a></h1>');
            //this.$actions = $('<div class="actions"></div>');
            //this.actions = new Actions({model: this.model, list: this.list});
            this.commentCollection = this.model.getCommentCollection();
            this.$commentContainer = $('<div class="comments container"></div>');
            this.commentForm = this.commentCollection.getForm();
            this.commentForm.on('saved', function() {
                self.commentForm.reset();
                self.commentForm.hide();
            });
            this.commentList = this.commentCollection.getView();
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$title.find('a').html(this.model.get('url')).attr('href', this.model.get('url'));
            if (this.model.get('title')) {
                this.$title.find('a').html(this.model.get('title'));
            }
            if (this.model.has('faviconfile')) {
                //this.$el.find('img').attr('src', );
                //self.$el.append($fav);
                if(this.$title.find('img').length > 0) {
                    this.$title.find('img').attr('src', '/api/files/' + this.model.get('faviconfile').filename);
                } else {
                    this.$title.prepend('<img src="/api/files/' + this.model.get('faviconfile').filename + '">');
                }
            } else if (this.model.has('file')) {
                var contentTypeKlass = this.model.get('file').contentType.replace(/\//gi, '-');
                //this.$el.find('.url').after('<span title="'+this.model.get('file').contentType+'" class="contentType '+contentTypeKlass+'">'+this.model.get('file').contentType+'</span>');
                this.$title.prepend('<img src="/files/icon/' + contentTypeKlass + '.png" title="' + this.model.get('file').contentType + '" >');
            }

            this.$el.append(this.$title);

            if (this.model.has('image')) {
                if (!this.hasOwnProperty('imageView')) {
                    self.imageView = new ImagesBackbone.Model(self.model.get('image')).getAvatar({
                        size: 'square'
                    });
                }
                self.$el.append(self.imageView.render().$el);
            } else if (this.model.has('ogImage')) {
                //console.log(self.model.get('ogImage'))
                //self.$el.append('<img src="/api/files/'+self.model.get('ogImage').filename+'">');
                if (!this.hasOwnProperty('ogImageView')) {
                    self.ogImageView = new ImagesBackbone.Model(self.model.get('ogImage')).getAvatar({
                        size: 'square'
                    });
                }
                self.$el.append(self.ogImageView.render().$el);
            }
            
            this.$el.append(this.$commentContainer);
            this.$commentContainer.append(this.commentForm.render().$el);
            this.$commentContainer.append(this.commentList.render().$el);
            this.commentCollection.load();

            //this.$el.append(this.$actions);
            //this.$actions.append(this.actions.render().el);
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
        events: {},
        remove: function() {
            this.$el.remove();
        }
    });

    var AvatarView = Backbone.View.extend({
        tagName: "span",
        className: "avatar",
        initialize: function(options) {
            if (options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        render: function() {
            var self = this;
            this.$el.html('');

            if (this.model.has('ogImage')) {
                console.log(self.model.get('ogImage'))
                //self.$el.append('<img src="/api/files/'+self.model.get('ogImage').filename+'">');
                if (!this.hasOwnProperty('ogImageView')) {
                    self.ogImageView = new ImagesBackbone.Model(self.model.get('ogImage')).getAvatar();
                }
                self.$el.append(self.ogImageView.render().$el);
            } else if (this.model.has('image')) {
                if (!this.hasOwnProperty('imageView')) {
                    self.imageView = new ImagesBackbone.Model(self.model.get('image')).getAvatar();
                }
                self.$el.append(self.imageView.render().$el);
            }

            var matches = this.model.get('url').match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
            if (matches && matches.length > 1) {
                var youtubeId = matches[5];
                if (youtubeId) {}
                //this.$el.find('.youtube').fitVids();
            } else if (this.model.get('url').indexOf('twitter.com') !== -1) {} else {}

            this.$el.append('<a href="' + this.model.get('url') + '" target="_new"><img class="faviconfile" src=""><span class="url">' + this.model.get('url') + '</span></a>');
            if (this.model.has('title')) {
                this.$el.prepend('<a href="' + this.model.get('url') + '" target="_new" class="title">' + this.model.get('title') + '</a>');
            }

            if (this.model.has('faviconfile')) {
                this.$el.find('.faviconfile').attr('src', '/api/files/' + this.model.get('faviconfile').filename);
                //self.$el.append($fav);
            } else if (this.model.has('file')) {
                var contentTypeKlass = this.model.get('file').contentType.replace(/\//gi, '-');
                //this.$el.find('.url').after('<span title="'+this.model.get('file').contentType+'" class="contentType '+contentTypeKlass+'">'+this.model.get('file').contentType+'</span>');
                this.$el.find('.faviconfile').attr('src', '/files/icon/' + contentTypeKlass + '.png').attr('title', this.model.get('file').contentType);
            }

            this.setElement(this.$el);
            return this;
        },
        events: {
            "click": "clickAvatar"
        },
        clickAvatar: function(e) {

            this.trigger('selected');
            if (this.list) {
                this.list.trigger('selected', this);
            }

            //e.preventDefault();
        },
        remove: function() {
            this.$el.remove();
        }
    });

    var UrlCommentView = Backbone.View.extend({
        tagName: "div",
        className: "urlComment col-md-6",
        initialize: function(options) {
            if (options.list) {
                this.list = options.list;
            }
            this.$user = $('<div class="user"></div>');
            this.$at = $('<div class="at"></div>');
            this.$msg = $('<div class="msg popover right"><div class="arrow"></div><div class="popover-content"></div></div>');
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        render: function() {
            var self = this;
            this.$el.html('');
            
            this.$msg.find('.popover-content').html(this.model.get('msg'));
            
            if (this.model.has('user')) {
                this.model.getUser(function(userModel) {
                    if (userModel) {
                        self.$user.append(userModel.getNewAvatarNameView().render().$el);
                    }
                });
                
                this.$at.html(this.model.get('user').name+' said '+this.model.getAt().calendar());
            } else {
                this.$at.html('commented '+this.model.getAt());
            }
            
            this.$el.append(this.$user);
            this.$el.append(this.$at);
            this.$el.append(this.$msg);
            
            if(window.account && (account.isAdmin() || account.isOwner(this.model.get('user').id))) {
                this.$el.append($('<button class="delete btn btn-link glyphicon glyphicon-trash"> </button>'));
            }
            
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click": "clickEl",
            "click .delete": "clickDelete"
        },
        clickEl: function(e) {

            this.trigger('selected');
            if (this.list) {
                this.list.trigger('selected', this);
            }
            //e.preventDefault();
        },
        clickDelete: function(e) {
            var self = this;
            if(confirm("Are you sure that you want to delete your comment?")) {
                this.model.destroy({success: function(model, response) {
                  //window.history.back(-1);
                }, 
                errorr: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            }
            e.preventDefault();
        },
        remove: function() {
            this.$el.remove();
        }
    });

    var UrlCommentForm = Backbone.View.extend({
        tagName: "div",
        className: "urlCommentForm",
        initialize: function() {
            var self = this;
        },
        render: function() {
            var urlTitle = this.options.urlModel.get('title') || this.options.urlModel.get('url');
            var placeholder = 'Comment on ' + urlTitle;
            this.$el.html('<h4>Post a comment</h4><form id="urlCommentForm" class="form"><div class="form-group"><textarea class="form-control" name="msg" placeholder="'+placeholder+'"></textarea></span><input class="btn btn-primary btn-block" type="submit" value="Submit" /></form>');
            // if (menu.user) {
            //     var $reviewAsUser = menu.user.getAvatarNameView().render().$el.clone();
            //     this.$el.find('h4').after($reviewAsUser);
            // }
            this.setElement(this.$el);
            return this;
        },
        events: {
            "submit form": "submit",
        },
        submit: function() {
            var self = this;
            var msg = this.$el.find('[name="msg"]').val();
            console.log(msg);
            var newComment = {};
            if (msg && msg !== "") {
                newComment.msg = msg;
            }
            console.log(newComment);
            if (newComment != {}) {
                var m = new this.collection.model({}, {collection: this.collection});
                m.set(newComment);
                
                self.renderLoading(true);
                
                var s = m.save(null, {
                    silent: true,
                    wait: true
                });
                s.done(function() {
                    self.trigger("saved", m);
                    self.collection.add(m);
                });
            }
            return false;
        },
        renderLoading: function(isLoading) {
            if(isLoading) {
                this.$el.find('[name="msg"]').button('loading');
                this.$el.find('input[type="submit"]').button('loading');
            } else {
                this.$el.find('[name="msg"]').button('reset');
                this.$el.find('input[type="submit"]').button('reset');
            }
        },
        focus: function() {},
        reset: function() {
            this.renderLoading(false);
            this.$el.find('[name="msg"]').val('');
        },
        hide: function() {
            this.$el.hide();
        },
        remove: function() {
            this.$el.remove();
        }
    });

    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "form",
        initialize: function() {
            var self = this;
            self.initialized = true;
            if (this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
            } else {

            }
            this.$inputUrl = $('<input type="url" name="url" placeholder="http://example.com" />');
            this.$public = $('<input type="checkbox" name="group" value="public" id="public_url_check" />');
        },
        render: function() {
            var self = this;
            this.$el.html('<h4>URL</h4><form class="urlForm"><input type="submit" value="Save" /></form>');
            this.$el.find('form').prepend(this.$public);
            this.$el.find('form').prepend('<label for="public_url_check">Make public</label>');
            this.$el.find('form').prepend(this.$inputUrl);
            if (this.model) {
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
            if (!this.model) {
                this.model = new Model({}, {
                    collection: this.collection
                });
            } else {}
            var url = this.$inputUrl.val();
            if (!url) {
                alert('URL required!');
                self.$el.find('input').removeAttr('disabled');
                return false;
            }
            setDoc.url = url;

            if (this.$public.is(':checked')) {
                setDoc.groups = ['public'];
            }

            this.model.set(setDoc, {
                silent: true
            });
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            if (saveModel) {
                saveModel.done(function() {
                    self.$el.find('input').removeAttr('disabled');
                    self.trigger("saved", self.model);
                    if (!self.collection.get(self.model.id)) {
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

    if (define) {
        define(function() {
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