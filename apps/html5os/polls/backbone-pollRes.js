(function() {
    
    var Model = Backbone.House.Model.extend({
        collectionName: "pollRes",
        initialize: function(attr, options) {
            options = options || {};
            options.ownerFieldName = 'owner';
            this.addViewType(RowView, 'row');
            
            var qcolOpts = { pollRes: this };
            attr.qs = attr.qs || [];
            this.qsCollection = new QsCollection(attr.qs, qcolOpts);
            
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        getPollModel: function(callback) {
            window.pollsCollection.getOrFetch(this.get('poll_id'), callback);
        }
    });
    
    var QModel = Backbone.House.Model.extend({
        collectionName: "pollRes",
        initialize: function(attr, options) {
            // this.addViewType(PollQsView, 'avatar');
            // this.addViewType(QFormView, 'form');
            this.addViewType(QRowView, 'row');
            options = options || {};
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
    });
    
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'pollRes',
        url: '/api/pollRes',
        sortField: 'at-',
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
            return "/api/pollRes/" + this.options.pollRes.id + "/qs";
        },
    });
   
   var RowView = Backbone.View.extend({
        tagName: "div",
        className: "pollRes row",
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            //this.actions = new ActionsView({id: this.id, model: this.model});
            
            this.$user = $('<span class="user"></span>');
            this.$qs = $('<span class="qs"></span>');
        },
        render: function() {
            var self = this;
            this.$el.html('');
            
            if(this.model.has('user_id')) {
                window.usersCollection.getOrFetch(this.model.get('user_id'), function(user){
                    self.$user.html(user.getNewAvatarNameView().render().$el);
                });
            } else if(this.model.has('session_id')) {
                this.$user.html(this.model.get('session_id'));
            }
            if(this.model.has('qs')) {
                this.$qs.append(this.model.qsCollection.getView({
                    layout: 'row',
                    selection: false,
                    mason: false,
                    loadOnRenderPage: false,
                }).render().$el);
            }
            this.$el.append(this.$user);
            this.$el.append(this.$qs);
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select",
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
    
    var QRowView = Backbone.View.extend({
        tagName: "div",
        className: "pollResQuestion", 
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            //this.actions = new ActionsView({id: this.id, model: this.model});
            
            this.$q = $('<span class="questionTitle"></span>');
            this.$a = $('<span class="answer"></span>');
        },
        render: function() {
            var self = this;
            this.$el.html('');
            
            // console.log(this.model.options.pollRes.qsCollection.get(this.model.id))
            this.model.options.pollRes.getPollModel(function(pollModel){
                // console.log(pollModel)
                if(pollModel) {
                    var qs = pollModel.qsCollection.get(self.model.id);
                    self.$q.html(qs.get('title'));
                }
            });
            this.$a.html(this.model.get('vote'));
            this.$el.append(this.$q);
            this.$el.append(this.$a);
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select",
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
   
    if(define) {
        define(function () {
            return {
                Collection: Collection,
                Model: Model,
            }
        });
    }
})();