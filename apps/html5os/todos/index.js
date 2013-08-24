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
                                    require(['/account/account.js'], function(accountProfile){
                                        accountProfile.updateUi({
                                            "accountMenuLabel": "≡"
                                        });
                                        accountProfile.auth(function(){
                                            var $account = $('<div id="account"></div>');
                                            $('#header').append($account);
                                            $account.append(accountProfile.render().$el);
                                            account.getView().onNavInit(function(nav){
                                                index.nav = nav;
                                                nav.router.on('loading', function(){
                                                    $('body').addClass('loading');
                                                });
                                                nav.router.on('loadingComplete', function(){
                                                    $('body').removeClass('loading');
                                                });
                                                require(['/todos/app.js'], function(App) {
                                                    window.app = new App();
                                                    window.app.bindUser(accountProfile.loginStatus.getView().userModel);
                                                    window.app.on('initialized', function(){
                                                        window.app.bindNav(nav);
                                                        $('body').append(window.app.render().$el);
                                                        accountProfile.bindRouter(nav.router);
                                                        nav.startRouter('/todos/');
                                                        if(callback) callback(window.app);
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