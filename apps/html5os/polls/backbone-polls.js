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
            
            var qcolOpts = { poll: this };
            attr.qs = attr.qs || [];
            this.qsCollection = new QsCollection(attr.qs, qcolOpts);
            
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        findQById: function(id, callback) {
            if(callback) {
                callback(this.qsCollection.get(id));
            }
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
    
    var QModel = Backbone.House.Model.extend({
        collectionName: "polls",
        initialize: function(attr, options) {
            this.addViewType(PollQsView, 'avatar');
            // this.addViewType(QFormView, 'form');
            options = options || {};
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        getNavigatePath: function() {
            return 'id/'+this.options.poll.id+'/'+this.get('rank');
        },
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
    
    var QsCollection = Backbone.House.Collection.extend({
        model: QModel,
        socket: false,
        // collectionName: 'qs',
        // url: '/api/polls',
        sortField: 'rank',
        url: function() {
            return "/api/polls/" + this.options.poll.id + "/qs";
        },
        // comparator: function(a) {
        //     return a.get("rank");
        // }
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
            var self = this;
            var formOpts = {
                collection: window.pollsCollection,
                model: this.model,
                submit: true,
                cancel: true,
                // delete: true
            };
            formOpts.fields = {
                "title": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "poll title",
                    className: "form-control"
                },
                "desc": {
                    validateType: 'string',
                    tagName: 'textarea',
                    placeholder: "general details about the poll.",
                    className: "form-control"
                },
            }
            self.formView = window.pollsCollection.getNewFormView(formOpts);
            self.formView.on('saved', function(model){
                self.trigger('saved', model);
            });
            self.formView.on('cancelled', function(model){
                self.trigger('saved', model);
            });
            self.formView.on('deleted', function(model){
                self.trigger('saved', model);
            });
            
            self.questionsView = self.model.qsCollection.getView({
                // layout: 'row',
                selection: false,
                mason: false,
                loadOnRenderPage: false,
            });
            
            self.$navTabs = $('<ul class="nav nav-tabs">\
    <li class="active"><a href="#' + self.cid + '-basic" data-toggle="tab">Basic Info</a></li>\
    <li><a href="#' + self.cid + '-questions" data-toggle="tab">Questions</a></li>\
    <li><a href="#' + self.cid + '-responses" data-toggle="tab"><span class="responseCount"></span> Responses</a></li>\
</ul>');
            self.$tabContent = $('<div class="tab-content">\
    <div class="tab-pane active basic" id="' + self.cid + '-basic"></div>\
    <div class="tab-pane questions row" id="' + self.cid + '-questions"><div class="questions-list col-md-12">\
        <label>Questions</label><div class="questions-form-list"></div><div class="new-question-form"></div>\
    </div></div>\
    <div class="tab-pane responses row" id="' + self.cid + '-responses"></div>\
</div>');
            
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        renderQuestionsTab: function() {
            var self = this;
            var qsModel = this.model.qsCollection.getNewModel();
            qsModel.set('rank', self.model.qsCollection.length + 1, {silent: true});
            
            var newQuestionFormOpts = {
                collection: self.model.qsCollection,
                model: qsModel,
                submit: 'Add Question',
                cancel: false,
                delete: false,
                formClassName: 'form-inline'
            };
            newQuestionFormOpts.fields = {
                "title": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "question title",
                    className: "form-control"
                },
                "type": {
                    validateType: 'string',
                    placeholder: "type of poll.",
                    className: "form-control"
                },
            }
            
            this.newQuestionView = window.pollsCollection.getNewFormView(newQuestionFormOpts);
            self.formView.on('saved', function(model){
                self.trigger('saved', model);
            });
            self.formView.on('cancelled', function(model){
                self.trigger('saved', model);
            });
            
            self.$tabContent.find('.questions-list').append(self.questionsView.render().$el);
            self.$tabContent.find('.new-question-form').append(this.newQuestionView.render().$el);
        },
        render: function(tab) {
            var self = this;
            this.$el.append(self.$navTabs);
            this.$el.append(self.$tabContent);
            self.$tabContent.find('.basic').append(this.formView.render().$el);
            this.renderQuestionsTab();
            if(tab) {
                if(tab === 'questions') {
                    this.tabToQuestions();
                }
            }
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        tabToBasic: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-basic"]');
            $el.parent('li').removeClass('disabled');
            if(this.$el.parent().length === 0) {
                this.$tabContent.find('.active').removeClass('active');
                this.$tabContent.find('.basic').addClass('active');
            }
            $el.tab('show');
        },
        tabToQuestions: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-questions"]');
            $el.parent('li').removeClass('disabled');
            if(this.$el.parent().length === 0) {
                this.$tabContent.find('.active').removeClass('active');
                this.$tabContent.find('.questions').addClass('active');
            }
            $el.tab('show');
        },
        tabToResponses: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-responses"]');
            $el.parent('li').removeClass('disabled');
            if(this.$el.parent().length === 0) {
                this.$tabContent.find('.active').removeClass('active');
                this.$tabContent.find('.responses').addClass('active');
            }
            $el.tab('show');
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
            
            var $at = $('<a href="'+this.model.getNavigateUrl()+'" class="createdAt">'+this.model.get('at')+'</a>');
            if(window.clock) {
                $at.attr('title', clock.moment(this.model.get('at')).format('LLLL'));
                $at.html(clock.moment(this.model.get('at')).calendar());
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
    
    var PollQsView = Backbone.View.extend({
        tagName: "div",
        className: "menuItemSku",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$e = $('<div class="itemSku row">\
    <div class="skuId col-md-2"></div>\
    <div class="name col-xs-6"></div>\
    <div class="price col-xs-2"><a href="#" title="Change Price"></a></div>\
    <div class="actions col-xs-2"></div>\
</div>');
            
            var opts = {
                model: this.model, 
                actionOptions: {
                    collectionFriendlyName: 'question',
                    fav: false,
                    detail: false,
                    // fav: {fieldName: 'fav'},
                    // tags: {fieldName: 'tags'},
                    // groups: {fieldName: 'groups'},
                    // share: true,
                }
            }
            opts.actionOptions.more = {
                // "editName": {
                //     title: "Edit Name",
                //     glyphicon: 'pencil',
                //     action: function(model) {
                //         self.setName();
                //         return false;
                //     }
                // },
                // "moveUp": {
                //     title: "Move Up",
                //     glyphicon: 'arrow-up',
                //     action: function(model) {
                //         self.moveUp();
                //         return false;
                //     }
                // },
                // "setDuration": {
                //     title: "Set Duration",
                //     glyphicon: 'time',
                //     action: function(model) {
                //         self.setDuration();
                //         return false;
                //     }
                // },
                // "setRepeat": {
                //     title: "Set Repeat",
                //     glyphicon: 'repeat',
                //     action: function(model) {
                //         self.setRepeat();
                //         return false;
                //     }
                // },
                // "setDefault": {
                //     title: "Set as Default",
                //     glyphicon: 'certificate',
                //     action: function(model) {
                //         self.setAsDefault();
                //         return false;
                //     }
                // },
            }
            this.actionsView = new utils.ModelActionsView(opts);
        },
        render: function() {
            this.$el.append(this.$e);
            if(this.model.get('default')) {
                this.$e.find('.skuId').html('<b>'+this.model.id+'</b>');
            } else {
                this.$e.find('.skuId').html(this.model.id);
            }
            if(this.model.has("name")) {
                this.$e.find('.name').html('<span class="text">'+this.model.get("name")+'</span><span class="moreInfo"><span class="duration"></span><span class="repeat"></span></span>');
            }
            if(this.model.has('duration')) {
                this.$e.find('.duration').html('<button class="btn btn-link glyphicon glyphicon-time"></button>');
                var duration = this.model.get('duration');
                this.$e.find('.duration button').attr('title', this.getDurationStr());
                // this.$e.find('.duration button').html(this.getDurationStr());
            }
            if(this.model.has('repeat')) {
                this.$e.find('.repeat').html('<button class="btn btn-link glyphicon glyphicon-repeat"></button>');
                var repeat = this.model.get('repeat');
                this.$e.find('.repeat button').attr('title', this.getRepeatStr());
                // this.$e.find('.duration button').html(this.getDurationStr());
            }
            if(this.model.has('repeat')) {
                
            }
            if(this.model.has("price")) {
                this.$e.find('.price a').html('$' + this.model.get("price"));
            }
            if(account.isAdmin()) {
                // this.$actions = $('<ul class="actions"></ul>');
                // this.$actions.append('<li><button class="setPrice">Set Price</button></li><li><button class="moveUp" title="rank ' + this.model.get("rank") + '">Move Up</button></li><li><button class="remove">Remove</button></li>');
                // if(this.model.has("default")) {
                //     this.$actions.append('<li><button class="removeDefault">Remove as Default</button></li>');
                // } else {
                //     this.$actions.append('<li><button class="setDefault">Set as Default</button></li>');
                // }
                this.$e.find('.actions').append(this.actionsView.render().$el);
            }
            this.$el.attr("data-id", this.model.id);
            this.setElement(this.$el);
            return this;
        },
        events: {
            // click: "select",
            "click .moreInfo .duration": "removeDuration",
            "click .moreInfo .repeat": "removeRepeat",
            "click .price a": "setPrice",
            "click .moveUp": "moveUp",
            "click .remove": "removeit",
            "touchstart input": "touchstartstopprop"
        },
        setName: function() {
            var self = this;
            var newName = prompt("Set SKU name", this.model.get("name"));
            if(newName && newName !== this.model.get("name")) {
                self.model.set({
                    name: newName
                }, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function(s, typeStr, respStr) {
                        self.render();
                        // self.model.collection.sort({
                        //     silent: true
                        // });
                        self.options.list.render();
                    });
                }
            }
            return false;
        },
        setPrice: function(e) {
            var self = this;
            var newPrice = prompt("Set SKU price", this.model.get("price"));
            if(newPrice) {
                self.model.set({
                    price: parseFloat(newPrice)
                }, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                        self.options.list.render();
                    });
                }
                e.stopPropagation();
                e.preventDefault();
            }
            return false;
        },
        getTimeLengthStrFromObj: function(obj) {
            var str = '';
            if(obj.days) {
                if(obj.days === 1) {
                    str = 'daily';
                } else {
                    str = obj.days+ ' days';
                }
            } else if(obj.weeks) {
                if(obj.weeks === 1) {
                    str = 'weekly';
                } else {
                    str = obj.weeks+ ' weeks';
                }
            } else if(obj.months) {
                if(obj.months === 1) {
                    str = 'monthly';
                } else {
                    str = obj.months+ ' months';
                }
            } else if(obj.years) {
                if(obj.years === 1) {
                    str = 'yearly';
                } else {
                    str = obj.years+ ' years';
                }
            }
            return str;
        },
        getDurationStr: function() {
            if(!this.model.get('duration')) {
                return '';
            }
            var duration = this.model.get('duration');
            return this.getTimeLengthStrFromObj(duration);
        },
        getRepeatStr: function() {
            if(!this.model.get('repeat')) {
                return '';
            }
            return this.getTimeLengthStrFromObj(this.model.get('repeat'));
        },
        setDuration: function() {
            var self = this;
            var userStr = prompt("ex. daily, monthly, 3 months", this.getDurationStr());
            if(userStr && userStr !== this.getDurationStr()) {
                userStr = userStr.trim();
                var num = 1;
                if(userStr === 'daily') {
                    userStr = 'days';
                } else if(userStr === 'weekly') {
                    userStr = 'weeks';
                } else if(userStr === 'monthly') {
                    userStr = 'months';
                } else if(userStr === 'yearly') {
                    userStr = 'years';
                } else {
                    var splitUserStr = userStr.split(' ');
                    if(splitUserStr.length > 1) {
                        num = parseInt(splitUserStr[0], 10);
                        userStr = splitUserStr[1];
                    }
                }
                var durationObj = {};
                durationObj[userStr] = num;
                self.model.set({duration: durationObj}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                });
            }
        },
        setRepeat: function() {
            var self = this;
            var userStr = prompt("ex. daily, monthly, 3 months", this.getRepeatStr());
            if(userStr && userStr !== this.getRepeatStr()) {
                userStr = userStr.trim();
                var num = 1;
                if(userStr === 'daily') {
                    userStr = 'days';
                } else if(userStr === 'weekly') {
                    userStr = 'weeks';
                } else if(userStr === 'monthly') {
                    userStr = 'months';
                } else if(userStr === 'yearly') {
                    userStr = 'years';
                } else {
                    var splitUserStr = userStr.split(' ');
                    if(splitUserStr.length > 1) {
                        num = parseInt(splitUserStr[0], 10);
                        userStr = splitUserStr[1];
                    }
                }
                var durationObj = {};
                durationObj[userStr] = num;
                self.model.set({repeat: durationObj}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                });
            }
        },
        removeDuration: function() {
            var self = this;
            if(confirm("Do you want to remove the duration?")) {
                self.model.set({duration: null}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                });
            }
        },
        removeRepeat: function() {
            var self = this;
            if(confirm("Do you want to remove the repeat?")) {
                self.model.set({repeat: null}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                });
            }
        },
        moveUp: function() {
            var self = this;
            self.model.collection.sort({
                silent: true
            });
            var r = self.model.get("rank");
            var sibId = this.$el.prev().attr("data-id");
            if(sibId) {
                var swapModel = self.model.collection.get(sibId);
                if(swapModel) {
                    var higherRank = swapModel.get("rank");
                    if(higherRank == r) {
                        r++;
                    }
                    swapModel.set({
                        rank: r
                    }, {silent: true});
                    var sm = swapModel.save(null, {
                        silent: false,
                        wait: true
                    }).done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                        self.options.list.render();
                    });
                    if(higherRank != self.model.get("rank")) {
                        self.model.set({
                            rank: higherRank
                        }, {silent: true});
                        var s = self.model.save(null, {
                            silent: false,
                            wait: true
                        }).done(function(s, typeStr, respStr) {
                            self.render();
                            self.model.collection.sort({
                                silent: true
                            });
                            self.options.list.render();
                        });
                    }
                }
            }
            return false;
        },
        unsetDefaultForModel: function(model) {
            var self = this;
            model.set({default: null}, {silent: true});
            model.save(null, {
                silent: false,
                wait: true
            }).done(function(s, typeStr, respStr) {
                self.render();
                self.options.list.render();
            });
        },
        setAsDefault: function() {
            var self = this;
            this.model.set({default: true}, {silent: true});
            var s = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(s) {
                s.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                    
                    // unset the rest in the collection
                    self.model.collection.each(function(model){
                        if(model.id !== self.model.id) {
                            self.unsetDefaultForModel(model);
                        }
                    });
                });
            } else {
                self.model.collection.each(function(model){
                    if(model.id !== self.model.id) {
                        self.unsetDefaultForModel(model);
                    }
                });
            }
        },
        removeit: function(e) {
            this.model.destroy();
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if(this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
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
        },
        focus: function() {
            this.formView.focus('title');
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