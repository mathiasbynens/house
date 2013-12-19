(function(){
    var index = {};
    index.init = function(callback) {
        require(['/desktop/jquery.js'], function(){
            require([ "/desktop/jquery.scrollTo.min.js" ], function() {
                require(['/pages/bootstrap.js'], function(){
                    $(document).ready(function() {
                        // require(['/posts/wysihtml-parser_rules.js'], function(){
                        //     require(['/posts/wysihtml5-0.4.0pre.min.js'], function(){
                                require(['/desktop/underscore.js'], function(){
                                    require(['/desktop/backbone.js'], function(){
                                        require(['/desktop/backbone-house.js'], function(){
                                            require(['/desktop/utils.js'], function(utils){
                                                window.utils = utils;
                                                require(['/clock/clock.js'], function(Clock) {
                                                    window.clock = new Clock();
                                                    clock.on('init', function(){
                                                        require(['/account/account.js'], function(accountProfile){
                                                            accountProfile.auth(function(){
                                                                accountProfile.setElement($('#siteMenu')).render();
                                                                account.getView().onNavInit(function(nav){
                                                                    index.nav = nav;
                                                                    nav.router.on('loading', function(){
                                                                        $('body').addClass('loading');
                                                                    });
                                                                    nav.router.on('loadingComplete', function(){
                                                                        $('body').removeClass('loading');
                                                                    });
                                                                    require(['/urls/urls.js'], function(UrlsApp) {
                                                                        window.app = new UrlsApp({el: $('body')[0]});
    
                                                                        app.on('initialized', function(){
                                                                            app.render();
                                                                            var view = app.getWidgetView();
                                                                            $('#bookmarklet').attr('href', $('#bookmarklet_js').html().replace(/\n/gi, '').replace(/HOSTNAME/g, window.location.hostname).trim());
                                                                            $('#bookmarklet').html('✚ '+window.location.host || window.location.hostname);
                                                                            //$('body').append(view.render().$el);
                                                                            //$('body').append(app.collection.getView().render().$el);
                                                                        
                                                                        //posts.bindUser(accountProfile.loginStatus.getView().userModel);
                                                                            app.bindNav(nav);
                                                                            accountProfile.bindRouter(nav.router);
                                                                            nav.startRouter('/urls/');
                                                                            if(callback) callback(app);
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                //     });
                                // });
                            });
                        });
                    });
                });
            });
        });
    }
    
    if(define) {
        define(function () {
            return index;
        });
    }
})();
