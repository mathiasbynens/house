(function() {
    var index = {};
    index.init = function(callback) {
        require([ "/desktop/jquery.js" ], function() {
            $(document).ready(function() {
            require([ "/pages/wysihtml-parser_rules.js" ], function() {
                require([ "/pages/wysihtml5-0.4.0pre.min.js" ], function() {
                    require(['/pages/js/bootstrap.js'], function(){
                        require(['/pages/js/plugins.js'], function(){
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
                                                                //var $account = $('<div id="account"></div>');
                                                                //$("#header").append($account);
                                                                //$account.append(account.render().$el);
                                                                require([ "nav.js" ], function(nav) {
                                                                    index.nav = nav;
                                                                    nav.init('.nav-collapse.collapse');
                                                                    nav.list.render();
                                                                    nav.router.on("loading", function() {
                                                                        $("body").addClass("loading");
                                                                    });
                                                                    nav.router.on("loadingComplete", function() {
                                                                        $("body").removeClass("loading");
                                                                    });
                                                                    //$("ul.nav").append(nav.list.render().$el);
                                                                    require([ "/pages/pages.js" ], function(Pages) {
                                                                        var pages = new Pages({el:$("body")[0]});
                                                                        pages.bindUser(account.loginStatus.getView().userModel);
                                                                        pages.on("initialized", function() {
                                                                            pages.render();
                                                                            pages.bindNav(nav);
                                                                            account.bindRouter(nav.router);
                                                                            
                                                                            require(['/desktop/jquery.hotkeys.js'], function(){
                                                                              $(document).bind('keydown', 'esc', function(){
                                                                                if(!account.loginStatus.isUser()) {
                                                                                    nav.router.navigate('join', true);
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