(function() {
    var AppView = Backbone.View.extend({
        tag: "body",
        className: "config-app",
        initialize: function() {
            var self = this;
            this.$app = $('<div class="app"></div>');
            require(['/configs/configs.js'], function(Configs) {
                window.Configs = Configs;
                window.configsCollection = new Configs.Collection();
                // window.ordersPendingCollection.filterPending();
                window.configsCollection.load(null, function() {
                    self.initialized = true;
                    self.trigger('initialized', true);
                });
            });
        },
        render: function() {
            var self = this;
            this.$el.append(this.$app);
            this.setElement(this.$el);
            return this;
        },
        userIs: function(userId) {
            return(this.user && this.user.id == userId);
        },
        userIsAdmin: function() {
            return(this.user && this.user.has('groups') && this.user.get('groups').indexOf('admin') !== -1);
        },
        bindAuth: function(auth) {
            var self = this;
            self.auth = auth;
        },
        bindUser: function(user) {
            var self = this;
            self.user = user;
            self.trigger('refreshUser', user);
        },
        bindNav: function(nav) {
            this.nav = nav;
            nav.list.on('home', function() {
                nav.router.navigate('', {
                    trigger: true
                });
            });
            // nav.col.add({
            //     title: "New Config",
            //     navigate: "new",
            //     glyphicon: 'plus'
            // });
            // nav.col.add({title: "Groups", navigate: "groups"}); // , glyphicon: 'list'
            // nav.col.add({title: "Items", navigate: "items"});
            // nav.col.add({title: "New Item", navigate: "items/new", condition: 'isAdmin'});
            // nav.col.add({title: "New Group", navigate: "groups/new", condition: 'isAdmin'});
            this.bindRouter(nav.router);
            if(window.account && (account.isUser() || account.isAdmin())) {}
        },
        addNavForMissingConfigs: function() {
            var self = this;
            // window.configsCollection.each
            // window.configsCollection.getOrFetchKey
            _.each(window.configsCollection.keyNames, function(v,k){
                // window.configsCollection.getOrFetchKey(k, function(configModel){
                    // if(configModel) {
                        
                    // } else {
                        self.nav.col.add({title: k, navigate:"key/"+k});
                    // }
                // })
            });
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            var doFx = false;

            router.on('reset', function() {
                // $('#header').removeAttr('class');
                // self.$el.removeAttr('data-nav');
                if(self.box) {
                    self.box.off('removed');
                    self.box.hide();
                }
                self.nav.unselect();
            });
            router.on('root', function() {
                router.reset();
                // self.loadCollections(function(){
                router.trigger('loadingProgress', 30);
                router.setTitle('');
                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
                self.addNavForMissingConfigs();
                // });
            });

            router.route("key/:key", "key", function(key) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Config '+key);
                self.nav.selectByNavigate('');
                
                // var configModel = window.configsCollection.getNewModel({key: key});
                window.configsCollection.getOrFetchKeys(key, function(configs){
                    var keyForm = new window.configsCollection.keyNames[key]({models: configs});
                    self.box = utils.appendLightBox(keyForm.render().$el, key);
                    self.box.on('removed', function() {
                        self.router.back();
                    });
                    keyForm.on('saved', function(){
                        keyForm.remove();
                        self.router.back();
                    });
                    router.trigger('loadingComplete');
                });
            });
        }
    });
    if(define) {
        define(function() {
            return AppView;
        });
    }
})();