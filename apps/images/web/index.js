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
                                account.on('init', function(){
                                    var $account = $('<div id="account"></div>');
                                    $('#header').append($account);
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
                                        $('#header').append(nav.list.render().$el);
                                        require(['images.js'], function(Images) {
                                            var images = new Images();
                                            images.on('initialized', function(){
                                                $('body').append(images.render().$el);
                                                images.bindNav(nav);
                                                nav.startRouter('/images/');
                                                if(callback) callback(images);
                                            });
                                        });
                                        account.bindRouter(nav.router);
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