(function() {
    
    var mimeIcons = {
        "text/html": "",
        "application/xml": "",
        "image/jpeg": "",
        "image/png": "",
        "image/gif": "",
        "application/x-gzip": "",
        "application/pdf": ""
    }
    
    var Model = Backbone.House.Model.extend({
        collectionName: "files",
        initialize: function() {
            this.TableRowView = FileRow;
            this.RowView = FileRow;
            this.AvatarView = FileAvatar;
            this.FullView = FileAvatar;
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
    
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'files',
        sortField: 'uploadDate-',
        getOrFetchFilename: function(filename, callback) {
            this.getOrFetchField('filename', filename, callback);
        },
    });
    
    // var ListView = Backbone.View.extend({
    //     layout: 'row',
    //     initialize: function() {
    //         var self = this;
    //         self.loading = false;
    //         this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> files</div>');
    //         this.$batch = $('<div class="batch"><input type="checkbox" name="select" /><button class="delete">delete</button></div>');
    //         var $ul = this.$ul = $('<ul class="files"></ul>');
    //         this.collection.on('add', function(doc) {
    //             var view;
    //             if(self.layout === 'row') {
    //                 view = doc.getRow({list: self});
    //             } else if(self.layout === 'avatar') {
    //                 view = doc.getAvatar({list: self});
    //             }
    //             self.appendRow(view);
                
    //             self.renderPager();
    //             doc.on('remove', function(){
    //                 view.$el.remove();
    //                 return false;
    //             });
    //         });
    //         this.collection.on('remove', function(doc, col, options) {
    //             self.renderPager();
    //         });
    //         this.collection.on('count', function() {
    //             self.renderPager();
    //         });
    //         this.collection.on('reset', function(){
    //             self.render();
    //         });
            
    //         $(window).scroll(function(){
    //             if(self.$el.is(":visible")) {
    //               if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()){
    //                 self.loading = true;
    //                 self.loadMore();
    //               }
    //             }
    //         });
    //     },
    //     filter: function(f) {
    //         var self = this;
    //         if (f && typeof f == "function") {
    //             this.currentFilter = f;
    //             var flen = this.collection.filter(function(model) {
    //                 if (f(model)) {
    //                     self.getDocLayoutView(model).$el.show();
    //                     return true;
    //                 }
    //                 self.getDocLayoutView(model).$el.hide();
    //                 return false;
    //             }).length;
    //             this.filterLength = flen;
    //         } else if(f) {
    //             this.currentFilterO = _.clone(f);
    //             this.currentFilter = function(model) {
    //                 var l = _.size(this.currentFilterO);
    //                 for(var i in this.currentFilterO) {
    //                   if(this.currentFilterO[i] instanceof RegExp) {
    //                       if(this.currentFilterO[i].test(model.get(i))) {
    //                           l--;
    //                       }
    //                   } else {
    //                     if (this.currentFilterO[i] === model.get(i)) l--;
    //                   }
    //                 }
    //                 if(l === 0) {
    //                     return true;
    //                 }
    //                 return false;
    //             }
    //             var flen = this.collection.filter(function(model) {
    //                 if (self.currentFilter(model)) {
    //                     self.getDocLayoutView(model).$el.show();
    //                     return true;
    //                 }
    //                 self.getDocLayoutView(model).$el.hide();
    //                 return false;
    //             }).length;
    //             delete this.collection.count;
    //             this.filterLength = flen;
    //             self.filterLoadOptions = _.clone(f);
    //             var loadO = _.clone(f);
    //             loadO.skip = 0; //flen;
    //             this.collection.load(loadO, function(){
    //                 self.filterLength = self.collection.filter(self.currentFilter).length
    //             });
    //         } else {
    //             self.$ul.children().show();
    //             self.currentFilter = false;
    //             self.filterLength = false;
    //             self.filterLoadOptions = false;
    //             delete this.collection.count;
    //             this.collection.load({}, function(){
    //             });
    //         }
    //     },
    //     events: {
    //       "click .list-pager": "loadMore",
    //       'change .batch input[type="checkbox"]': "toggleSelectAll",
    //       'click .batch .delete': "deleteSelected"
    //     },
    //     deleteSelected: function() {
    //         if(!confirm("Are you sure that you really want to delete the selected files?")) return;
    //         var self = this;
    //         this.$el.find('input[type="checkbox"]:visible:checked').each(function(i,e){
    //             var doc = self.collection.get($(e).parent().attr('id'));
    //             if(doc) {
    //                 doc.destroy({success: function(model, response) {
    //                       console.log('deleted');
    //                     }, 
    //                     error: function(model, response) {
    //                         console.log(arguments);
    //                     },
    //                 wait: true});
    //             }
    //         });
    //     },
    //     toggleSelectAll: function() {
    //         if(this.$el.find('.batch input[type="checkbox"]').attr('checked') == 'checked') {
    //             this.$ul.find('input[type="checkbox"]:visible').attr('checked', 'checked');
    //         } else {
    //             this.$ul.find('input[type="checkbox"]').removeAttr('checked');
    //         }
    //     },
    //     loadMore: function() {
    //         var self = this;
            
    //         if(this.collection.length < this.collection.count) {
    //             var loadO = this.filterLoadOptions || {};
    //             if(this.filterLength) {
    //                 loadO.skip = this.filterLength;
    //             } else {
    //                 loadO.skip = this.collection.length;
    //             }
    //             this.collection.load(loadO, function(){
    //                 if(self.currentFilter)
    //                 self.filterLength = self.collection.filter(self.currentFilter).length;
    //                 self.loading = false;
    //             });
    //         }
    //     },
    //     getDocLayoutView: function(doc) {
    //         var view;
    //         if(this.layout === 'row') {
    //             view = doc.getRow({list: self});
    //         } else if(this.layout === 'avatar') {
    //             view = doc.getAvatar({list: self});
    //         }
    //         return view;
    //     },
    //     render: function() {
    //         var self = this;
    //         this.$el.html('');
    //         this.$el.append(this.$batch);
    //         this.$el.append(this.$ul);
    //         this.$ul.html('');
    //         //this.collection.sort({silent:true});
    //         this.collection.each(function(doc){
    //             var view = self.getDocLayoutView(doc);
    //             self.appendRow(view);
    //         });
    //         this.$el.append(this.$pager);
    //         this.renderPager();
    //         this.setElement(this.$el);
    //         return this;
    //     },
    //     renderPager: function() {
    //         var len = this.collection.length;
    //         var c = this.collection.count > len ? this.collection.count : len;
    //         if(this.currentFilter) {
    //             c = this.collection.count;
    //             len = this.collection.filter(this.currentFilter).length;
    //         } else {
                
    //         }
    //         this.$pager.find(".list-length").html(len);
    //         this.$pager.find(".list-count").html(c);
    //     },
    //     appendRow: function(row) {
    //         var rank = new Date(row.model.get('uploadDate'));
    //         rank = rank.getTime();
    //         var rowEl = row.render().$el;
    //         if(this.currentFilter && !this.currentFilter(row.model)) {
    //             rowEl.hide();
    //         }
    //         /*
    //         if(self.currentFilter) {
    //             if(self.currentFilter(doc)) {
    //                 self.getDocLayoutView(doc).$el.show();
    //             } else {
    //                 self.getDocLayoutView(doc).$el.hide();
    //             }
    //         }
    //         */
    //         rowEl.attr('data-sort-rank', rank);
    //         var d = false;
    //         var $lis = this.$ul.children();
    //         var last = $lis.last();
    //         var lastRank = parseInt(last.attr('data-sort-rank'), 10);
    //         if(rank > lastRank) {
    //             $lis.each(function(i,e){
    //                 if(d) return;
    //                 var r = parseInt($(e).attr('data-sort-rank'), 10);
    //                 if(rank > r) {
    //                     $(e).before(rowEl);
    //                     d = true;
    //                 }
    //             });
    //         }
    //         if(!d) {
    //             this.$ul.append(rowEl);
    //         }
    //     }
    // });
    
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
            
            /*this.fileActionProcess = new FileActionProcess({id: this.id, model: this.model});
            this.$el.append(this.fileActionProcess.render().el);
            this.actions.push(this.fileActionProcess);*/
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
          "click": "select"
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
          "click": "select"
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
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.fileActions = new FileActions({model: this.model});
            this.$checkbox = $('<input type="checkbox" name="select" />');
            
            this.fileGroupsView = new utils.SelectGroupsInputView({model: this.model});
        },
        render: function() {
            var $byline = $('<span class="byline"></span>');
            this.$el.html('');
            this.$el.append(this.$checkbox);
            var contentType = this.model.get('contentType');
            var $icon = $('<span class="contentIcon '+contentType.substr(0, contentType.indexOf('/'))+'"></span>');
            if(contentType.indexOf('image') === 0) {
                if(this.model.get('length') < 1000000) {
                    var $img = $('<img src="/api/files/'+this.model.get('filename')+'" />');
                    $icon.append($img);
                }
            }
            this.$el.append($icon);
            this.$el.append('<span class="filename"><a href="/api/files/'+this.model.get('filename')+'" target="_new">'+this.model.get('filename')+'</a></span>');
            this.$el.append('<span class="contentLength">'+this.model.getLengthFormatted()+'</span>');
            this.$el.append('<span class="contentType">'+this.model.get('contentType')+'</span>');
            
            var $at = $('<span class="uploadDate">'+this.model.get('uploadDate')+'</span>');
            if(window.clock) {
                $at.attr('title', clock.moment(this.model.get('uploadDate')).format('LLLL'));
                $at.html(clock.moment(this.model.get('uploadDate')).calendar());
            }
            $byline.append($at);
            if(this.model.has('metadata')) {
                if(this.model.get('metadata').owner) {
                    $byline.append(' by '+this.model.get('metadata').owner.name);
                }
            }
            this.$el.append($byline);
            this.$el.append(this.fileGroupsView.render().$el);
            this.$el.append(this.fileActions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select"
        },
        select: function() {
        },
        remove: function() {
          this.$el.remove();
        }
    });
    
    var FileAvatar = Backbone.View.extend({
        tagName: "span",
        className: "fileAvatar",
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.fileActions = new FileActions({model: this.model});
            // this.$checkbox = $('<input type="checkbox" name="select" />');
            
            this.fileGroupsView = new utils.SelectGroupsInputView({model: this.model});
        },
        render: function() {
            var $byline = $('<span class="byline"></span>');
            this.$el.html('');
            // this.$el.append(this.$checkbox);
            var contentType = this.model.get('contentType');
            var $icon = $('<span class="contentIcon '+contentType.substr(0, contentType.indexOf('/'))+'"></span>');
            if(contentType.indexOf('image') === 0) {
                if(this.model.get('length') < 1000000) {
                    var $img = $('<img src="/api/files/'+this.model.get('filename')+'" />');
                    $icon.append($img);
                }
            }
            this.$el.append($icon);
            this.$el.append('<span class="filename"><a href="/api/files/'+this.model.get('filename')+'" target="_new">'+this.model.get('filename')+'</a></span>');
            this.$el.append('<span class="contentLength">'+this.model.getLengthFormatted()+'</span>');
            this.$el.append('<span class="contentType">'+this.model.get('contentType')+'</span>');
            
            var $at = $('<span class="uploadDate">'+this.model.get('uploadDate')+'</span>');
            if(window.clock) {
                $at.attr('title', clock.moment(this.model.get('uploadDate')).format('LLLL'));
                $at.html(clock.moment(this.model.get('uploadDate')).calendar());
            }
            $byline.append($at);
            if(this.model.has('metadata')) {
                if(this.model.get('metadata').owner) {
                    $byline.append(' by '+this.model.get('metadata').owner.name);
                }
            }
            this.$el.append($byline);
            this.$el.append(this.fileGroupsView.render().$el);
            this.$el.append(this.fileActions.render().$el);
            this.setElement(this.$el);
            return this;
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
    
    var SearchView = Backbone.View.extend({
        className: 'search',
        element: 'div',
        render: function() {
            this.$el.html('');
            var $form = $('<form></form>').append(this.$search).append('<div class="clearBox">x</div>');
            this.$el.append($form);
            var $libCount = $('<span class="libCount"></span>');
            if(this.list.collection.colCount)
                $libCount.html('from ' + this.list.collection.colCount + ' files');
            this.$el.append($libCount);
            this.$el.append(this.$selectType);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            var self = this;
            this.$search = $('<input class="search" type="text" name="query" placeholder="search filename" autocomplete="off" />');
            this.$selectType = $('<select name="type"><option value="all">all types</option><option value="text">text</option><option value="image">image</option><option value="audio">audio</option><option value="video">video</option></select>');
            this.list = options.list;
        },
        events: {
            "keyup input": "debouncedSearch",
            "click .clearBox": "clear",
            "submit form": "submit",
            'change select[name="type"]': 'changeType'
        },
        clear: function() {
            this.$search.val('');
            this.$search.focus();
        },
        changeType: function() {
            this.search();
        },
        submit: function(e) {
            this.search();
            return false;
        },
        debouncedSearch: _.debounce(function(e){
            this.search(e);
        }, 300),
        search: function(e) {
            var searchStr = this.$search.val().trim();
            if(searchStr.length == 1) return false;
            var f = {};
            var contentTypeStr = this.$selectType.val();
            var noFilter = false;
            if(contentTypeStr == 'all') {
                if(searchStr == '') {
                    noFilter = true;
                }
            } else {
                var regexCt = new RegExp(escapeRegExp(contentTypeStr), 'i');
                f.contentType = regexCt;
            }
            
            if(searchStr == '') {
                
            } else {
                var regex = new RegExp(escapeRegExp(searchStr), 'i');
                f.filename = regex;
            }
            if(noFilter) {
                this.list.filter();
            } else {
                this.list.filter(f);
            }
            
            return false;
        }
    });
    
    var FileForm = Backbone.View.extend({
        tagName: "div",
        className: "fileForm",
        initialize: function(options) {
            var self = this;
            self.options = options = options || {};
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
            if(self.options.metadata) {
                formData.append("metadata", JSON.stringify(self.options.metadata));
            }
            formData.append("files", blobOrFile);
            xhr.open("POST", "/api/files", true);
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
            if(self.options.metadata) {
                formData.append("metadata", JSON.stringify(self.options.metadata));
            }
            formData.append("files", blobOrFile);
            xhr.open("POST", "/api/files", true);
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
            this.fileForm = new FileForm(options);
            this.fileForm.on('file', function(f) {
                console.log('append file')
                self.appendFile(f);
            });
            this.fileForm.on('progress', function(progress) {
                var name = progress.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                $file.find('.progress').show();
                var per = Math.floor((progress.loaded / progress.total) * 100);
                $file.find('.progress-bar').css('width', per+'%');
            });
            this.fileForm.on('uploaded', function(data) {
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                //console.log(data);
                var name = data.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                //console.log($file);
                $file.remove();
                self.trigger('uploaded', data.data);
            });
            this.uploadDragDrop = new DragDropView(options);
            this.uploadDragDrop.on('file', function(f) {
                self.appendFile(f);
            });
            this.uploadDragDrop.on('progress', function(progress) {
                //console.log(progress)
                var name = progress.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                $file.find('.progress').show();
                var per = Math.floor((progress.loaded / progress.total) * 100);
                $file.find('.bar').css('width', per+'%');
            });
            this.uploadDragDrop.on('uploaded', function(data) {
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                //console.log(data);
                var name = data.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                //console.log($file);
                $file.remove();
                self.trigger('uploaded', data.data);
            });
            this.$uploadFileList = $('<ul class="uploadFileList list-unstyled"></ul>');
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
            $localFile.append('<div class="progress progress-striped"><div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"><span class="sr-only">0% Complete</span></div></div>');
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
        }
    });
    
    function escapeRegExp(str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }
    
    if(define) {
        define(function () {
            return {
                Collection: Collection,
                Model: Model,
                List: ListView,
                Row: FileRow,
                Avatar: FileAvatar,
                FileForm: FileForm,
                DragDropView: DragDropView,
                UploadFrame: UploadFrame,
                SearchView: SearchView
            }
        });
    }
})();