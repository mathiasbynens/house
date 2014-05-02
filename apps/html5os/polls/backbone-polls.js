(function() {
    
    var Model = Backbone.House.Model.extend({
        collectionName: "polls",
        initialize: function(attr, options) {
            this.TableRowView = TableRowView;
            this.RowView = RowView;
            this.AvatarView = AView;
            this.FullView = FullView;
            this.AView = AView;
            options = options || {};
            options.ownerFieldName = 'owner';
            
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        slugStr: function(str) {
            return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
        },
        setSlug: function(slug) {
            this.set('slug', this.slugStr(slug));
        },
        getNavigatePath: function() {
            if(this.has('slug')) {
                return this.get('slug');
            } else {
                return 'id/'+this.id;
            }
        },
        getNavigatePathVote: function() {
            if(this.has('slug')) {
                return this.get('slug')+'/vote';
            } else {
                return 'id/'+this.id+'/vote';
            }
        },
        getFormView: function() {
            if(!this.formView) {
                this.formView = new FormView({model: this});
            }
            return this.formView;
        }
    });
    
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'polls',
        url: '/api/polls',
        sortField: 'at-',
        getOrFetchSlug: function(slug, callback) {
            this.getOrFetchByField('slug', slug, callback);
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
    
    var AView = Backbone.View.extend({
        tagName: "span",
        className: "poll",
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
                this.$el.append('<a target="_blank" href="/polls/'+this.model.getNavigatePath()+'" class="title">'+this.model.get('title')+'</a>');
            }
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click a": "clickA"
        },
        clickA: function(e) {
            window.location = $(e.target).attr('href');
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var FullView = Backbone.View.extend({
        tagName: "div",
        className: "poll-full-view",
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
                this.$el.append('<a target="_blank" href="/polls/'+this.model.getNavigatePath()+'" class="title">'+this.model.get('title')+'</a>');
            }
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click a": "clickA"
        },
        clickA: function(e) {
            window.location = $(e.target).attr('href');
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var TableRowView = Backbone.View.extend({
        tagName: "tr",
        className: "poll-row",
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            var opts = {
                model: this.model, 
                actionOptions: {
                    fav: {fieldName: 'fav'},
                    tags: {fieldName: 'tags'},
                    groups: {fieldName: 'groups'},
                    detail: true,
                    share: true,
                }
            }
            opts.actionOptions.more = {
                "takePoll": {
                    title: "Take Poll",
                    glyphicon: 'play-circle',
                    action: function(model) {
                        app.nav.router.navigate('poll/'+model.getNavigatePathVote(), {trigger: true});
                    }
                }
            }
            this.actions = new utils.ModelActionsView(opts);
            this.actions.on('goToTagName', function(tagName){
                app.collection.view.tagsView.tagSelectView.selectTagByName(tagName);
            });
            
            this.$tdIcon = $('<td class="icon"></td>');
            this.$tdTitle = $('<td class="title"></td>');
            this.$tdDesc = $('<td class="desc"></td>');
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
            this.$el.append(this.$tdTitle);
            this.$el.append(this.$tdSize);
            this.$el.append(this.$tdAt);
            this.$el.append(this.$tdActions);
            // this.$el.append(this.$checkbox);
            // var contentType = this.model.get('contentType');
            // this.$tdIcon.addClass(contentType.substr(0, contentType.indexOf('/')));
            // if(contentType.indexOf('image') === 0) {
            //     if(this.model.get('length') < 1000000) {
            //         var $img = $('<img src="'+this.model.getFilenameSrc()+'" />');
            //         this.$tdIcon.html($img);
            //     } else {
            //         // too large to download on render
            //     }
            // } else {
            //     this.$tdIcon.html('<span class="contentTypeIcon"><span class="glyphicon"> </span></span>');
            //     this.$tdIcon.find('.glyphicon').addClass('glyphicon-'+this.model.getContentTypeGlphyicon());
            // }
            // this.$panelBody.append(this.$extraInfo);
            // this.$el.append('<span class="filename" title="'+this.model.get('filename')+'"><a href="/api/files/'+this.model.get('filename')+'" target="_blank">'+this.model.get('filename')+'</a></span>');
            this.$tdTitle.attr('title', this.model.get('title'));
            this.$tdTitle.html(this.model.get('title'));
            // this.$tdName.html('<a href="/api/files/'+encodeURIComponent(this.model.get('filename'))+'" target="_blank">'+this.model.get('filename')+'</a>');
            // this.$tdName.append(this.$filename);
            
            // this.$tdSize.html(this.model.getLengthFormatted());
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
            this.$tdActions.append(this.actions.render().$el);
            
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

    var RowView = Backbone.View.extend({
        tagName: "div",
        className: "poll row",
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            //this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append(this.$headerStyle);
            var $byline = $('<div class="entry-meta col-md-8 col-md-offset-2"></div>');
            var $permalink = $('<a href="'+this.model.getNavigatePath()+'" title="Permalink" rel="bookmark"><time class="entry-date" datetime="2013-09-17T09:36:07+00:00"></time></a>');
            var $at = $('<span class="date"><span class="glyphicon glyphicon-time"></span> </span>');
            $at.append($permalink);
            $byline.append($at);
            
            if(this.model.get('avatar')) {
                var avatarImage = this.model.get('avatar');
                var $avatarImg = $('<img class="avatar" src="/api/files/'+encodeURIComponent(avatarImage.filename)+'" />');
                this.$el.append($avatarImg);
            }
            
            if(this.model.has('title')) {
                this.$el.append('<div class="entry-header col-md-8 col-md-offset-2"><h1 class="entry-title"><a href="'+this.model.getNavigatePath()+'">'+this.model.get('title')+'</a></h1></div>');
                $permalink.attr('title', 'Permalink to '+this.model.get('title'));
            }
            
            if(this.model.has('at')) {
                if(window.clock) {
                    var m = clock.moment(this.model.get('at'));
                    $permalink.find('time').attr('datetime', m.format("YYYY-MM-DDTHH:mm:ssZZ"));
                    $at.attr('title', m.format('LLLL'));
                    $permalink.find('time').html(m.calendar());
                } else {
                    $permalink.find('time').html(this.model.get('at'));
                }
            }
            
            if(this.model.has('owner')) {
                $byline.append('<span class="author vcard"><span class="glyphicon glyphicon-user"></span> <a class="url fn n" href="by/'+this.model.get('owner').name+'" title="View all posts by '+this.model.get('owner').name+'" rel="author">'+this.model.get('owner').name+'</a></span>');
                this.model.getOwner(function(owner){
                    self.author = owner;
                    if(owner) {
                    }
                });
            }
            
            if(this.model.has('resCount')) {
                var count = this.model.get('resCount');
            }
            
            this.$el.append($byline);
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select",
          "click .title a": "goToDetail",
        },
        goToDetail: function() {
            this.model.collection.trigger('goToNavigatePath', this.model);
            return false;
        },
        select: function(e) {
            // var deselectSiblings = function(el) {
            //     el.siblings().removeClass('selected');
            //     el.siblings().removeAttr('selected');
            // }
            // deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.hasOwnProperty('list')) {
                this.list.selectedPost = this;
                this.list.trigger('select', this);
            }
            this.trigger('select');
            this.trigger('resize');
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "poll-form",
        initialize: function() {
            // console.log(this.options);
            // console.log(this.model);
            var self = this;
            // if(this.model && this.model.id) {
            //     this.$el.attr('data-id', this.model.id);
            // } else {
            //     if(!this.model) {
            //         this.model = new Model({}, {
            //             collection: this.collection
            //         });
            //     } else {
            //     }
            // }
            
            var formOpts = {
                collection: window.pollsCollection,
                model: this.model,
                submit: 'Save',
                cancel: 'Cancel',
                delete: true
            };
            // formOpts.beforeSubmit = function(form){
            //     if(self.filteredByTodoList) {
            //         var todoList = self.filteredByTodoList;
            //         var setDoc = {};
            //         setDoc.list = {
            //             id: todoList.id,
            //             name: todoList.get('name')
            //         }
            //         form.model.set(setDoc, {silent: true});
            //     }
            // };
            formOpts.fields = {
                "title": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "next todo item",
                    className: "form-control"
                },
                "desc": {
                    validateType: 'string',
                    tagName: 'textarea',
                    placeholder: "details",
                    className: "form-control"
                },
            }
            self.formView = new window.pollsCollection.getFormView(formOpts);
            self.formView.on('saved', function(todo){
                self.trigger('saved', todo);
            });
            self.formView.on('cancelled', function(todo){
                self.trigger('saved', todo);
            });
            self.formView.on('deleted', function(todo){
                self.trigger('saved', todo);
            });
        },
        render: function() {
            var self = this;
            
            this.$el.append(self.formView.render().$el);
            
            this.setElement(this.$el);
            return this;
        },
        events: {
            // "submit form": "submit"
        },
        // submit: function() {
        //     var self = this;
        // },
        // clear: function() {
        //     this.$inputTitle.val('');
        // },
        // focus: function() {
        //     this.$inputTitle.focus();
        // },
        remove: function() {
            this.$el.remove();
        }
    });
   
    if(define) {
        define(function () {
            return {
                Collection: Collection,
                Model: Model,
                // List: ListView,
                Row: RowView,
                // Avatar: AvatarView,
                Full: FullView,
                AView: AView,
                Form: FormView
            }
        });
    }
})();