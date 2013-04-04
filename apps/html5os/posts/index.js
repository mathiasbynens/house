(function(){
    var index = {};
    index.init = function(callback) {
        require(['/desktop/jquery.js'], function(){
            $(document).ready(function() {
        require(['/posts/wysihtml-parser_rules.js'], function(){
            require(['/posts/wysihtml5-0.4.0pre.min.js'], function(){
            require(['/desktop/underscore.js'], function(){
                require(['/desktop/backbone.js'], function(){
                    require(['/desktop/backbone-house.js'], function(){
                        require(['/desktop/utils.js'], function(utils){
                            window.utils = utils;
                            require(['/clock/clock.js'], function(Clock) {
                                window.clock = new Clock();
                                clock.on('init', function(){
                                    require(['/account/account.js'], function(account){
                                        account.auth(function(){
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
                                                require(['/posts/posts.js'], function(Posts) {
                                                    var $app = $('.app');
                                                    var postOpts = {};
                                                    if($app.length > 0) {
                                                        postOpts.el = $app;
                                                    }
                                                    window.posts = new Posts(postOpts);
                                                    posts.bindUser(account.loginStatus.getView().userModel);
                                                    posts.on('initialized', function(){
                                                        $('body').append(posts.render().$el);
                                                        posts.bindNav(nav);
                                                        account.bindRouter(nav.router);
                                                        nav.startRouter('/posts/');
                                                        if(callback) callback(posts);
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
            });});
            });
        });
    }
    
    if(define) {
        define(function () {
            return index;
        });
    }
})();