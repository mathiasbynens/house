(function() {
    var index = {};
    index.init = function(callback) {
        require(['/desktop/jquery.js'], function() {
            require(["/desktop/jquery.scrollTo.min.js"], function() {
                require(['/pages/bootstrap.js'], function() {
                    $(document).ready(function() {
                        require(['/desktop/underscore.js'], function() {
                            require(['/desktop/backbone.js'], function() {
                                require(['/desktop/backbone-house.js'], function() {
                                    require(['/desktop/utils.js'], function(utils) {
                                        window.utils = utils;
                                        require(['/clock/clock.js'], function(Clock) {
                                            window.clock = new Clock();
                                            clock.on('init', function() {
                                                require(['/account/account.js'], function(accountProfile) {
                                                    accountProfile.auth(function() {
                                                        accountProfile.setElement($('#siteMenu')).render();
                                                        account.getView().onNavInit(function(nav) {
                                                            index.nav = nav;
                                                            nav.router.on('loading', function() {
                                                                $('body').addClass('loading');
                                                            });
                                                            nav.router.on('loadingComplete', function() {
                                                                $('body').removeClass('loading');
                                                            });
                                                            require(['/images/images.js'], function(ImagesApp) {
                                                                window.app = new ImagesApp({
                                                                    el: $('body')[0]
                                                                }); 
                                                                app.on('initialized', function() {
                                                                    app.render();
                                                                    app.bindNav(nav);
                                                                    accountProfile.bindRouter(nav.router);
                                                                    nav.startRouter('/images/');
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
                            });
                        });
                    });
                });
            });
        });
    }

    if(define) {
        define(function() {
            return index;
        });
    }
})();