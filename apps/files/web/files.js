(function() {
    
    var File = Backbone.Model.extend({
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
        }
    });
    
    var Files = Backbone.Collection.extend({
        model: File,
        collectionName: 'files',
        url: '/api/files',
        initialize: function() {
            var self = this;
            self.pageSize = 10;
            this.resetFilters();
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
        getOrFetch: function(id, options, callback) {
            var collection = this;
            
            var fetchOptions = {
                data: { "_id": id }, add: true, success: function(collection, response){
                    if(response) {
                        documentModel = collection.get(id);
                        callback(documentModel);
                    } else {
                        callback(false);
                    }
                },
                error: function(collection, response){
                    callback(false);
                }
            };
            
            if(typeof options === 'function') {
                callback = options;
                options = {};
            }
            if(options.hasOwnProperty('add')) {
                fetchOptions.add = options.add;
            }
            
            var documentModel;
            
            documentModel = collection.get(id);
            
            if(documentModel) {
                callback(documentModel);
            } else {
                collection.fetch(fetchOptions);
            }
        },
        getNextPage: function() {
            if(this.length < this.collectionCount) {
                this.load({skip:this.length});
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
            if(this.filterProc) {
                options["metadata.proc"] = {"$exists": false};
            }
            return options;
        },
        updateFilter: function(filter) {
            this.reset();
            this.load();
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
        resetFilters: function() {
            this.filteredContentType = false;
        }
    });
    
    var FilesList = Backbone.View.extend({
        layout: 'avatar',
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
                
                //self.appendRow(view.render().el);
                self.$ul.append(view.render().el);
            });
            
            this.trigger('resize');
            
            return this;
        },
        initialize: function() {
            var self = this;
            
            var $ul = this.$ul = $('<ul id="files"></ul>');
            
            this.collection.bind("add", function(doc) {
                var view;
                if(self.layout === 'row') {
                    view = doc.getRow({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatar({list: self});
                }
                
                self.appendRow(view);
            });
            
            this.collection.on('reset', function(){
                self.render();
            });
        },
        refreshPager: function() {
            //$('#todosCollectionShowing').html(this.collection.length);
            //$('#todosCollectionCount').html(this.collection.collectionCount);
        },
        appendRow: function(row) {
            if(this.$ul.children().length === 0) {
                this.$ul.prepend(row.render().el);
            } else {
                var i = this.collection.indexOf(row);
                if(i >= 0) {
                    this.$ul.children().eq(i).before(row.render().el);
                } else {
                    this.$ul.prepend(row.render().el);
                }
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
        
        className: "fileRow clearfix",

        htmlTemplate: '<img src="/api/files/<%= filename %>" />\
                        <span class="info">\
                            <span class="filename"><%= filename %></span>\
                            <span class="at" data-datetime="<%= uploadDate ? uploadDate : "" %>" title="<%= uploadDateFormatted %>">uploaded: <%= uploadDateShort %></span>\
                        </span>',
        
        template: function(doc) {
            
            // Add default values to doc which are required in the template
            
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
            
            // Add default values to doc which are required in the template
            
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
                Collection: Files,
                Model: File,
                List: FilesList,
                Row: FileRow,
                Avatar: FileAvatar,
                FileForm: FileForm
            }
        });
    }
})();