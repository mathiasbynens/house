(function(){

    var nav = {};
    
    nav.Router = Backbone.Router.extend({
        initialize: function(options) {
            
        },
        routes: {
            "_=_": "gohome",
            "_-_": "gohome",
            "": "root",
            "about": "about",
            "help": "help"
        },
        gohome: function() {
            this.navigate('', true);
        },
        about: function() {
            alert('we\'re awesome');
        },
        help: function() {
            alert('we\'re here to help');
        },
        reset: function() {
            $('.lightbox').hide();
            $('#container').children().hide();
            $('header h1').html('');
        },
        root: function() {
            this.nav();
        },
        nav: function() {
            this.reset();
            this.setTitle('Home');
            $('nav').show();
        },
        setTitle: function(title) {
            $('header h1').html(title);
        }
    });
    
    nav.router = new nav.Router;

    nav.startRouter = function() {
        var historyOptions = {pushState: true, root: "/images/"};
        
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
        render: function() {
            var self = this;
            
            //this.$el.html('');
            
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
        initialize: function() {
            var self = this;
            
            var $ul = this.$ul = $('<ul></ul>');
            
            this.collection.bind("add", function(doc) {
                var view;
                view = doc.getRow({list: self});
                self.appendRow(view);
            });
            
            this.collection.on('reset', function(){
                self.render();
            });
        },
        appendRow: function(row) {
            this.$ul.append(row.render().el);
        }
    });
    
    var NavRow = Backbone.View.extend({
        tagName: "li",
        className: "navRow",
        render: function() {
            var $e = $('<span class="navLink"></span>');
            this.$el.html($e);
            if(this.model.has('title')) {
                $e.append('<h2>'+this.model.get('title')+'</h2>');
            }
            if(this.model.has('el')) {
                $e.append(this.model.get('el'));
            }
            if(this.model.has('class')) {
                this.$el.addClass(this.model.get('class'));
            }
            return this;
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        events: {
          "click": "select",
          "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if(this.model.has('navigate')) {
                nav.router.navigate(this.model.get('navigate'), true);
            } else if(this.model.has('href')) {
                window.location = this.model.get('href');
            } else {
                this.options.list.trigger('selected', this);
            }
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    


    nav.render = function(el) {
        if(!nav.hasOwnProperty('list')) {
            nav.col = new NavCollection();
            nav.list = new NavList({el: el, collection: nav.col});
        }
        nav.list.render();
    }
    
    if(define) {
        define(function () {
            return nav;
        });
    }
})();