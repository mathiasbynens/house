(function() {
    
    var Image = Backbone.Model.extend({
        collectionName: "images",
        initialize: function(attr, opts) {
            var colOpts = {
                image: this
            };
            //attr.sizes = attr.sizes || [];
            //this.imageSizeCollection = new ImageSizeCollection(attr.sizes, colOpts);
            this.on("change", function(model, options){
                console.log(arguments);
            });
        },
        getFullView: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.fullView) {
                this.fullView = new ImageFullView(options);
            }
            return this.fullView;
        },
        getAvatar: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.avatar) {
                this.avatar = new ImageAvatar(options);
            }
            return this.avatar;
        },
        getRow: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.row) {
                this.row = new ImageRow(options);
            }
            return this.row;
        }
    });
    
    var ImageTag = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            options.model = this;
            return new ImageTagView(options);
        }
    });
    var ImageGroup = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            options.model = this;
            return new ImageGroupView(options);
        }
    });
    var ImageSize = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            options.model = this;
            return new ImageSizeView(options);
        }
    });
    
    var Images = Backbone.Collection.extend({
        model: Image,
        collectionName: 'images',
        url: '/api/images',
        initialize: function() {
            var self = this;
            self.pageSize = 10;
            this.resetFilters();
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
                self.trigger('colCount', count);
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
            var image;
            image = this.get(id);
            if(image) {
                callback(image);
            } else {
                var options = { "_id": id };
                this.fetch({data: options, add: true, success: function(collection, response){
                        if(response) {
                            console.log(response);
                            image = self.get(id);
                            callback(image);
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
                this.view = new ImageList(options);
                this.view.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.view;
        },
    });
    
    var ImageTagCollection = Backbone.Collection.extend({
        model: ImageTag,
        url: function() {
            return "/api/images/" + this.options.menuGroup.get("id") + "/tags";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("view")) {
                options.collection = this;
                this.view = new ImageTagList(options);
                this.view.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.view;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        }
    });
    var ImageGroupCollection = Backbone.Collection.extend({
        model: ImageGroup,
        url: function() {
            return "/api/images/" + this.options.menuGroup.get("id") + "/groups";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("view")) {
                options.collection = this;
                this.view = new ImageGroupList(options);
                this.view.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.view;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        }
    });
    
    var ImagesList = Backbone.View.extend({
        layout: 'avatar',
        initialize: function() {
            var self = this;
            self.loading = false;
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> images</div>');
            var $ul = this.$ul = $('<ul class="images"></ul>');
            this.collection.bind("add", function(doc) {
                var view;
                if(self.layout === 'row') {
                    view = doc.getRow({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatar({list: self});
                }
                self.appendRow(view.render().el);
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
        events: {
          "click .list-pager": "loadMore",
        },
        loadMore: function() {
            var self = this;
            this.collection.getNextPage(function(){
                self.loading = false;
            });
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
                    view = doc.getRow({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatar({list: self});
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
        appendRow: function(row) {
            this.$ul.append(row);
        }
    });
    
    var ImageTagList = Backbone.View.extend({
        tag: "span",
        className: "imageTags",
        initialize: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        },
        render: function() {
            var self = this;
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        appendModel: function(m) {
            this.$el.show();
            var $el = m.getNewView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        addTagToImage: function(tag) {
            if (!tag) {
                return;
            }
            var self = this;
            var model = new MenuGroupImage({}, {
                collection: this.selectedMenu.menuGroupImageCollection
            });
            model.set(image);
            var saveModel = model.save(null, {
                silent: true,
                wait: true
            });
            saveModel.done(function() {
                self.selectedMenu.menuGroupImageCollection.add(model);
            });
        },
    });
    
    var ImageGroupList = Backbone.View.extend({
        tag: "span",
        className: "imageGroups",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        appendModel: function(m) {
            this.$el.show();
            var $el = m.getNewView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    
    var ImageSizeList = Backbone.View.extend({
        tag: "span",
        className: "imageSizes",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        appendModel: function(m) {
            this.$el.show();
            var $el = m.getNewView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    
    var ImageActions = Backbone.View.extend({
        tagName: "span",
        className: "imageActions",
        render: function() {
            var self = this;
            this.$el.html('');
            self.$el.append(this.imageTags.render().$el);
            self.$el.append(this.imageGroups.render().$el);
            self.$el.append(this.imageActionDelete.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.actions = [];
            this.imageGroups = new ImageGroups({id: this.id, model: this.model});
            this.imageTags = new ImageTags({id: this.id, model: this.model});
            this.imageActionDelete = new ImageActionDelete({id: this.id, model: this.model});
        }
    });

    var ImageActionDelete = Backbone.View.extend({
        tagName: "span",
        className: "delete",
        render: function() {
            this.$el.html('<button>delete</button>');
            this.$el.removeAttr('id');
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
            
            var getAndDestroyModel = function(fileId, callback) {
                images.filesCollection.getOrFetch(fileId, {add: false}, function(fileModel){
                    console.log(fileModel);
                    if(fileModel) {
                        fileModel.destroy({success: function(model, response) {
                            if(callback) callback(response);
                        }, 
                        errorr: function(model, response) {
                            if(callback) callback(response);
                        },
                        wait: true});
                    }
                });
            }
            
            var removeThumbs = function() {
                var sizes = self.model.get("sizes");
                for(var sizeName in sizes) {
                    var size = sizes[sizeName];
                    getAndDestroyModel(size["id"]);
                }
            }
            
            var removeOriginalFiles = function() {
                var ref = self.model.get("ref");
                if(ref && ref.col === 'files.files') {
                    getAndDestroyModel(ref.id);
                }
            }
            
            if(confirm("Are you sure that you want to delete this image?")) {
                if(confirm("Would you like to remove the original file?")) {
                    removeOriginalFiles();
                    removeThumbs();
                } else if(confirm("Would you like to remove the thumbnails?")) {
                    removeThumbs();
                }
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
    
    var ImageTags = Backbone.View.extend({
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

    var ImageGroups = Backbone.View.extend({
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


    var ImageRow = Backbone.View.extend({
        
        tagName: "li",
        
        className: "imageRow",

        htmlTemplate: '<img src="/api/file/<%= filename %>" />\
                        <span class="info">\
                            <span class="filename"><%= filename %></span>\
                            <span class="at" data-datetime="<%= at ? at : "" %>" title="<%= createdAtFormatted %>">created: <%= createdAtShort %></span>\
                        </span>',
        
        template: function(doc) {
            
            // Add default values to doc which are required in the template
            
            if(doc.hasOwnProperty('at')) {
                var createdAtFormatted = new Date(doc.at);
                doc.createdAtFormatted = createdAtFormatted.toLocaleString();
                var hours = createdAtFormatted.getHours();
                var ampm = 'am';
                if(hours > 12) {
                    hours = hours - 12;
                    ampm = 'pm';
                }
                doc.createdAtShort = (createdAtFormatted.getMonth()+1)+'/'+createdAtFormatted.getDate()+' @ '+hours+':'+createdAtFormatted.getMinutes()+' '+ampm;
            } else {
                doc.at = false;
                doc.createdAtFormatted = '';
                doc.createdAtShort = '';
            }
            
            var template = $(_.template(this.htmlTemplate, doc));
            
            this.$el.attr('data-images-id', this.model.get("_id"));
            
            return template;
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            
            this.$el.append(this.$actions);
            
            this.imageActions.render();
            
            this.trigger('resize');
            
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            
            return this;
        },
        initialize: function(options) {
            
            if(options.list) {
                this.list = options.list;
            }
            
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);

            this.$actions = $('<div class="actions"></div>');
            this.imageActions = new ImageActions({id: this.id, model: this.model});
            this.$actions.append(this.imageActions.render().el);
            
            
        },
        events: {
          "click": "select"
        },
        select: function(e) {
            
            
            // One click to select, another to deselect.  Can only have one selection at a time.
            
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            
            if(this.$el.hasClass('selected')) {
                this.$el.removeClass("selected");
                this.$el.removeAttr('selected');
                
                this.trigger('deselect');
            } else {
                deselectSiblings(this.$el);
                this.$el.addClass("selected");
                this.$el.attr("selected", true);
                
                if(this.hasOwnProperty('list')) {
                    this.list.trigger('select', this);
                }
                
                this.trigger('select');
            }
            this.trigger('resize');
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var ImageFullView = Backbone.View.extend({
        tagName: "div",
        className: "imageFullView",
        htmlTemplate: '<img src="/api/files/<%= imgSrc %>" />\
                        <span class="info">\
                            <h3 class="caption"></h3>\
                            <span class="at" data-datetime="<%= at ? at : "" %>" title="<%= createdAtFormatted %>">created: <%= createdAtShort %></span>\
                            <span class="checkin"></span>\
                            <%= downloadMenu %>\
                            <%= exifHtml %>\
                        </span>',
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.renderInfo, this);
            this.model.bind('change:caption', this.renderCaption, this);
            this.model.bind('change:tags', this.renderActions, this);
            this.model.bind('change:groups', this.renderActions, this);
            this.model.bind('change:owner', this.renderActions, this);
            this.model.bind('destroy', this.remove, this);
    
            this.$actions = $('<div class="actions"></div>');
            this.imageActions = new ImageActions({id: this.id, model: this.model});
            this.$actions.append(this.imageActions.render().el);
            
            if(this.model.get('checkin') && !this.hasOwnProperty('imageCheckin')) {
                console.log(this.model.get('checkin').id)
                console.log(this.model.get('checkin'))
                
                require(['../checkins/checkins.js'], function(CheckinsBackbone){
                    self.imageCheckin = new CheckinsBackbone.Avatar({id: self.model.get('checkin').id});
                });
            }
        },
        template: function(doc) {
            if(doc.hasOwnProperty('at')) {
                var createdAtFormatted = new Date(doc.at);
                doc.createdAtFormatted = createdAtFormatted.toLocaleString();
                var hours = createdAtFormatted.getHours();
                var ampm = 'am';
                if(hours > 12) {
                    hours = hours - 12;
                    ampm = 'pm';
                }
                doc.createdAtShort = (createdAtFormatted.getMonth()+1)+'/'+createdAtFormatted.getDate()+' @ '+hours+':'+createdAtFormatted.getMinutes()+' '+ampm;
            } else {
                doc.at = false;
                doc.createdAtFormatted = '';
                doc.createdAtShort = '';
            }
            doc.metaLinksHtml = '<a href="/api/files'+doc.filename+'.meta" target="_new">meta</a> <a href="/api/files/'+doc.filename+'.metab" target="_new">meta binary</a>';
            doc.downloadMenu = '<a target="_new" href="/api/files/'+doc.filename+'">original</a>';
            doc.imgSrc = doc.filename;
            if(doc.hasOwnProperty('sizes')) {
                for(var sizeName in doc.sizes) {
                    var size = doc.sizes[sizeName];
                    
                    if(sizeName == 'full') {
                        doc.imgSrc = size.filename;
                    }
                    
                    var downloadSize = ' <a target="_new" href="/api/files/'+size.filename+'">'+sizeName+'</a> ';
                    doc.downloadMenu += downloadSize;
                }
            }
            
            doc.downloadMenu = '<span class="download"><a>'+doc.filename+'</a> '+ doc.downloadMenu + doc.metaLinksHtml + '</span>';
            
            // Checkin HTML
            doc.checkinHtml = '';
            if(doc.hasOwnProperty('checkin')) {
                doc.checkinHtml = '<span class="checkin">checkins/'+doc.checkin.id+'</span>';
            }
            
            // Exif HTML
            doc.exifHtml = '';
            if(doc.hasOwnProperty('exif')) {
                for(var i in doc.exif) {
                    doc.exifHtml += '<pre>'+i+': '+doc.exif[i]+'</pre>';
                }
            }
            doc.exifHtml = '<a class="exif" href="#">exif data</a><span class="exifData">' + doc.exifHtml + '</span>';
            
            var template = $(_.template(this.htmlTemplate, doc));
            
            this.$el.attr('data-images-id', this.model.get("_id"));
            
            return template;
        },
        render: function() {
            var self = this;
            this.$el.html(this.template(this.model.toJSON()));
            
            this.renderCaption();
            
            if(this.hasOwnProperty('imageCheckin')) {
                var c = this.$el.find('.checkin');
                this.imageCheckin.setElement(c);
                this.imageCheckin.render();
            }
            
            this.$el.append(this.$actions);
            this.imageActions.render();
            
            this.trigger('resize');
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            return this;
        },
        renderInfo: function() {
            
        },
        renderActions: function() {
            this.imageActions.render();
        },
        renderCaption: function() {
            var caption = this.model.has('caption') ? this.model.get('caption') : 'add a caption';
            this.$el.find('.caption').html(caption);
        },
        show: function() {
            this.$el.show();
        },
        events: {
          "click .exif": "toggleExif",
          "click .caption": "editCaption"
        },
        toggleExif: function() {
            this.$el.find('.exifData').toggle();
            return false;
        },
        editCaption: function() {
            var self = this;
            var c = this.model.get("caption");
            
            var newCaption = prompt("caption text", c);
            
            if(newCaption) {
                this.model.set({"caption": newCaption}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.renderCaption();
                });
            }
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var ImageAvatar = Backbone.View.extend({
        tagName: "li",
        className: "imageAvatar",
        htmlTemplate: ' <span class="info">\
                            <span class="filename"><%= filename %></span>\
                            <span class="at" data-datetime="<%= at ? at : "" %>" title="<%= createdAtFormatted %>">created: <%= createdAtShort %></span>\
                        </span>',
        template: function(doc) {
            if(doc.hasOwnProperty('at')) {
                var createdAtFormatted = new Date(doc.at);
                doc.createdAtFormatted = createdAtFormatted.toLocaleString();
                var hours = createdAtFormatted.getHours();
                var ampm = 'am';
                if(hours > 12) {
                    hours = hours - 12;
                    ampm = 'pm';
                }
                doc.createdAtShort = (createdAtFormatted.getMonth()+1)+'/'+createdAtFormatted.getDate()+' @ '+hours+':'+createdAtFormatted.getMinutes()+' '+ampm;
            } else {
                doc.at = false;
                doc.createdAtFormatted = '';
                doc.createdAtShort = '';
            }
            var template = $(_.template(this.htmlTemplate, doc));
            this.$el.attr('data-images-id', this.model.get("_id"));
            return template;
        },
        render: function() {
            var imageThumbSrc = this.model.get('filename');
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.append(this.$actions);
            if(this.model.has('sizes')) {
                var sizes = this.model.get('sizes');
                for(var sizeName in sizes) {
                    if(sizeName == 'thumb') {
                        var size = sizes[sizeName];
                        imageThumbSrc = size.filename;
                    }
                }
            }
            this.$el.css('background', 'url("/api/files/'+imageThumbSrc+'")');
            this.$el.css('background-size', 'cover');
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            
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
            
            
            // One click to select, another to deselect.  Can only have one selection at a time.
            
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
    
    if(define)
    define(function () {
        //Do setup work here
    
        return {
            Collection: Images,
            Model: Image,
            List: ImagesList,
            Row: ImageRow,
            Avatar: ImageAvatar
        }
    });
})();