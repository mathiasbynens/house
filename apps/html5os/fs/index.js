(function() {
    var index = {};
    index.init = function(callback) {
        require([ "wysihtml-parser_rules.js" ], function() {
            require([ "wysihtml5-0.4.0pre.min.js" ], function() {
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
                                                require([ "/account/account.js" ], function(account) {
                                                    account.on("init", function() {
                                                        var $account = $("<account></account>");
                                                        $("header").append($account);
                                                        $account.append(account.render().$el);
                                                        require([ "/desktop/nav.js" ], function(nav) {
                                                            index.nav = nav;
                                                            nav.init();
                                                            nav.router.on("loading", function() {
                                                                $("body").addClass("loading");
                                                            });
                                                            nav.router.on("loadingComplete", function() {
                                                                $("body").removeClass("loading");
                                                            });
                                                            $("header").append(nav.list.render().$el);
                                                            require([ "fs.js" ], function(FS) {
                                                                window.onbeforeunload = function() {
                                                                    return "Are you sure that you want to leave?";
                                                                }
                                                                window.fs = new FS();
                                                                fs.bindUser(account.loginStatus.getView().userModel);
                                                                fs.on("initialized", function() {
                                                                    $("body").append(fs.render().$el);
                                                                    fs.bindNav(nav);
                                                                    account.bindRouter(nav.router);
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