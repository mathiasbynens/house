(function(){
    var index = {};
    index.init = function(callback) {
        require(['../desktop/jquery.js'], function(){
            $(document).ready(function() {
                require(['../desktop/underscore.js'], function(){
                    require(['../desktop/backbone.js'], function(){
                        require(['../desktop/backbone-house.js'], function(){
                            require(['../desktop/utils.js'], function(utils){
                                window.utils = utils;
                                require(['../clock/clock.js'], function(Clock) {
                                    window.clock = new Clock();
                                    clock.on('init', function(){
                                        require(['../account/account.js'], function(account){
                                            account.on('init', function(){
                                                var $account = $('<div id="account"></div>');
                                                $('#header').append($account);
                                                $account.append(account.render().$el);
                                                require(['../desktop/nav.js'], function(nav){
                                                    index.nav = nav;
                                                    nav.init();
                                                    nav.router.on('loading', function(){
                                                        $('body').addClass('loading');
                                                    });
                                                    nav.router.on('loadingComplete', function(){
                                                        $('body').removeClass('loading');
                                                    });
                                                    $('#header').append(nav.list.render().$el);
                                                    require(['analytics.js'], function(Analytics) {
                                                        window.analytics = new Analytics();
                                                        analytics.bindUser(account.loginStatus.getView().userModel);
                                                        analytics.on('initialized', function(){
                                                            $('body').append(analytics.render().$el);
                                                            analytics.bindNav(nav);
                                                            account.bindRouter(nav.router);
                                                            nav.startRouter('/analytics/');
                                                            if(callback) callback(analytics);
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
        define(function () {
            return index;
        });
    }
})();