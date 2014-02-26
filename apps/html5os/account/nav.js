(function(){

    var nav = {};
    
    nav.Router = Backbone.Router.extend({
        initialize: function(options) {
            this.routesHit = 0;
            Backbone.history.on('route', function() { this.routesHit++; }, this);
        },
        routes: {
            "_=_": "gohome",
            "_-_": "gohome",
            "": "root"
        },
        gohome: function(root) {
            this.navigate('', {trigger: true, replace: false});
            if(root) {
                this.root();
            }
        },
        reset: function() {
            this.setTitle('');
            this.trigger('reset');
            if(nav.list) {
                nav.list.hideMenu();
            }
        },
        root: function() {
            this.reset();
            this.trigger('root');
        },
        setTitle: function(title) {
            document.title = title;
            this.trigger('title', title);
        },
        back: function() {
            if(this.routesHit > 1) {
              window.history.back();
            } else {
              this.navigate('', {trigger: true});
            }
        }
    });
    
    nav.router = new nav.Router();

    nav.startRouter = function(root) {
        var historyOptions = {pushState: true, root: root};
        
        if(window.navigator.standalone) {
            historyOptions.silent = true; // lets use our localStorage history instead
        }
        if(window.historyStarted) {
            return;
        }
        window.historyStarted = true;
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
        initialize: function() {
            var self = this;
            // var openerTxt = this.options.openerTxt || '≡';
            // this.$open = $('<span class="opener" title="Navigation Menu"><button>'+openerTxt+'</button></span>');
            this.$menu = this.$el.find('#siteNav');
            this.collection.bind("add", function(doc) {
                //self.appendRow(doc.getRow({list: self}));
                self.appendDoc(doc);
            });
            this.collection.on('reset', function(){
                self.render();
            });
        },
        render: function() {
            var self = this;
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                //self.appendRow(doc.getRow({list: self, el: $row}));
                self.appendDoc(doc);
            });
            return this;
        },
        events: {
            "click .homeBtn": "goHome",
            "click .pageTitle": "titleClick"
        },
        goHome: function() {
            $('body')[0].scrollTop = 0;
            nav.router.gohome(true);
            return false;
        },
        titleClick: function(e) {
            this.trigger('titleClick');
            return false;
        },
        toggleMenu: function() {
        },
        hideMenu: function() {
        },
        showMenu: function() {
        },
        appendDoc: function(doc) {
            var row;
            if(!doc.hasOwnProperty('row')) {
                if(!doc.id) {
                    doc.id = utils.slugStr(doc.get('title'));
                }
                var $row = $('#nav-'+doc.id);
                if($row.length === 0) {
                    $row = $('<li id="nav-'+doc.id+'"></li>');
                    this.$menu.append($row);
                } else {
                    // $row.html('');
                }
                row = doc.getRow({list: this, el: $row});
            } else {
                row = doc.getRow();
            }
            this.appendRow(row);
        },
        appendRow: function(row) {
            if(row.model.has('renderCondition')) {
                var c = row.model.get('renderCondition');
                if(c == 'isAdmin') {
                    if(window.account && (!account.isUser() || !account.isAdmin())) {
                        return false;
                    }
                } else if(c == 'isUser') {
                    if(window.account && (!account.isUser())) {
                        return false;
                    }
                } else {
                    // remove
                    row.remove();
                    return false;
                }
            } else {
            }
            
            row.render();
        },
        deselectAll: function() {
            //this.$ul.children().removeAttr('selected');
        }
    });
    
    var NavDropdownList = Backbone.View.extend({
        tagName: "ul",
        className: "dropdown-menu",
        initialize: function() {
            var self = this;
            this.collection.bind("add", function(doc) {
                self.appendDoc(doc);
            });
            this.collection.on('reset', function(){
                self.render();
            });
        },
        render: function() {
            var self = this;
            this.collection.each(function(doc){
                self.appendDoc(doc);
            });
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        appendDoc: function(doc) {
            var row;
            if(!doc.hasOwnProperty('row')) {
                var $row = $('<li></li>');
                this.$el.append($row);
                row = doc.getRow({list: this, el: $row});
            } else {
                row = doc.getRow();
            }
            this.appendRow(row);
        },
        appendRow: function(row) {
            if(row.model.has('renderCondition')) {
                var c = row.model.get('renderCondition');
                if(c == 'isAdmin') {
                    if(window.account && (!account.isUser() || !account.isAdmin())) {
                        return false;
                    }
                } else if(c == 'isUser') {
                    if(window.account && (!account.isUser())) {
                        return false;
                    }
                } else {
                    // remove
                    row.remove();
                    return false;
                }
            } else {
            }
            
            row.render();
        }
    });
    //<ul class="dropdown-menu" id="accountMenu">
      //<!--- <li><a href="#">Action</a></li> -->
    //</ul>
    var NavRow = Backbone.View.extend({
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.$e = $('<a href="#"></a>');
            if(this.$el.find('a').length) {
                this.$e = this.$el.find('a'); 
            }
            console.log(this.$e.html())
        },
        render: function() {
            this.setElement(this.$el);
            // this.$e.html('');
            this.$el.append(this.$e);
            
            if(this.model.has('a')) {
                if(this.$e.html() !== this.model.get('a')+' ') {
                    this.$e.append(this.model.get('a')+' ');
                }
                if(this.model.has('title')) {
                    this.$e.attr('title', this.model.get('title'));
                }
            } else if(this.model.has('title')) {
                this.$e.append(this.model.get('title')+' ');
                if(this.model.has('navigate')) {
                    this.$e.attr('href', this.model.get('navigate'));
                } else if(this.model.has('href')) {
                    this.$e.attr('href', this.model.get('href'));
                }
            }
            if(this.model.has('subNav')) {
                this.$el.addClass('dropdown');
                this.$e.addClass('dropdown-toggle');
                this.$e.attr('data-toggle', 'dropdown');
                if(this.model.has('glyphicon')) {
                    this.$e.append('<span class="glyphicon glyphicon-'+this.model.get('glyphicon')+'"></span> ');
                } else if(!this.model.has('title')) {
                    this.$e.append('<span class="glyphicon glyphicon-th"></span> ');
                }
                if(!this.model.has('caret') || this.model.get('caret')) {
                    this.$e.append('<b class="caret"></b>');
                }
                
                if(!this.model.subNav) {
                    //console.log(this.options.list.collection)
                    this.model.subNavCol = new NavCollection();
                    this.model.subNavCol.list = new NavDropdownList({collection: this.model.subNavCol});
                    this.$el.append(this.model.subNavCol.list.render().$el);
                }
                
            } else {
                if(this.model.has('glyphicon')) {
                    this.$e.append('<span class="glyphicon glyphicon-'+this.model.get('glyphicon')+'"></span> ');
                }
            }
            if(this.model.has('el')) {
                this.$e.append(this.model.get('el'));
            }
            if(this.model.has('class')) {
                this.$e.addClass(this.model.get('class'));
            }
            //this.$el.append('<div class="bg"></div>');
            return this;
        },
        events: {
          "click": "userSelect",
          "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        userSelect: function(e) {
            this.$el.siblings().removeAttr('selected');
            this.select();
            if(this.model.has('navigate')) {
                nav.router.navigate(this.model.get('navigate'), {trigger: true});
            } else if(this.model.has('href')) {
                window.location = this.model.get('href');
            } else if(!this.model.subNav) {
                this.options.list.trigger('selected', this);
            }
            e.preventDefault();
        },
        select: function() {
            this.$el.attr('selected', 'selected');
        },
        remove: function() {
            this.$el.remove();
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
            nav.router.back();
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