(function(){
    var index = {};
    index.init = function(callback) {
        require(['/desktop/jquery.js'], function(){
            require([ "/desktop/jquery.scrollTo.min.js" ], function() {
                require(['/pages/bootstrap.js'], function(){
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
                                                                    
                                                                    var subscribeEmailView = account.getEmailSubscribeView();
                                                                    if($('.subscribeEmail').length > 0) {
                                                                        subscribeEmailView.setElement($('.subscribeEmail')[0]);
                                                                    }
                                                                    if(subscribeEmailView) {
                                                                        $('#siteNav').after(subscribeEmailView.render().$el);
                                                                        subscribeEmailView.on('saved', function(){
                                                                            alert('Thank you for subscribing!');
                                                                            subscribeEmailView.remove();
                                                                        });
                                                                    }
                                                                    
                                                                    require(['/posts/posts.js'], function(Posts) {
                                                                        var $app = $('.app');
                                                                        var postOpts = {};
                                                                        if($app.length > 0) {
                                                                            postOpts.el = $app;
                                                                        }
                                                                        window.posts = new Posts(postOpts);
                                                                        // posts.bindUser(accountProfile.loginStatus.getView().userModel);
                                                                        posts.on('initialized', function(){
                                                                            $('body').append(posts.render().$el);
                                                                            posts.bindNav(nav);
                                                                            accountProfile.bindRouter(nav.router);
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