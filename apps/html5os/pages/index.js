(function() {
    var index = {};
    index.init = function(callback) {
        require([ "/desktop/jquery.js" ], function() {
            $(document).ready(function() {
            require([ "/pages/wysihtml-parser_rules.js" ], function() {
                require([ "/pages/wysihtml5-0.4.0pre.min.js" ], function() {
                    require([ "/desktop/jquery.scrollTo.min.js" ], function() {
                    require(['/pages/bootstrap.js'], function(){
                            require([ "/desktop/underscore.js" ], function() {
                                require([ "/desktop/backbone.js" ], function() {
                                    require([ "/desktop/backbone-house.js" ], function() {
                                        require([ "/desktop/utils.js" ], function(utils) {
                                            window.utils = utils;
                                            require([ "/clock/clock.js" ], function(Clock) {
                                                window.clock = new Clock;
                                                clock.on("init", function() {
                                                    require([ "/account/account.js" ], function(account) {
                                                        account.auth(function() {
                                                            require([ "/pages/nav.js" ], function(nav) {
                                                                index.nav = nav;
                                                                nav.init('.navbar-collapse.collapse');
                                                                nav.list.render();
                                                                nav.router.on("loading", function() {
                                                                    $("body").addClass("loading");
                                                                });
                                                                nav.router.on("loadingComplete", function() {
                                                                    $("body").removeClass("loading");
                                                                });
                                                                require([ "/pages/pages.js" ], function(Pages) {
                                                                    var pages = new Pages({el:$("body")});
                                                                    pages.bindUser(account.loginStatus.getView().userModel);
                                                                    pages.on("initialized", function() {
                                                                        pages.bindNav(nav);
                                                                        pages.render();
                                                                        
                                                                        require(['/desktop/jquery.hotkeys.js'], function(){
                                                                          $(document).bind('keydown', 'esc', function(){
                                                                            if(!account.loginStatus.isUser()) {
                                                                                nav.router.navigate('join', {trigger: true});
                                                                            }
                                                                            return false;
                                                                          });
                                                                        });
                                                                        
                                                                        var d = new Date(); $('.year').html(d.getFullYear());
                                                                
                                                                        if (callback) callback(pages);
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
            });
        });
    };
    if (define) {
        define(function() {
            return index;
        });
    }
})();