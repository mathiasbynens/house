(function(){

    var nav = {};
    
    nav.Router = Backbone.Router.extend({
        initialize: function(options) {
            
        },
        routes: {
            "_=_": "gohome",
            "_-_": "gohome",
            "": "root",
        },
        gohome: function() {
            this.navigate('', {trigger: true, replace: true});
        },
        reset: function() {
            this.setTitle('');
            this.trigger('reset');
            nav.list.hideMenu();
        },
        root: function() {
            this.reset();
            this.trigger('root');
        },
        setTitle: function(title) {
            document.title = title;
            this.trigger('title', title);
        }
    });
    
    nav.router = new nav.Router;

    nav.startRouter = function(root) {
        var historyOptions = {pushState: true, root: root};
        
        if(window.navigator.standalone) {
            historyOptions.silent = true; // lets use our localStorage history instead
        }
        
        if(!Backbone.history.start(historyOptions)) {
            if(window.navigator.standalone) {
                var history = nav.router.localStorageNavigationHistory();
                
                if(history) {
                    nav.router.navigate(history.pop(), true);
                } else {
                    nav.router.navigate('', true);
                }
            } else {
                nav.router.navigate('', true);
            }
        } else {
        }
    }

    var NavItem = Backbone.Model.extend({
        initialize: function() {
        },
        getRow: function(options) {
            if(!this.hasOwnProperty('row')) {
                options.model = this;
                this.row = new NavRow(options);
            }
            return this.row;
        }
    });
    
    var NavCollection = Backbone.Collection.extend({
        model: NavItem,
        initialize: function() {
            var self = this;
        }
    });

    var NavList = Backbone.View.extend({
        tagName: "navigation",
        className: "navList",
        initialize: function() {
            var self = this;
            var openerTxt = this.options.openerTxt || '≡';
            var $ul = this.$ul = $('<menu></menu>');
            this.$open = $('<span class="opener" title="Navigation Menu"><button>'+openerTxt+'</button></span>');
            this.collection.bind("add", function(doc) {
                var view;
                view = doc.getRow({list: self});
                self.appendRow(view);
            });
            this.collection.on('reset', function(){
                self.render();
            });
        },
        render: function() {
            var self = this;
            this.$el.append(this.$open);
            this.$el.append(this.$ul);
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view;
                view = doc.getRow({list: self});
                //self.appendRow(view.render().el);
                self.$ul.append(view.render().el);
            });
            return this;
        },
        events: {
            "click .opener": "toggleMenu"
        },
        toggleMenu: function() {
            var v = this.$ul.css('visibility');
            if(v == 'visible') {
                this.trigger('home');
                this.hideMenu();
            } else {
                this.$ul.css('visibility', 'visible');
            }
        },
        hideMenu: function() {
            this.$ul.css('visibility', 'hidden');
        },
        appendRow: function(row) {
            this.$ul.append(row.render().el);
        },
        deselectAll: function() {
            this.$ul.children().removeAttr('selected');
        }
    });
    
    var NavRow = Backbone.View.extend({
        tagName: "li",
        className: "navRow",
        render: function() {
            var $e = $('<span class="navLink"></span>');
            this.$el.html($e);
            if(this.model.has('title')) {
                $e.append(this.model.get('title'));
            }
            if(this.model.has('el')) {
                $e.append(this.model.get('el'));
            }
            if(this.model.has('class')) {
                this.$el.addClass(this.model.get('class'));
            }
            this.$el.append('<div class="bg"></div>');
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click": "userSelect",
          "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        userSelect: function() {
            this.options.list.hideMenu();
            this.$el.siblings().removeAttr('selected');
            this.select();
            if(this.model.has('navigate')) {
                nav.router.navigate(this.model.get('navigate'), true);
            } else if(this.model.has('href')) {
                window.location = this.model.get('href');
            } else {
                this.options.list.trigger('selected', this);
            }
        },
        select: function() {
            this.$el.attr('selected', 'selected');
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var NavBackButton = Backbone.View.extend({
        tagName: "div",
        className: "navBackButton",
        initialize: function() {
        },
        render: function() {
            this.$el.html('◀');
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
            window.history.back()
        }
    });
    
    nav.init = function(options) {
        if(!options) options = {};
        if(!nav.hasOwnProperty('list')) {
            nav.col = new NavCollection();
            options.collection = nav.col;
            nav.list = new NavList(options);
        }
        
        if(window.navigator.standalone) {
            if(!nav.hasOwnProperty('backButton')) {
                nav.backButton = new NavBackButton();
            }
            $('body').append(nav.backButton.render().$el);
        }
    }
    
    nav.selectByNavigate = function(navName) {
        var navModel = this.col.where({navigate: navName});
        var doc = _.first(navModel);
        if(doc) {
            doc.getRow().select();
        }
    }
    
    nav.unselect = function() {
        this.list.deselectAll();
    }
    
    if(define) {
        define(function () {
            return nav;
        });
    }
})();