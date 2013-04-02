(function(){
    var index = {};
    index.init = function(callback) {
        require(['/desktop/jquery.js'], function(){
            require(['/desktop/underscore.js'], function(){
                require(['/desktop/backbone.js'], function(){
                    require(['/desktop/backbone-house.js'], function(){
                        require(['/desktop/utils.js'], function(utils){
                            window.utils = utils;
                            require(['/account/account.js'], function(account){
                                window.account = account;
                                account.auth(function(){
                                    var $account = $('<div id="account"></div>');
                                    $('#header').append($account);
                                    $account.append(account.render().$el);
                                    require(['/desktop/nav.js'], function(nav){
                                        index.nav = nav;
                                        nav.init();
                                        account.bindRouter(nav.router);
                                        nav.router.on('loading', function(){
                                            $('body').addClass('loading');
                                        });
                                        nav.router.on('loadingComplete', function(){
                                            $('body').removeClass('loading');
                                        });
                                        $('#header').append(nav.list.render().$el);
                                        require(['urls.js'], function(app) {
                                            app.on('initialized', function(){
                                                var view = app.getWidgetView();
                                                $('body').append(view.render().$el);
                                                $('body').append(app.collection.getView().render().$el);
                                                app.bindNav(nav);
                                                nav.startRouter('/urls/');
                                                /*require(['../desktop/jquery.idle-timer.js'], function() {
                                                    var idleTimer = $(document).idleTimer(2200);
                                                    $(document).bind("idle.idleTimer", function(e){
                                                        $('body').addClass('idle');
                                                    });
                                                    $(document).bind("active.idleTimer", function(){
                                                        $('body').removeClass('idle');
                                                    });
                                                });*/
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
    }
    
    if(define) {
        define(function () {
            return index;
        });
    }
})();