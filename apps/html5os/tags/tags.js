(function() {
    var stopAndToggleDropdown = function(e) {
        $(e.currentTarget).dropdown('toggle');
        e.stopPropagation();
        e.preventDefault();
    }

    var Model = Backbone.Model.extend({
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
        getAvatarView: function(options) {
            if (!options) options = {};
            if (!this.hasOwnProperty("viewAvatar")) {
                options.model = this;
                this.viewAvatar = this.getNewAvatarView(options);
            }
            return this.viewAvatar;
        },
        getNewAvatarView: function(options) {
            if (!options) options = {};
            options.model = this;
            return new AvatarView(options);
        },
        getRowView: function(options) {
            if (!options) options = {};
            if (!this.hasOwnProperty("viewRow")) {
                options.model = this;
                this.viewRow = this.getNewRowView(options);
            }
            return this.viewRow;
        },
        getNewRowView: function(options) {
            if (!options) options = {};
            options.model = this;
            return new RowView(options);
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
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        initialize: function(models, options) {
            var self = this;
            this.pageSize = 1000;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        url: "/api/tags",
        getView: function(options) {
            var self = this;
            if (!this.hasOwnProperty("view")) {
                if (!options) options = {};
                options.collection = this;
                this.view = new ListView(options);
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
                this.formView = new FormView(options);
            }
            return this.formView;
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
        sortField: 'name',
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
                options.sort = this.sortField; //"name";
            }
            // this.applyFilters(options);
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
                    name: term,
                    sort: this.sortField,
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
        getOrFetchName: function(name, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({name:name}));
            if(doc) {
                callback(doc);
            } else {
                var options = { "name": name };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = _.first(self.where({name:name}));
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
    });
    
    var CollectionOf = Collection.extend({
        initialize: function(models, options) {
            var self = this;
            // console.log(models)
            // console.log(options)
            // console.log(options)
            if (!options) {
                options = models;
            }
            if(options.of) {
                models = options.of.get('tags') || [];
            }
            // console.log(models)
            this.options = options;
        },
        url: function() {
            return this.options.of.url() + "/tags";
        },
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

    var ListView = Backbone.View.extend({
        initialize: function(options) {
            var self = this;
            this.$ul = $('<div class="tagsList"></div>');
            //this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> urls</div>');
            var layout = options.layout || 'row';
            this.initLayout(layout);
            
            if (!this.collection) {
                this.collection = new Collection();
            }
            this.pageSize = this.collection.pageSize;
            this.collection.bind("add", function(doc) {
                var view = self.getDocLayoutView(doc);
                self.appendRow(view);
                doc.on('remove', function() {
                    view.$el.remove();
                    return false;
                });
            });

            this.collection.on('reset', function() {
                self.render();
            });
            this.collection.on('count', function() {
                // self.renderPagination();
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
                // console.log(this.layout)
                if (this.layout == 'table') {
                    this.$wrap = $('<table class="tagsList table table-striped table-hover"></table>');
                    this.$ul = $('<tbody></tbody>');
                    this.$wrap.append(this.$ul);
                } else if (this.layout == 'avatar') {
                    this.$wrap = this.$ul = $('<div class="tagsList"></div>');
                } else if (this.layout == 'row' || this.layout == 'list') {
                    this.$wrap = this.$ul = $('<ul class="tagsList"></ul>');
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
                        self.getDocLayoutView(model).$el.show();
                        return true;
                    }
                    self.getDocLayoutView(model).$el.hide();
                    return false;
                });
                self.renderPage(1);
            } else {
                self.currentFilter = false;
                delete self.searchResults;
                self.renderPage(1);
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
            if (this.layout === 'row' || this.layout === 'list') {
                view = doc.getRowView(viewOpts);
            } else if (this.layout === 'table') {
                view = doc.getTableRowView(viewOpts);
            } else if (this.layout === 'avatar') {
                view = doc.getAvatarView(viewOpts);
            }
            return view;
        },
        renderPage: function(pageNum) {
            var self = this;
            this.$ul.html('');
            var col = this.searchResults ? this.searchResults : this.collection;
            col.forEach(function(doc, i, c) {
                //console.log(arguments)
                var view = self.getDocLayoutView(doc);
                self.appendRow(view);
                doc.on('remove', function() {
                    view.$el.remove();
                    return false;
                });
            });
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
            this.setElement(this.$el);
            return this;
        },
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
                this.$el.find('.faviconfile').attr('src', '/api/files/' + encodeURIComponent(this.model.get('faviconfile').filename));
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

    var RowView = Backbone.View.extend({
        tagName: "li",
        className: "tag",
        initialize: function(options) {
            if (options.list) {
                this.list = options.list;
                // console.log(this.list.collection)
                this.of = false;
                if(this.list.collection.options && this.list.collection.options.of) {
                    this.user = this.list.collection.options.of.get('owner');
                    this.of = this.list.collection.options.of;
                }
            }
            // console.log(this.list.collection.options.of)
            this.$user = $('<span class="user"></span>');
            this.$at = $('<span class="at"></span>');
            this.$name = $('<span class="name"></span>');
            this.$colorInput = $('<input type="color" id="tag-color" name="color" class="form-control" />');
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            
            if(this.of && this.model.id) {
                var origTag = window.tagsCollection.get(this.model.id);
                if(origTag) {
                    origTag.bind('change', this.render, this);
                }
            }
        },
        render: function() {
            // console.log(this.model.attributes);
            var self = this;
            this.$el.html('');
            
            if(this.model.has('color')) {
                this.$el.css('border-left-color', this.model.get('color'));
                this.$colorInput.val(this.model.get('color'));
            }
            if(this.of) {
                var origTag = window.tagsCollection.get(this.model.id);
                if(origTag && origTag.has('color')) {
                    // this.$style.html('.song[data-id="'+this.of.id+'"] { color: '+origTag.get('color')+'}')
                    this.$el.css('border-left-color', origTag.get('color'));
                    this.$colorInput.val(origTag.get('color'));
                }
            }
            // if (this.model.has('user')) {
            //     this.model.getUser(function(userModel) {
            //         if (userModel) {
            //             self.$user.append(userModel.getNewAvatarNameView().render().$el);
            //         }
            //     });
            //     this.$at.html(this.model.get('user').name+' said '+this.model.getAt().calendar());
            // }
            this.$name.attr('data-name', this.model.get('name'));
            this.$name.html(this.model.get('name'));
            if(this.model.has('title')) {
                this.$name.html(this.model.get('title'));
            }
            // this.$el.append(this.$user);
            // this.$el.append(this.$at);
            this.$el.append(this.$name);
            this.$el.append(this.$colorInput);
            
            if(this.of && window.account && ((this.user && account.isOwner(this.user.id)) || (this.model.get('user') && account.isOwner(this.model.get('user').id)))) { // account.isAdmin() || 
                this.$el.append($('<button class="delete btn btn-link glyphicon glyphicon-trash"> </button>'));
            } else if (window.account && this.model.has('user') && account.isOwner(this.model.get('user').id)) {
                this.$el.append($('<button class="deleteTag btn btn-link glyphicon glyphicon-trash"> </button>'));
            } else {
                this.$colorInput.attr('disabled', 'disabled');
            }
            
            this.setElement(this.$el);
            return this;
        },
        setColor: function(colorHex) {
            
        },
        events: {
            "click input[type='color']": "clickColorInput",
            "click": "clickEl",
            "click .delete": "clickDelete",
            "click .deleteTag": "clickDeleteTag",
            "change input[name=\"color\"]": "debounceChangeColor"
        },
        clickColorInput: function(e) {
            console.log('click color input')
            e.stopPropagation();
        },
        clickEl: function(e) {

            this.trigger('selected');
            if (this.list) {
                this.list.trigger('selected', this);
            }
            //e.preventDefault();
        },
        clickDeleteTag: function(e) {
            var self = this;
            if(confirm('Are you sure that you want to permanently delete the tag, "'+this.model.get('name')+'"?')) {
                this.model.destroy({success: function(model, response) {
                  //window.history.back(-1);
                }, 
                errorr: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            }
            e.stopPropagation();
            e.preventDefault();
        },
        clickDelete: function(e) {
            var self = this;
            if(confirm('Are you sure that you want to remove the tag, "'+this.model.get('name')+'"?')) {
                this.model.destroy({success: function(model, response) {
                  //window.history.back(-1);
                }, 
                errorr: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            }
            e.stopPropagation();
            e.preventDefault();
        },
        debounceChangeColor: _.debounce(function(e){
            this.changeColor(e);
        }, 500),
        changeColor: function(e) {
            var self = this;
            var $et = $(e.target);
            var color = $et.val();
            console.log(this.of);
            if(!this.of) {
                this.model.set({"color": color}, {silent: true});
                var s = this.model.save(null, {silent: false, wait: true});
                if(s) {
                    s.done(function(s, typeStr, respStr) {
                        // self.model.trigger('change', self.model);
                    });
                    s.fail(function(s, typeStr, respStr) {
                        if(s.status === 403) {
                            alert('You must sign in to do that!');
                        }
                    });
                }
            } else {
                var origTag = window.tagsCollection.get(this.model.id);
                console.log(origTag);
                if(origTag) {
                    origTag.set({"color": color}, {silent: true});
                    var s = origTag.save(null, {silent: false, wait: true});
                    if(s) {
                        s.done(function(s, typeStr, respStr) {
                            // origTag.trigger('change', self.model);
                        });
                        s.fail(function(s, typeStr, respStr) {
                            if(s.status === 403) {
                                alert('You must sign in to do that!');
                            }
                        });
                    }
                } else {
                    
                }
            }
        },
        remove: function() {
            this.$el.remove();
        }
    });

    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "tagForm",
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
    
    var Dropdown = Backbone.View.extend({
        tagName: 'div',
        className: 'btn-group',
        initialize: function() {
            var self = this;
            this.$btn = $('<button type="button" class="btn btn-link dropdown-toggle" data-toggle="dropdown"></button>');
            this.$dropdownMenu = $('<ul class="dropdown-menu pull-right tags" role="menu"></ul>');
            this.collectionOf = new CollectionOf(this.model.get('tags') || [],{of: this.model});
            this.$liNewTag = $('<li class="newTagForm"></li>');
            this.$currentTagsDiv = $('<li class="divider currentTags"></li>');
            this.$tagSelectList = $('<li class="selectList" title="Select a Tag"></li>');
            if(!window.tagsCollection) {
                window.tagsCollection = new Collection();
            }
            this.tagsOfList = this.collectionOf.getView({el: this.$dropdownMenu, layout: 'row'}); // singleton pointer
            this.tagsFullList = window.tagsCollection.getView({el: this.$tagSelectList}); // singleton pointer
            // console.log(this.model)
            
            this.model.on('change', function(){
                if(self.model.has('tags') && self.model.get('tags').length > 0) {
                    self.renderColors();
                }
                self.listenToTags();
            });
            this.listenToTags();
        },
        listenToTags: function() {
            var self = this;
            if(self.model.has('tags') && self.model.get('tags').length > 0) {
                var modelTags = self.model.get('tags');
                modelTags.forEach(function(e,i,a){
                    var ofTag = self.collectionOf.get(e.id);
                    if(ofTag) {
                        self.stopListening(ofTag, 'destroy');
                        self.listenTo(ofTag, 'destroy', function(){
                            console.log(self.collectionOf.length);
                            // self.collectionOf.remove(e.id);
                            
                            var newTags = self.model.get('tags') || [];
                            for(var i in newTags) {
                                var t = newTags[i];
                                if(t.id == e.id) {
                                    console.log('--------remove the tag');
                                    delete newTags[i];
                                }
                            }
                            self.model.set({"tags": newTags}, {silent: true});
                            
                            
                            self.renderColors();
                        });
                    }
                    var origTag = window.tagsCollection.get(e.id);
                    if(origTag) {
                        self.stopListening(origTag, 'change');
                        self.listenTo(origTag, 'change', self.renderColors);
                    }
                });
            }
        },
        render: function() {
            var self = this;
            // this.$el.find('ul.tags').html('');
            
            // bs btn steals my dropdown click
            this.$el.on('shown.bs.dropdown', function(){
                self.shownDropdown();
            });
            if(this.model.has('tags') && this.model.get('tags').length > 0) {
                this.$el.addClass('hasTags');
                this.$dropdownMenu.append(this.$currentTagsDiv);
            } else {
                this.$el.removeClass('hasTags');
            }
            this.renderColors();
            
            if(account.isOwner(this.model.get('owner').id)) { //  || account.isAdmin()
                this.$dropdownMenu.append(this.$liNewTag.html('<input name="tagName" placeholder="Enter a tag name" class="form-control" />'));
                this.$dropdownMenu.append(this.$tagSelectList);
            } else {
                // this.$el.find('.divider').hide();
            }
            
            this.$el.append(this.$btn.html('<span class="glyphicon glyphicon-tag"></span>  <span class="sr-only">Toggle Dropdown</span>'));
            this.$el.append(this.$dropdownMenu);
            this.setElement(this.$el);
            return this;
        },
        renderColors: function() {
            var self = this;
            // console.log(this.model.get('tags'))
            if(this.model.has('tags') && this.model.get('tags').length > 0) {
                var modelTags = this.model.get('tags');
                var hasColor = false;
                modelTags.forEach(function(e,i,a){
                    var origTag = window.tagsCollection.get(e.id);
                    if(origTag) {
                        if(origTag.has('color')) {
                            self.$btn.css('color', origTag.get('color'));
                            hasColor = true;
                        }
                    }
                });
                if(!hasColor) {
                    self.$btn.css('color', '#000');
                }
            } else {
                self.$btn.css('color', '');
            }
        },
        renderTopTags: function() {
            var self = this;
            this.tagsFullList.filter(function(d) {
                return (!self.collectionOf.get(d.id));
            });
            this.tagsFullList.setElement(this.$tagSelectList).render();
            if(this.tagsFullList.collection.length === 0) {
                this.tagsFullList.collection.load();
            }
            return this;
        },
        renderLoading: function() {
            return this;
        },
        renderClear: function() {
            this.$liNewTag.find("input").val('');
            this.focus();
            return this;
        },
        focus: function() {
            var self = this;
            setTimeout(function(){
                self.$liNewTag.find("input")[0].focus();
            },200);
            return this;
        },
        events: {
            // "click .btn.dropdown-toggle": "clickBtnDropdown",
            "click .tagsOfSong.tagsList li.tag": "goToTag",
            "click .selectList .tagsList li.tag": "selectTag",
            "click input[name='tagName']": "clickInput",
            // "keyup input[name='tagName']": "debouncedKeyUp",
            "keydown input[name='tagName']": "debouncedKeyDown",
            // "submit": "submitForm"
        },
        goToTag: function(e) {
            var $t = $(e.currentTarget);
            var tagName = $t.find('[data-name]').attr('data-name');
            this.trigger('selectedTagName', tagName);
        },
        selectTag: function(e) {
            var self = this;
            var $t = $(e.currentTarget);
            
            // lazy, but getting the .on('selected') event from the singlton would fire on all rows listening... maybe need to detach better
            this.$liNewTag.find("input").val($t.find('.name').text());
            this.submit(function(){
                self.renderColors();
                self.tagsFullList.render(); // hides the selection just made from the full list
            });
            e.stopPropagation();
            e.preventDefault();
        },
        // submitForm: function(e) {
        //     e.preventDefault();
        // },
        debouncedKeyDown: _.debounce(function(e) {
            this.keyDown(e);
        }, 500),
        debouncedKeyUp: _.debounce(function(e) {
            this.keyUp(e);
        }, 500),
        keyDown: function(e) {
            if (e.keyCode == 27) {
                this.$liNewTag.find("input").val('');
            } else if (e.keyCode == 13) {
                this.submit();
            } else {
                
            }
        },
        keyUp: function(e) {
            if (e.keyCode == 27) {
                this.$liNewTag.find("input").val('');
            } else if (e.keyCode == 13) {
                this.submit();
            } else {
                
            }
        },
        submit: function(callback) {
            var self = this;
            if(self.submitting) return;
            self.submitting = true;
            var name = this.$liNewTag.find("input").val().trim();
            var newTag = {};
            if (name && name !== "") {
                newTag.name = name;
            }
            if (newTag != {}) {
                var m = new this.collectionOf.model({}, {collection: this.collectionOf});
                m.set(newTag);
                
                self.renderLoading(true);
                
                var s = m.save(null, {
                    silent: true,
                    wait: true
                });
                s.done(function() {
                    delete self.submitting;
                    var attr = _.clone(m.attributes);
                    var newTagAttr = {
                        id: attr.id,
                        name: attr.name
                    }
                    // console.log(newTagAttr);
                    //
                    var newTags = self.model.get('tags') || [];
                    newTags.push(newTagAttr);
                    self.model.set({"tags": newTags}, {silent: true});
                    self.$el.addClass('hasTags');
                    self.renderClear();
                    self.trigger("saved", m);
                    // check if its already in the full list or not, if not add it
                    if(!self.tagsFullList.collection.get(m.id)) {
                        self.tagsFullList.collection.add(_.clone(m.attributes));
                    }
                    self.collectionOf.add(m);
                    self.listenToTags();
                    self.renderColors();
                    
                    if(callback) {
                        callback(m);
                    }
                });
            }
        },
        shownDropdown: function() {
            this.tagsOfList.render().$el.find('> ul.tagsList').addClass('tagsOfSong');
            this.renderTopTags();
            this.focus();
        },
        clickBtnDropdown: function(e) {
            this.tagsOfList.render();
            this.renderTopTags();
            $(e.currentTarget).dropdown('toggle');
            this.focus();
            e.stopPropagation();
            e.preventDefault();
        },
        clickInput: function() {
            return false;
        },
        clickTag: function(e) {
            if(confirm("Are you sure that you want to remove this tag?")) {
                
            }
            return false;
        }
    });

    if (define) {
        define(function() {
            return {
                Model: Model,
                Collection: Collection,
                CollectionOf: CollectionOf,
                List: ListView,
                Row: RowView,
                Avatar: AvatarView,
                Form: FormView,
                Dropdown: Dropdown
            }
        });
    }
})();