(function() {
    
    var Model = Backbone.House.Model.extend({
        collectionName: "polls",
        initialize: function(attr, options) {
            this.TableRowView = TableRowView;
            this.RowView = RowView;
            this.AvatarView = AView;
            this.FullView = FullView;
            this.AView = AView;
            
            this.addViewType(PollView, 'poll');
            this.addViewType(ResultsView, 'results');
            
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
            this.addViewType(PollQResultView, 'result');
            // this.addViewType(QFormView, 'form');
            options = options || {};
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        getNavigatePath: function() {
            return 'id/'+this.options.poll.id+'/'+this.get('rank');
        },
        getSessionResponse: function(callback) {
            var self = this;
            var whereObj = {'poll_id': this.options.poll.id};
            if(account.isUser()) {
                whereObj.user_id = account.get('user');
            } else {
                whereObj.session_id = account.id;
            }
            
            window.pollResCollection.findOrFetchWhere(whereObj, function(models){
                if(models && models.length > 0) {
                    if(callback) {
                        callback(_.first(models));
                    }
                } else {
                    // make a new poll response for this user sesssion
                    var newModel = window.pollResCollection.getNewModel({poll_id: self.options.poll.id});
                    
                    var saveModel = newModel.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function(s, typeStr, respStr) {
                            if(callback) {
                                callback(newModel);
                            }
                        });
                    }
                }
            });
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
    
    var QsCollection = Backbone.House.Collection.extend({
        model: QModel,
        socket: false,
        pageSize: 0,
        // collectionName: 'qs',
        // url: '/api/polls',
        collectionName: 'qs',
        sortField: 'rank',
        url: function() {
            return "/api/polls/" + this.options.poll.id + "/qs";
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
    
    var choicesObject = {
        "text": "Text",
        "number": "Number",
        "textarea": "Textarea",
        "booleanYesNo": "Yes No",
        "booleanTrueFalse": "True False",
        "choiceRadio": "Radio Select",
        "choiceCheckboxes": "Checkboxes",
        "singleSelect": "Single Select",
        "multipleSelect": "Multiple Select",
    }
    
    var ResultsView = Backbone.View.extend({
        tagName: "div",
        className: "poll-view",
        initialize: function(options) {
            var self = this;
            self.questionsView = self.model.qsCollection.getView({
                layout: 'result',
                headerEl: false,
                selection: false,
                mason: false,
                loadOnRenderPage: false,
            });
        },
        events: {
        },
        render: function(tab) {
            var self = this;
            
            this.$el.append(self.questionsView.render().$el);
            
            this.$el.attr('data-id', this.model.id);
            this.setElement(this.$el);
            return this;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var PollView = Backbone.View.extend({
        tagName: "div",
        className: "poll-view",
        initialize: function(options) {
            this.$paddles = $('<div class="prevNext"><div class="col-xs-4">\
                                    <button class="btn btn-link btn-block prev">Prev</button>\
                                </div>\
                                <div class="col-xs-4 col-xs-offset-4">\
                                    <button class="btn btn-primary btn-block next">Next</button>\
                                </div></div>');
            this.$question = $('<div class="current-question"></div>');
            this.atIndex = 0;
            this.$questionResponse = $('<div class="questionResponse col-md-6 col-md-offset-3"><div class="form-group"></div></div>');
            this.$thankyou = $('<h1>Thank you!</h1>');
        },
        events: {
            "click .next": "clickNext",
            "click .prev": "clickPrev",
            "click .yesNoToggle .off": "clickToggleOff",
            "click .yesNoToggle .on": "clickToggleOn",
        },
        clickNext: function() {
            var self = this;
            this.saveCurrentQuestionResponse(function(){
                if(self.model.qsCollection.length === self.atIndex + 1) {
                    self.renderThankyou();
                    self.trigger('complete');
                } else {
                    self.atIndex++;
                    self.renderQuestion();
                }
            });
        },
        clickPrev: function() {
            this.atIndex--;
            this.renderQuestion();
        },
        clickToggleOff: function(e) {
            var $et = $(e.currentTarget);
            $et.parent('.yesNoToggle').addClass('left').removeClass('right');
        },
        clickToggleOn: function(e) {
            var $et = $(e.currentTarget);
            $et.parent('.yesNoToggle').addClass('right').removeClass('left');
        },
        saveCurrentQuestionResponse: function(callback) {
            var self = this;
            // this.currentQuestion
            var val;
            var type = this.currentQuestion.get('type');
            if(type === 'text') {
                val = this.$questionResponse.find('input').val();
            } else if(type === 'textarea') {    
                val = this.$questionResponse.find('textarea').val();
            } else if(type === 'number') {
                val = this.$questionResponse.find('input')[0].valueAsNumber; // .val()
            } else if(type === 'booleanYesNo') {
                var $toggle = this.$questionResponse.find('.yesNoToggle');
                if($toggle.hasClass('left')) {
                    val = false;
                } else if($toggle.hasClass('right')) {
                    val = true;
                }
            }
            
            if(self.currentQuestionResponse) {
                self.currentQuestionResponse.qsCollection.getOrFetch(self.currentQuestion.id, function(model){
                    if(!model) {
                        model = self.currentQuestionResponse.qsCollection.getNewModel({_id: self.currentQuestion.id});
                    }
                    model.set('vote', val, {silent: true});
                    var saveModel = model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function(s, typeStr, respStr) {
                            if(callback) {
                                callback();
                            }
                        });
                    } else {
                        if(callback) {
                            callback();
                        }
                    }
                });
            } else {
                if(callback) {
                    callback();
                }
            }
        },
        renderQuestion: function() {
            var self = this;
            this.currentQuestion = this.model.qsCollection.at(this.atIndex);
            if(this.currentQuestion) {
                this.$question.html('');
                this.$question.append('<h1 class="question-title text-center">'+this.currentQuestion.get('title')+'</h1>');
                var type = this.currentQuestion.get('type');
                if(type === 'text') {
                    this.$questionResponse.find('.form-group').html('<input type="text" name="response-'+this.currentQuestion.id+'" class="form-control input-lg">');
                } else if(type === 'textarea') {    
                    this.$questionResponse.find('.form-group').html('<textarea type="text" name="response-'+this.currentQuestion.id+'" class="form-control input-lg"></textarea>');
                } else if(type === 'number') {
                    this.$questionResponse.find('.form-group').html('<input type="number" min=0 name="response-'+this.currentQuestion.id+'" class="form-control input-lg">');
                } else if(type === 'booleanYesNo') {
                    this.$questionResponse.find('.form-group').html('<div class="yesNoToggle"><span class="bulb"> </span> <span class="off">No</span> <span class="on">Yes</span></div>');
                }
                
                this.$question.append(this.$questionResponse);
                this.currentQuestion.getSessionResponse(function(pollRes){
                    if(pollRes) {
                        console.log(pollRes)
                        self.currentQuestionResponse = pollRes;
                        var pollResQs = self.currentQuestionResponse.qsCollection.get(self.currentQuestion.id);
                        console.log(pollResQs)
                        if(pollResQs && pollResQs.has('vote')) {
                            console.log(voteVal)
                            var voteVal = pollResQs.get('vote');
                            
                            if(type === 'text') {
                                self.$questionResponse.find('input').val(voteVal);
                            } else if(type === 'textarea') {    
                                self.$questionResponse.find('textarea').val(voteVal);
                            } else if(type === 'number') {
                                self.$questionResponse.find('input').val(voteVal);
                            } else if(type === 'booleanYesNo') {
                                if(voteVal === true) {
                                    self.$questionResponse.find('.yesNoToggle').addClass('right').removeClass('left');
                                } else if(voteVal === false) {
                                    self.$questionResponse.find('.yesNoToggle').addClass('left').removeClass('right');
                                }
                            }
                        }
                    }
                });
            }
            
            if(this.atIndex === 0) {
                this.$paddles.find('.prev').hide();
            } else {
                this.$paddles.find('.prev').show();
            }
            if(this.model.qsCollection.length === this.atIndex+1) {
                this.$paddles.find('.next').html('Finish');//hide();
            } else {
                this.$paddles.find('.next').html('Next').show();
            }
        },
        renderThankyou: function() {
            this.$question.remove();
            this.$paddles.remove();
            this.$el.append(this.$thankyou.show());
        },
        render: function(tab) {
            var self = this;
            
            this.$el.append(this.$question);
            this.$el.append(this.$paddles);
            this.$thankyou.hide();
            
            this.renderQuestion();
            
            this.$el.attr('data-id', this.model.id);
            this.setElement(this.$el);
            return this;
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
        <div class="questions-form-list"></div><hr><div class="new-question-form"></div>\
    </div></div>\
    <div class="tab-pane responses" id="' + self.cid + '-responses"></div>\
</div>');
            
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        renderQuestionsTab: function() {
            var self = this;
            
            this.resetNewQuestionFrom();
            this.renderQuestionForm();
            this.$tabContent.find('.questions-form-list').append(this.questionsView.render().$el);
        },
        renderQuestionForm: function() {
            this.$tabContent.find('.new-question-form').html('').append(this.newQuestionView.render().$el);
        },
        resetNewQuestionFrom: function() {
            var self = this;
            var qsModel = this.model.qsCollection.getNewModel();
            qsModel.set('rank', self.model.qsCollection.length + 1, {silent: true});
            var newQuestionFormOpts = {
                collection: self.model.qsCollection,
                model: qsModel,
                submit: 'Add Question',
                cancel: false,
                delete: false,
                formClassName: ''
            };
            
            newQuestionFormOpts.fields = {
                "title": {
                    label: "Question",
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "What's the answer to the question of life?",
                    className: "form-control"
                },
                "type": {
                    choices: choicesObject,
                    label: "Poll Type",
                    className: ""
                },
            }
            if(this.newQuestionView) {
                this.newQuestionView.remove();
            }
            
            this.newQuestionView = window.pollsCollection.getNewFormView(newQuestionFormOpts);
            self.newQuestionView.on('saved', function(model){
                // self.trigger('saved', model);
                self.resetNewQuestionFrom();
                self.renderQuestionForm();
            });
            self.newQuestionView.on('cancelled', function(model){
                self.resetNewQuestionFrom();
                self.renderQuestionForm();
            });
        },
        renderResponsesTab: function() {
            var self = this;
            window.pollResCollection.fetchWhere({'poll_id': this.model.id}, function(models){
                if(models) {
                    console.log(models)
                    var responseListView = window.pollResCollection.getView({
                        layout: 'row',
                        selection: false,
                        mason: false,
                        loadOnRenderPage: false,
                    });
                    self.$tabContent.find('.responses').append(responseListView.render().$el);
                }
            });
        },
        render: function(tab) {
            var self = this;
            this.$el.append(self.$navTabs);
            this.$el.append(self.$tabContent);
            self.$tabContent.find('.basic').append(this.formView.render().$el);
            this.renderQuestionsTab();
            this.renderResponsesTab();
            if(tab) {
                if(tab === 'questions') {
                    this.tabToQuestions();
                } else if(tab === 'responses') {
                    this.tabToResponses();
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
                        app.nav.router.navigate(model.getNavigatePathVote(), {trigger: true});
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
            this.$tdResCount = $('<td class="resCount"></td>');
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
            this.$el.append(this.$tdResCount);
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
            
            if(this.model.has('resCount')) {
                var count = this.model.get('resCount');
                this.$tdResCount.html(count);
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
    
    var PollQResultView = Backbone.View.extend({
        tagName: "div",
        className: "pollQ-result col-md-4",
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$e = $('<div class="questionResult">\
    <div class="title col-md-12 text-center"></div>\
    <div class="resAverage col-xs-12 text-center"></div>\
</div>');
        },
        render: function() {
            this.$el.append(this.$e);
            
            if(this.model.has("title")) {
                this.$e.find('.title').html(this.model.get("title"));
            }
            if(this.model.has("type")) {
            }
            if(this.model.has('resAverage')) {
                var count = this.model.get('resAverage');
                this.$e.find('.resAverage').html(count);
            }
            if(this.model.has('resPercent')) {
                var count = this.model.get('resPercent');
                // this.$e.find('.resAverage').html(count*100 + '%');
                
                var deg = 360 * count;
                
                this.$e.find('.resAverage').html('<style>\
                .pieContainer {\
                      height: 100px;\
                 }\
                 .pieBackground {\
                      background-color: grey;\
                      position: absolute;\
                      width: 100px;\
                      height: 100px;\
                      -moz-border-radius: 50px;\
                      -webkit-border-radius: 50px;\
                      -o-border-radius: 50px;\
                      border-radius: 50px;\
                      -moz-box-shadow: -1px 1px 3px #000;\
                      -webkit-box-shadow: -1px 1px 3px #000;\
                      -o-box-shadow: -1px 1px 3px #000;\
                      box-shadow: -1px 1px 3px #000;\
                 }\
                    .pie {\
                          position: absolute;\
                          width: 100px;\
                          height: 100px;\
                          -moz-border-radius: 50px;\
                          -webkit-border-radius: 50px;\
                          -o-border-radius: 50px;\
                          border-radius: 50px;\
                          clip: rect(0px, 50px, 100px, 0px);\
                     }\
                     .positiveSlice {\
                          position: absolute;\
                          width: 100px;\
                          height: 100px;\
                          -moz-border-radius: 50px;\
                          -webkit-border-radius: 50px;\
                          -o-border-radius: 50px;\
                          border-radius: 50px;\
                          clip: rect(0px, 100px, 100px, 50px);\
                     }\
                     .pie-'+this.cid+' .positiveSlice .pie {\
                          background-color: #1b458b;\
                          -webkit-transform:rotate('+deg+'deg);\
                          -moz-transform:rotate('+deg+'deg);\
                          -o-transform:rotate('+deg+'deg);\
                          transform:rotate('+deg+'deg);\
                     }\
                    </style>\
                    <div class="pieContainer pie-'+this.cid+'">\
                         <div class="pieBackground"></div>\
                         <div class="positiveSlice"><div class="pie"></div></div>\
                    </div>');
            }
            if(this.model.has("resCount")) {
                this.$e.find('.resCount').html(this.model.get("resCount"));
            }
            
            
            /// TODO GRAPH
            
            this.$el.attr("data-id", this.model.id);
            this.setElement(this.$el);
            return this;
        },
        events: {
            // click: "select",
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
    
    var PollQsView = Backbone.View.extend({
        tagName: "div",
        className: "pollQView",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$e = $('<div class="question row">\
    <div class="rank col-md-1"></div>\
    <div class="title col-md-5"></div>\
    <div class="type col-xs-2"></div>\
    <div class="resAverage col-xs-1"></div>\
    <div class="resCount col-xs-1"></div>\
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
                "editQuestion": {
                    title: "Edit Question",
                    glyphicon: 'pencil',
                    action: function(model) {
                        self.setTitle();
                        return false;
                    }
                },
                "moveUp": {
                    title: "Move Up",
                    glyphicon: 'arrow-up',
                    action: function(model) {
                        self.moveUp();
                        return false;
                    }
                },
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
            
            var prev = this.model.prev();
            var rank = this.model.get("rank");
            
            if(this.model.has("rank")) {
                this.$e.find('.rank').html(rank+'.');
            }
            if(this.model.has("title")) {
                this.$e.find('.title').html(this.model.get("title"));
            }
            if(this.model.has("type")) {
                this.$e.find('.type').html(choicesObject[this.model.get("type")]);
            }
            if(this.model.has('resAverage')) {
                var count = this.model.get('resAverage');
                this.$e.find('.resAverage').html(count);
            }
            if(this.model.has('resPercent')) {
                var count = this.model.get('resPercent');
                this.$e.find('.resAverage').html(count*100 + '%');
            }
            if(this.model.has("resCount")) {
                this.$e.find('.resCount').html(this.model.get("resCount"));
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
        setTitle: function() {
            var self = this;
            var newVal = prompt("Set title", this.model.get("title"));
            if(newVal && newVal !== this.model.get("title")) {
                self.model.set({
                    title: newVal
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
                        // self.render();
                        // self.model.collection.sort({
                        //     silent: true
                        // });
                        // self.options.list.render();
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