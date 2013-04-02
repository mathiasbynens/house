(function(){
    var index = {};
    index.init = function(callback) {
        require(['/desktop/jquery.js'], function(){
            $(document).ready(function() {
            require(['/desktop/underscore.js'], function(){
                require(['/desktop/backbone.js'], function(){
                    require(['/desktop/backbone-house.js'], function(){
                        require(['/desktop/utils.js'], function(utils){
                            window.utils = utils;
                            require(['/clock/clock.js'], function(Clock) {
                                window.clock = new Clock();
                                clock.on('init', function(){
                                    require(['/account/account.js'], function(account){
                                        account.on('init', function(){
                                            var $account = $('<account></account>');
                                            $('header').append($account);
                                            $account.append(account.render().$el);
                                            require(['/desktop/nav.js'], function(nav){
                                                index.nav = nav;
                                                nav.init();
                                                nav.router.on('loading', function(){
                                                    $('body').addClass('loading');
                                                });
                                                nav.router.on('loadingComplete', function(){
                                                    $('body').removeClass('loading');
                                                });
                                                $('header').append(nav.list.render().$el);
                                                require(['users.js'], function(Users) {
                                                    window.users = new Users();
                                                    users.bindUser(account.loginStatus.getView().userModel);
                                                    users.on('initialized', function(){
                                                        $('body').append(users.render().$el);
                                                        users.bindNav(nav);
                                                        account.bindRouter(nav.router);
                                                        nav.startRouter('/users/');
                                                        if(callback) callback(users);
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
