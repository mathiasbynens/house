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
    
    if(!window.filesize) {
        require(['/files/filesize.min.js'], function(filesize){
            window.filesize = filesize;
        });
    }
    
    var Model = Backbone.House.Model.extend({
        collectionName: "files",
        initialize: function(attrs, options) {
            this.TableRowView = FileRow;
            this.RowView = FileRow;
            this.AvatarView = FileAvatar;
            this.FullView = FileFullView;
            options = options || {};
            options.ownerFieldName = 'metadata.owner';
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        getLengthFormatted: function() {
            var self = this;
            
            if(filesize) {
                return filesize(this.get("length"), {unix: true});
            }
            
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
        },
        getContentTypeGlphyicon: function() {
            if(this.has('contentType')) {
                var contentType = this.get('contentType');
                if(contentType.indexOf('image') === 0) {
                    return 'picture';
                } else if(contentType.indexOf('text') === 0) {
                    return 'file';
                } else if(contentType.indexOf('audio') === 0) {
                    return 'music';
                } else if(contentType.indexOf('video') === 0) {
                    return 'film';
                }
            }
        },
        getFilenameSrc: function() {
            var apiFilesPath = config.filesPath || '/api/files/';
            return apiFilesPath + encodeURIComponent(this.get('filename'));
        },
    });
    
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'files',
        sortField: 'uploadDate-',
        getOrFetchFilename: function(filename, callback) {
            this.getOrFetchField('filename', filename, callback);
        },
    });
    
    var FileRow = Backbone.View.extend({
        tagName: "tr",
        className: "fileRow",
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            var opts = {
                model: this.model, 
                actionOptions: {
                    fav: {fieldName: 'metadata.fav'},
                    tags: {fieldName: 'metadata.tags'},
                    groups: {fieldName: 'metadata.groups'},
                    detail: true,
                    share: true,
                }
            }
            if(this.model.get('metadata').src) {
                var src = this.model.get('metadata').src;
                var modelName = src.substr(0, src.length-1);
                opts.actionOptions.more = {
                    "deleteSrc": {
                        title: "Delete "+modelName,
                        glyphicon: 'trash',
                        action: function(model) {
                            if(confirm("Are you sure that you want to delete the source "+modelName+"?")) {
                                console.log(typeof model.url);
                                console.log(model.url);
                                model.url = model.url() + '/src';
                                // model.url = model.url+'/src';
                                // return;
                                model.destroy({success: function(model, response) {
                                  console.log('deleted src');
                                }, 
                                error: function(model, response) {
                                    console.log(arguments);
                                },
                                wait: true});
                            }
                        }
                    }
                }
            }
            this.fileActions = new utils.ModelActionsView(opts);
            this.fileActions.on('goToTagName', function(tagName){
                app.collection.view.tagsView.tagSelectView.selectTagByName(tagName);
            });
            
            this.$tdIcon = $('<td class="icon"></td>');
            this.$tdName = $('<td class="name"></td>');
            this.$tdSize = $('<td class="size"></td>');
            this.$tdAt = $('<td class="at"></td>');
            this.$tdActions = $('<td class="actions"></td>');
            
            // this.$panelHead = $('<div class="panel-heading"></div>');
            // this.$panelBody = $('<div class="panel-body"></div>');
            // this.$panelFoot = $('<div class="panel-footer"></div>');
            // this.$checkbox = $('<input type="checkbox" name="select" />');
            // this.$caption = $('<span class="caption"></span>');
            // this.$byline = $('<span class="byline"></span>');
            // this.$extraInfo = $('<div class="extraInfo"><h3>Metadata</h3></div>');
            // this.$icon = $('<span class="contentIcon"></span>');
            // this.$filename = $('<span class="filename"></span>');
        },
        render: function() {
            // this.$el.html('');
            this.$el.append(this.$tdIcon);
            this.$el.append(this.$tdName);
            this.$el.append(this.$tdSize);
            this.$el.append(this.$tdAt);
            this.$el.append(this.$tdActions);
            // this.$el.append(this.$checkbox);
            var contentType = this.model.get('contentType');
            this.$tdIcon.addClass(contentType.substr(0, contentType.indexOf('/')));
            if(contentType.indexOf('image') === 0) {
                if(this.model.get('length') < 1000000) {
                    var $img = $('<img src="'+this.model.getFilenameSrc()+'" />');
                    this.$tdIcon.html($img);
                } else {
                    // too large to download on render
                }
            } else {
                this.$tdIcon.html('<span class="contentTypeIcon"><span class="glyphicon"> </span></span>');
                this.$tdIcon.find('.glyphicon').addClass('glyphicon-'+this.model.getContentTypeGlphyicon());
            }
            // this.$panelBody.append(this.$extraInfo);
            // this.$el.append('<span class="filename" title="'+this.model.get('filename')+'"><a href="/api/files/'+this.model.get('filename')+'" target="_blank">'+this.model.get('filename')+'</a></span>');
            this.$tdName.attr('title', this.model.get('filename'));
            this.$tdName.html('<a href="/api/files/'+encodeURIComponent(this.model.get('filename'))+'" target="_blank">'+this.model.get('filename')+'</a>');
            // this.$tdName.append(this.$filename);
            
            this.$tdSize.html(this.model.getLengthFormatted());
            // this.$caption.html('');
            // this.$caption.append('<span class="contentType">'+this.model.get('contentType')+'</span>');
            // this.$caption.append('<span class="contentLength">'+this.model.getLengthFormatted()+'</span>');
            // this.$panelFoot.append(this.$caption);
            
            var $at = $('<a href="'+this.model.getNavigateUrl()+'" class="uploadDate">'+this.model.get('uploadDate')+'</a>');
            if(window.clock) {
                $at.attr('title', clock.moment(this.model.get('uploadDate')).format('LLLL'));
                $at.html(clock.moment(this.model.get('uploadDate')).calendar());
            }
            this.$tdAt.html($at);
            if(this.model.has('metadata')) {
                var meta = this.model.get('metadata');
                var $ei = this.$el.find('.extraInfo').html('<h3>Metadata</h3>');
                if(this.model.get('metadata').owner) {
                    // $byline.append('<span class="owner"> by '+this.model.get('metadata').owner.name+'</span>');
                }
                if(meta.refs) {
                    var refs = '';
                    for(var r in meta.refs) {
                        var ref = meta.refs[r];
                        var refUrl = '/'+ref.col+'/id/'+ref.id;
                        refs = refs + '<div class="ref"><a href="'+refUrl+'" target="_blank">'+ref.col+' '+ref.id+'</a></div>';
                    }
                    $ei.append('<div class="refs"><h4>Refs</h4>'+refs+'</div>');
                }
                if(meta.src) {
                    $ei.append('<div class="src"><h4>Src</h4>'+meta.src+'</div>');
                }
                if(meta.srcUrl) {
                    $ei.append('<div class="srcUrl"><h4>Src URL</h4>'+meta.srcUrl+'</div>');
                }
                if(meta.exif) {
                    var resStr = '';
                    for(var fieldName in meta.exif) {
                        var v = meta.exif[fieldName];
                        resStr = resStr + fieldName+': '+v+'\n';
                    }
                    $ei.append('<div class="exif"><h4>Exif</h4><pre>'+resStr+'</pre></div>');
                }
                if(meta.responseHeaders) {
                    var resStr = '';
                    for(var fieldName in meta.responseHeaders) {
                        var v = meta.responseHeaders[fieldName];
                        resStr = resStr + fieldName+': '+v+'\n';
                    }
                    $ei.append('<div class="responseHeaders"><h4>Response Headers</h4><pre>'+resStr+'</pre></div>');
                }
            }
            // this.$panelFoot.append(this.$byline);
            this.$tdActions.append(this.fileActions.render().$el);
            
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "clickSelect",
          "touchstart input": "touchstartstopprop",
          "click .byline a": "clickByline"
        },
        clickByline: function() {
            this.model.collection.trigger('goToNavigatePath', this.model);
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.options.hasOwnProperty('list')) {
                this.options.list.trigger('selected', this);
            }
        },
        deselect: function() {
            this.$el.removeClass("selected");
            this.$el.removeAttr('selected');
            if(this.options.hasOwnProperty('list')) {
                this.options.list.trigger('deselected', this);
            }
        },
        clickSelect: function(e) {
            var self = this;
            var $et = $(e.target);
            if($et.parents('.actions').length) {
            } else {
                // One click to select, another to deselect.  Can only have one selection at a time.
                // if(this.hasOwnProperty('list') && this.list.hasOwnProperty('multiSelect') && this.list.multiSelect) {
                    // this.$el.addClass("selected");
                    // this.$el.attr("selected", true);
                // } else {
                
                    var deselectSiblings = function(el) {
                        el.siblings().removeClass('selected');
                        el.siblings().removeAttr('selected');
                    }
                    
                    if(this.$el.hasClass('selected')) {
                        this.deselect();
                        // Un Filter the Actions List
                        //body.actionsListView.filterSession(false);
                        //this.trigger('select', true);
                    } else {
                        // deselectSiblings(this.$el);
                        this.select();
                        //this.trigger('select', false);
                    }
                    
                // }
                // this.trigger('resize');
            }
        },
        remove: function() {
            if(this.$el.hasClass('selected')) {
                this.deselect();
            }
            this.$el.remove();
        }
    });
    
    var FileAvatar = Backbone.View.extend({
        tagName: "span",
        className: "fileAvatar panel panel-default",
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            var opts = {
                model: this.model, 
                actionOptions: {
                    fav: {fieldName: 'metadata.fav'},
                    tags: {fieldName: 'metadata.tags'},
                    groups: {fieldName: 'metadata.groups'}
                }
            }
            if(this.model.get('metadata').src) {
                var src = this.model.get('metadata').src;
                var modelName = src.substr(0, src.length-1);
                opts.actionOptions.more = {
                    "deleteSrc": {
                        title: "Delete "+modelName,
                        glyphicon: 'trash',
                        action: function(model) {
                            if(confirm("Are you sure that you want to delete the source "+modelName+"?")) {
                                console.log(typeof model.url);
                                console.log(model.url);
                                model.url = model.url() + '/src';
                                // model.url = model.url+'/src';
                                // return;
                                model.destroy({success: function(model, response) {
                                  console.log('deleted src');
                                }, 
                                error: function(model, response) {
                                    console.log(arguments);
                                },
                                wait: true});
                            }
                        }
                    }
                }
            }
            this.fileActions = new utils.ModelActionsView(opts);
            this.fileActions.on('goToTagName', function(tagName){
                app.collection.view.tagsView.tagSelectView.selectTagByName(tagName);
            });
            this.$panelHead = $('<div class="panel-heading"></div>');
            this.$panelBody = $('<div class="panel-body"></div>');
            this.$panelFoot = $('<div class="panel-footer"></div>');
            // this.$checkbox = $('<input type="checkbox" name="select" />');
            this.$caption = $('<span class="caption"></span>');
            this.$byline = $('<span class="byline"></span>');
            this.$extraInfo = $('<div class="extraInfo"><h3>Metadata</h3></div>');
            this.$icon = $('<span class="contentIcon"></span>');
            this.$filename = $('<span class="filename"></span>');
        },
        render: function() {
            // this.$el.html('');
            this.$el.append(this.$panelHead);
            this.$el.append(this.$panelBody);
            this.$el.append(this.$panelFoot);
            // this.$el.append(this.$checkbox);
            var contentType = this.model.get('contentType');
            this.$icon.addClass(contentType.substr(0, contentType.indexOf('/')));
            if(contentType.indexOf('image') === 0) {
                if(this.model.get('length') < 1000000) {
                    var $img = $('<img src="'+this.model.getFilenameSrc()+'" />');
                    this.$icon.html($img);
                } else {
                    // too large to download on render
                }
            } else {
                this.$icon.html('<span class="contentTypeIcon"><span class="glyphicon"> </span></span>');
                this.$icon.find('.glyphicon').addClass('glyphicon-'+this.model.getContentTypeGlphyicon());
            }
            this.$panelBody.append(this.$icon);
            this.$panelBody.append(this.$extraInfo);
            // this.$el.append('<span class="filename" title="'+this.model.get('filename')+'"><a href="/api/files/'+this.model.get('filename')+'" target="_blank">'+this.model.get('filename')+'</a></span>');
            this.$filename.attr('title', this.model.get('filename'));
            this.$filename.html('<a href="/api/files/'+encodeURIComponent(this.model.get('filename'))+'" target="_blank">'+this.model.get('filename')+'</a>');
            this.$panelHead.append(this.$filename);
            
            this.$caption.html('');
            // this.$caption.find('.glyphicon').addClass('glyphicon-'+this.model.getContentTypeGlphyicon());
            this.$caption.append('<span class="contentType">'+this.model.get('contentType')+'</span>');
            this.$caption.append('<span class="contentLength">'+this.model.getLengthFormatted()+'</span>');
            this.$panelFoot.append(this.$caption);
            
            var $at = $('<a href="'+this.model.getNavigateUrl()+'" class="uploadDate">'+this.model.get('uploadDate')+'</a>');
            if(window.clock) {
                $at.attr('title', clock.moment(this.model.get('uploadDate')).format('LLLL'));
                $at.html(clock.moment(this.model.get('uploadDate')).calendar());
            }
            this.$byline.html($at);
            if(this.model.has('metadata')) {
                var meta = this.model.get('metadata');
                var $ei = this.$el.find('.extraInfo').html('<h3>Metadata</h3>');
                if(this.model.get('metadata').owner) {
                    // $byline.append('<span class="owner"> by '+this.model.get('metadata').owner.name+'</span>');
                }
                if(meta.refs) {
                    var refs = '';
                    for(var r in meta.refs) {
                        var ref = meta.refs[r];
                        var refUrl = '/'+ref.col+'/id/'+ref.id;
                        refs = refs + '<div class="ref"><a href="'+refUrl+'" target="_blank">'+ref.col+' '+ref.id+'</a></div>';
                    }
                    $ei.append('<div class="refs"><h4>Refs</h4>'+refs+'</div>');
                }
                if(meta.src) {
                    $ei.append('<div class="src"><h4>Src</h4>'+meta.src+'</div>');
                }
                if(meta.srcUrl) {
                    $ei.append('<div class="srcUrl"><h4>Src URL</h4>'+meta.srcUrl+'</div>');
                }
                if(meta.exif) {
                    var resStr = '';
                    for(var fieldName in meta.exif) {
                        var v = meta.exif[fieldName];
                        resStr = resStr + fieldName+': '+v+'\n';
                    }
                    $ei.append('<div class="exif"><h4>Exif</h4><pre>'+resStr+'</pre></div>');
                }
                if(meta.responseHeaders) {
                    var resStr = '';
                    for(var fieldName in meta.responseHeaders) {
                        var v = meta.responseHeaders[fieldName];
                        resStr = resStr + fieldName+': '+v+'\n';
                    }
                    $ei.append('<div class="responseHeaders"><h4>Response Headers</h4><pre>'+resStr+'</pre></div>');
                }
            }
            this.$panelFoot.append(this.$byline);
            this.$el.append(this.fileActions.render().$el);
            
            
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "clickSelect",
          "touchstart input": "touchstartstopprop",
          "click .byline a": "clickByline"
        },
        clickByline: function() {
            this.model.collection.trigger('goToNavigatePath', this.model);
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.options.hasOwnProperty('list')) {
                this.options.list.trigger('selected', this);
            }
        },
        deselect: function() {
            this.$el.removeClass("selected");
            this.$el.removeAttr('selected');
            if(this.options.hasOwnProperty('list')) {
                this.options.list.trigger('deselected', this);
            }
        },
        clickSelect: function(e) {
            var self = this;
            var $et = $(e.target);
            if($et.parents('.actions').length) {
            } else {
                // One click to select, another to deselect.  Can only have one selection at a time.
                // if(this.hasOwnProperty('list') && this.list.hasOwnProperty('multiSelect') && this.list.multiSelect) {
                    // this.$el.addClass("selected");
                    // this.$el.attr("selected", true);
                // } else {
                
                    var deselectSiblings = function(el) {
                        el.siblings().removeClass('selected');
                        el.siblings().removeAttr('selected');
                    }
                    
                    if(this.$el.hasClass('selected')) {
                        this.deselect();
                        // Un Filter the Actions List
                        //body.actionsListView.filterSession(false);
                        //this.trigger('select', true);
                    } else {
                        // deselectSiblings(this.$el);
                        this.select();
                        //this.trigger('select', false);
                    }
                    
                // }
                // this.trigger('resize');
            }
        },
        remove: function() {
            if(this.$el.hasClass('selected')) {
                this.deselect();
            }
            this.$el.remove();
        }
    });
    
    var FileFullView = Backbone.View.extend({
        tagName: "span",
        className: "file",
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            var opts = {
                model: this.model, 
                actionOptions: {
                    fav: {fieldName: 'metadata.fav'},
                    tags: {fieldName: 'metadata.tags'},
                    groups: {fieldName: 'metadata.groups'},
                    share: true,
                }
            }
            if(this.model.get('metadata').src) {
                var src = this.model.get('metadata').src;
                var modelName = src.substr(0, src.length-1);
                opts.actionOptions.more = {
                    "deleteSrc": {
                        title: "Delete "+modelName,
                        glyphicon: 'trash',
                        action: function(model) {
                            if(confirm("Are you sure that you want to delete the source "+modelName+"?")) {
                                console.log(typeof model.url);
                                console.log(model.url);
                                model.url = model.url() + '/src';
                                // model.url = model.url+'/src';
                                // return;
                                model.destroy({success: function(model, response) {
                                  console.log('deleted src');
                                }, 
                                error: function(model, response) {
                                    console.log(arguments);
                                },
                                wait: true});
                            }
                        }
                    }
                }
            }
            this.fileActions = new utils.ModelActionsView(opts);
            this.fileActions.on('goToTagName', function(tagName){
                app.collection.view.tagsView.tagSelectView.selectTagByName(tagName);
            });
            this.$panelHead = $('<div class="panel-heading"></div>');
            this.$panelBody = $('<div class="panel-body"></div>');
            this.$panelFoot = $('<div class="panel-footer"></div>');
            // this.$checkbox = $('<input type="checkbox" name="select" />');
            this.$caption = $('<span class="caption"></span>');
            this.$byline = $('<span class="byline"></span>');
            this.$extraInfo = $('<div class="extraInfo"><h3>Metadata</h3></div>');
            this.$icon = $('<span class="contentIcon"></span>');
            this.$filename = $('<span class="filename"></span>');
        },
        render: function() {
            // this.$el.html('');
            this.$el.append(this.$panelHead);
            this.$el.append(this.$panelBody);
            this.$el.append(this.$panelFoot);
            // this.$el.append(this.$checkbox);
            var contentType = this.model.get('contentType');
            this.$icon.addClass(contentType.substr(0, contentType.indexOf('/')));
            if(contentType.indexOf('image') === 0) {
                if(this.model.get('length') < 1000000) {
                    var $img = $('<img src="'+this.model.getFilenameSrc()+'" />');
                    this.$icon.html($img);
                } else {
                    // too large to download on render
                    // var $img = $('<img src="'+this.model.getFilenameSrc()+'" />');
                    // this.$icon.html('<span class="loadMedia">Image is '+this.model.getLengthFormatted()+', <button>Load</button>.</span>');
                }
            } else if(contentType.indexOf('audio') === 0) {
                this.$media = $('<audio src="'+this.model.getFilenameSrc()+'" preload="metadata" controls></audio>');
                this.$icon.html(this.$media);
            } else if(contentType.indexOf('video') === 0) {
                this.$media = $('<video src="'+this.model.getFilenameSrc()+'" preload="metadata" controls></video>');
                this.$icon.html(this.$media);
            } else {
                this.$icon.html('<span class="contentTypeIcon"><span class="glyphicon"> </span></span>');
                this.$icon.find('.glyphicon').addClass('glyphicon-'+this.model.getContentTypeGlphyicon());
            }
            this.$panelBody.append(this.$icon);
            this.$panelBody.append(this.$extraInfo);
            // this.$el.append('<span class="filename" title="'+this.model.get('filename')+'"><a href="/api/files/'+this.model.get('filename')+'" target="_blank">'+this.model.get('filename')+'</a></span>');
            this.$filename.attr('title', this.model.get('filename'));
            this.$filename.html('<a href="/api/files/'+encodeURIComponent(this.model.get('filename'))+'" target="_blank">'+this.model.get('filename')+'</a>');
            this.$panelBody.append(this.$filename);
            
            this.$caption.html('');
            // this.$caption.find('.glyphicon').addClass('glyphicon-'+this.model.getContentTypeGlphyicon());
            this.$caption.html('<span class="contentTypeIcon"><span class="glyphicon"> </span></span>');
            this.$caption.find('.glyphicon').addClass('glyphicon-'+this.model.getContentTypeGlphyicon());
            this.$caption.append('<span class="contentType">'+this.model.get('contentType')+'</span>');
            
            
            this.$caption.append('<span class="contentLength">'+this.model.getLengthFormatted()+'</span>');
            this.$panelFoot.append(this.$caption);
            
            var $at = $('<a href="'+this.model.getNavigateUrl()+'" class="uploadDate">'+this.model.get('uploadDate')+'</a>');
            if(window.clock) {
                $at.attr('title', clock.moment(this.model.get('uploadDate')).format('LLLL'));
                $at.html(clock.moment(this.model.get('uploadDate')).calendar());
            }
            this.$byline.html($at);
            if(this.model.has('metadata')) {
                var meta = this.model.get('metadata');
                var $ei = this.$el.find('.extraInfo').html('<h3>Metadata</h3>');
                if(this.model.get('metadata').owner) {
                    // $byline.append('<span class="owner"> by '+this.model.get('metadata').owner.name+'</span>');
                }
                if(meta.refs) {
                    var refs = '';
                    for(var r in meta.refs) {
                        var ref = meta.refs[r];
                        var refUrl = '/'+ref.col+'/id/'+ref.id;
                        refs = refs + '<div class="ref"><a href="'+refUrl+'" target="_blank">'+ref.col+' '+ref.id+'</a></div>';
                    }
                    $ei.append('<div class="refs"><h4>Refs</h4>'+refs+'</div>');
                }
                if(meta.src) {
                    $ei.append('<div class="src"><h4>Src</h4>'+meta.src+'</div>');
                }
                if(meta.srcUrl) {
                    $ei.append('<div class="srcUrl"><h4>Src URL</h4>'+meta.srcUrl+'</div>');
                }
                if(meta.exif) {
                    var resStr = '';
                    for(var fieldName in meta.exif) {
                        var v = meta.exif[fieldName];
                        resStr = resStr + fieldName+': '+v+'\n';
                    }
                    $ei.append('<div class="exif"><h4>Exif</h4><pre>'+resStr+'</pre></div>');
                }
                if(meta.responseHeaders) {
                    var resStr = '';
                    for(var fieldName in meta.responseHeaders) {
                        var v = meta.responseHeaders[fieldName];
                        resStr = resStr + fieldName+': '+v+'\n';
                    }
                    $ei.append('<div class="responseHeaders"><h4>Response Headers</h4><pre>'+resStr+'</pre></div>');
                }
            }
            this.$panelFoot.append(this.$byline);
            this.$el.append(this.fileActions.render().$el);
            
            
            this.setElement(this.$el);
            return this;
        },
        events: {
          "touchstart input": "touchstartstopprop",
          "click .byline a": "clickByline"
        },
        clickByline: function() {
            this.model.collection.trigger('goToNavigatePath', this.model);
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.options.hasOwnProperty('list')) {
                this.options.list.trigger('selected', this);
            }
        },
        deselect: function() {
            this.$el.removeClass("selected");
            this.$el.removeAttr('selected');
            if(this.options.hasOwnProperty('list')) {
                this.options.list.trigger('deselected', this);
            }
        },
        clickSelect: function(e) {
            var self = this;
            var $et = $(e.target);
            if($et.parents('.actions').length) {
            } else {
                // One click to select, another to deselect.  Can only have one selection at a time.
                // if(this.hasOwnProperty('list') && this.list.hasOwnProperty('multiSelect') && this.list.multiSelect) {
                    // this.$el.addClass("selected");
                    // this.$el.attr("selected", true);
                // } else {
                
                    var deselectSiblings = function(el) {
                        el.siblings().removeClass('selected');
                        el.siblings().removeAttr('selected');
                    }
                    
                    if(this.$el.hasClass('selected')) {
                        this.deselect();
                        // Un Filter the Actions List
                        //body.actionsListView.filterSession(false);
                        //this.trigger('select', true);
                    } else {
                        // deselectSiblings(this.$el);
                        this.select();
                        //this.trigger('select', false);
                    }
                    
                // }
                // this.trigger('resize');
            }
        },
        remove: function() {
            if(this.$el.hasClass('selected')) {
                this.deselect();
            }
            this.$el.remove();
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
            // xhr.upload.addEventListener("progress", function(){
            //     console.log(arguments);
            // }, false);
            // xhr.onprogress = function(e) {
            //     console.log('onprogress')
            //     console.log(e)
            // }
            xhr.upload.onprogress = function(e) {
                // console.log(e);
                if (e.lengthComputable) {
                    self.trigger('progress', {localfile: blobOrFile, loaded: e.loaded, total: e.total});
                }
            };
            xhr.open("POST", "/api/files", true);
            xhr.setRequestHeader('Cache-Control', 'no-cache');
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
            this.dragTxt = 'Drag files here';
            this.dropTxt = 'Drop files';
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
            this.$el.html(this.dragTxt);
            this.$el.removeClass('dragover');
            this.trigger('dragleave');
            return false;
        },
        handleDragEnter: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            this.$el.html(this.dropTxt);
            this.$el.addClass('dragover');
            this.trigger('dragover');
            e.originalEvent.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
            return false;
        },
        handleDragLeave: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            this.$el.html(this.dragTxt);
            this.$el.removeClass('dragover');
            this.trigger('dragleave');
            return false;
        },
        remove: function() {
            this.$el.remove();
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
                console.log(progress);
                var name = progress.localfile.name;
                var $file = self.$uploadFileList.find('[data-filename="'+name+'"]');
                $file.find('.progress').show();
                var per = Math.floor((progress.loaded / progress.total) * 100);
                $file.find('.progress-bar').css('width', per+'%');
                
                if(filesize) {
                    $file.find('.size').html(filesize(progress.total, {unix: true}));
                } else {
                    $file.find('.size').html(progress.total);
                }
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
            this.uploadDragDrop.on('dragover', function() {
                self.$el.addClass('dragover');
            });
            this.uploadDragDrop.on('dragleave', function() {
                self.$el.removeClass('dragover');
            });
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
            
            $localFile.append('<div class="progress progress-striped active"><div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"><span class="sr-only">0% Complete</span></div></div>');
            $localFile.append('<span class="size"></span>');
            
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