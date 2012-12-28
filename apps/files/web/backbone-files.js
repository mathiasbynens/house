(function() {
    
    var Model = Backbone.Model.extend({
        collectionName: "files",
        initialize: function() {
            this.on("change", function(file, options){
                var changedAttr = file.changedAttributes();
                console.log(changedAttr);
                var doSave = false;
                
                // Don't update the id or createdAt
                delete changedAttr['id'];
                delete changedAttr['_id'];
                delete changedAttr['createdAt'];
                
                for(var i in changedAttr) {
                    if(changedAttr.hasOwnProperty(i)) {
                        doSave = true;
                    }
                }
                
                if(doSave) {
                    file.save();
                }
            });
        },
        getView: function(name, options) {
            options = options || {};
            options.id = this.get("id");
            options.model = this;
            
            var viewObject = eval("File"+name);
            
            if (!this[name]) {
                this[name] = new viewObject(options);
            }
            return this[name];
        },
        getFullView: function(options) {
            return this.getView('FullView', options);
        },
        getAvatar: function(options) {
            return this.getView('Avatar', options);
        },
        getRow: function(options) {
            return this.getView('Row', options);
        },
        getLengthFormatted: function() {
          var bytes = this.get("length");
          var metric = 'B';
          if(bytes > 1024) {
            bytes = Math.floor(bytes / 1024);
            metric = 'K';
          }
          if(bytes > 1024) {
            bytes = Math.floor(bytes / 1024);
            metric = 'M';
          }
          return bytes+metric;
        }
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'files',
        url: '/api/files',
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
                        model.set(doc, {silent:true});
                        model.renderViews();
                    }
                }
                socket.on('insertedFiles', function(doc) {
                    insertOrUpdateDoc(doc);
                    self.count++;
                    self.trigger('count', self.count);
                });
                socket.on('updatedFiles', function(doc) {
                    insertOrUpdateDoc(doc);
                });
                socket.on('deletedFiles', function(id) {
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
                success: function(json) {
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
                options.sort = "uploadDate-";
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
        filterContentType: function(contentType) {
            this.filteredContentType = contentType;
        },
        filterProc: function(doFilter) {
            this.filteredProc = doFilter;
        },
        applyFilters: function(options) {
            if(this.filteredContentType) {
                options.contentType = '/'+this.filteredContentType+'.*/';
            }
            if(this.filteredProc) {
                options["metadata.proc"] = {"$exists": false};
            }
            return options;
        },
        updateFilter: function(filter) {
            this.reset();
            this.load();
        },
        resetFilters: function() {
            this.filteredContentType = false;
        },
        comparator: function(doc) {
            var d;
            if(doc.get("uploadDate")) {
                d = new Date(doc.get("uploadDate")).getTime();
                return d * -1;
            } else {
                return 1;
            }
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
        getOrFetchFilename: function(filename, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({filename:filename}));
            if(doc) {
                callback(doc);
            } else {
                var options = { "filename": filename };
                this.fetch({data: options, add: true, success: function(collection, response){
                        if(response) {
                            doc = _.first(self.where({filename:filename}));
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
    });
    
    var ListView = Backbone.View.extend({
        layout: 'row',
        initialize: function() {
            var self = this;
            self.loading = false;
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> files</div>');
            var $ul = this.$ul = $('<ul class="files"></ul>');
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
    
    var FileActions = Backbone.View.extend({
        
        tagName: "div",
        
        className: "fileActions",
        
        render: function() {
            var self = this;
            this.$el.html('');
            
            this.actions.forEach(function(action){
                self.$el.append(action.render().el);
            });
            
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.actions = [];
            
            this.fileActionDelete = new FileActionDelete({id: this.id, model: this.model});
            this.$el.append(this.fileActionDelete.render().el);
            this.actions.push(this.fileActionDelete);
            
            this.fileActionProcess = new FileActionProcess({id: this.id, model: this.model});
            this.$el.append(this.fileActionProcess.render().el);
            this.actions.push(this.fileActionProcess);
        }
    });
    
    
    var FileActionProcess = Backbone.View.extend({
        
        tagName: "span",
        
        className: "process",
        
        render: function() {
            
            var $btn = $('<button>process</button>');
            var metadata = this.model.get('metadata');
            if(metadata.hasOwnProperty('proc')) {
                $btn.attr('processed', metadata.proc);
            }
            
            this.$el.html($btn);
            
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
            if(confirm("Are you sure that you want to process this file?")) {
                
                var m = this.model.get("metadata");
                //m.proc = 1;
                console.log(this.model);
                this.model.set({"metadata.proc": 0},{wait: true});
                console.log(this.model);
            }
            return false;
        }
    });
    
    var FileActionDelete = Backbone.View.extend({
        
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
            console.log(this.model);
            if(confirm("Are you sure that you want to delete this file?")) {
                this.model.destroy({success: function(model, response) {
                  console.log('delete');
                }, 
                error: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            }
            return false;
        }
    });
    
    var FileRow = Backbone.View.extend({
        tagName: "li",
        className: "fileRow",
        render: function() {
            this.$el.html('');
            this.$el.append('<span class="filename"><a href="/api/files/'+this.model.get('filename')+'" target="_new">'+this.model.get('filename')+'</a></span>');
            this.$el.append('<span class="contentLength">'+this.model.getLengthFormatted()+'</span>');
            this.$el.append('<span class="contentType">'+this.model.get('contentType')+'</span>');
            this.$el.append(this.fileActions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.fileActions = new FileActions({model: this.model});
        },
        events: {
          "click": "select",
        },
        select: function() {
        },
        remove: function() {
          this.$el.remove();
        }
    });
    
    var FileAvatar = Backbone.View.extend({
        tagName: "li",
        className: "fileAvatar",
        htmlTemplate: '<img src="/api/files/<%= filename %>" />\
                        <span class="info">\
                            <span class="filename"><%= filename %></span>\
                            <span class="at" data-datetime="<%= uploadDate ? uploadDate : "" %>" title="<%= uploadDateFormatted %>">uploaded: <%= uploadDateShort %></span>\
                            <%= refsHtml %>\
                        </span>',
        template: function(doc) {
            if(doc.hasOwnProperty('uploadDate')) {
                var uploadDateFormatted = new Date(doc.uploadDate);
                doc.uploadDateFormatted = uploadDateFormatted.toLocaleString();
                var hours = uploadDateFormatted.getHours();
                var ampm = 'am';
                if(hours > 12) {
                    hours = hours - 12;
                    ampm = 'pm';
                }
                doc.uploadDateShort = (uploadDateFormatted.getMonth()+1)+'/'+uploadDateFormatted.getDate()+' @ '+hours+':'+uploadDateFormatted.getMinutes()+' '+ampm;
            } else {
                doc.uploadDate = false;
                doc.uploadDateFormatted = '';
                doc.uploadDateShort = '';
            }
            
            doc.refsHtml = 'Refs: ';
            if(doc.metadata.hasOwnProperty('refs')) {
                for(var i in doc.metadata.refs) {
                    var refDoc = doc.metadata.refs[i];
                    doc.refsHtml += ' '+refDoc.col +'/'+ refDoc.id;
                }
            }
            
            var template = $(_.template(this.htmlTemplate, doc));
            
            this.$el.attr('data-files-id', this.model.get("_id"));
            
            return template;
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            
            this.$el.append(this.$actions);
            
            this.fileActions.render();
            
            this.trigger('resize');
            
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            
            this.$actions = $('<div class="actions"></div>');
            this.fileActions = new FileActions({id: this.id, model: this.model});
            this.$actions.append(this.fileActions.render().el);
        },
        events: {
          "click": "select",
          "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            // One click to select, another to deselect.  Can only have one selection at a time.
            
            if(this.hasOwnProperty('list') && this.list.hasOwnProperty('multiSelect') && this.list.multiSelect) {
                this.$el.addClass("selected");
                this.$el.attr("selected", true);
            } else {
            
                var deselectSiblings = function(el) {
                    el.siblings().removeClass('selected');
                    el.siblings().removeAttr('selected');
                }
                
                if(this.$el.hasClass('selected')) {
                    this.$el.removeClass("selected");
                    this.$el.removeAttr('selected');
                    
                    // Un Filter the Actions List
                    //body.actionsListView.filterSession(false);
                    //this.trigger('select', true);
                } else {
                    deselectSiblings(this.$el);
                    this.$el.addClass("selected");
                    this.$el.attr("selected", true);
                    //this.trigger('select', false);
                }
            }
            this.trigger('resize');
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
            options = options || {};
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
            this.$html = $('<button class="upload">Upload '+typeName+'</button>');
            this.fileInput = new utils.UploadInputView({acceptType: acceptType});
            this.fileInput.on('upload', function(data){
                if (data.file) {
                    if(self.collection) {
                        self.collection.add(data.file);
                    }
                }
                self.trigger('upload', data);
            });
        },
        render: function() {
            var self = this;
            this.$el.append(this.$html);
            this.$el.append(this.fileInput.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click button.upload": "pickFile"
        },
        pickFile: function() {
            this.fileInput.click();
            return false;
        }
    });
    
    if(define) {
        define(function () {
            return {
                Collection: Collection,
                Model: Model,
                List: ListView,
                Row: FileRow,
                Avatar: FileAvatar,
                FileForm: FileForm
            }
        });
    }
})();