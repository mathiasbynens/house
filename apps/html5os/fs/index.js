(function() {
    var index = {};
    index.init = function(callback) {
        require([ "/fs/wysihtml-parser_rules.js" ], function() {
            require([ "/fs/wysihtml5-0.4.0pre.min.js" ], function() {
                require([ "/desktop/jquery.js" ], function() {
                    $(document).ready(function() {
                        require([ "/desktop/underscore.js" ], function() {
                            require([ "/desktop/backbone.js" ], function() {
                                require([ "/desktop/backbone-house.js" ], function() {
                                    require([ "/desktop/utils.js" ], function(utils) {
                                        window.utils = utils;
                                        require([ "/clock/clock.js" ], function(Clock) {
                                            window.clock = new Clock;
                                            clock.on("init", function() {
                                                
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
                                                            require([ "/fs/fs.js" ], function(FS) {
                                                                window.onbeforeunload = function() {
                                                                    return "Are you sure that you want to leave?";
                                                                }
                                                                window.fs = new FS();
                                                                fs.bindUser(accountProfile.loginStatus.getView().userModel);
                                                                fs.on("initialized", function() {
                                                                    $("body").append(fs.render().$el);
                                                                    fs.bindNav(nav);
                                                                    // account.bindRouter(nav.router);
                                                                    nav.startRouter("/fs/");
                                                                    if (callback) callback(fs);
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
    };
    if (define) {
        define(function() {
            return index;
        });
    }
})();