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
                                                                            var hostname = window.location.hostname + (window.location.port ? ':' + window.location.port: '');
                                                                            var windowOrigin = window.origin || '';
                                                                            if(!windowOrigin) {
                                                                                windowOrigin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
                                                                            }
                                                                            $('#bookmarklet').attr('href', $('#bookmarklet_js').html().replace(/\n/gi, '').replace(/\[\[HOST\]\]/g, windowOrigin).trim());
                                                                            $('#bookmarklet').html('✚ '+hostname);
                                                                            
                                                                            $('#bookmarklet-public').attr('href', $('#bookmarklet_js').html().replace(/\n/gi, '').replace(/\[\[HOST\]\]/g, windowOrigin).replace(/urls\/save\//g, 'urls/save/public/').trim());
                                                                            $('#bookmarklet-public').html('⚓ '+hostname); // ⚓
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
