(function() {
    var index = {};
    index.init = function(callback) {
        require(['/desktop/jquery.js'], function() {
            $(document).ready(function() {
                require(['/pages/bootstrap.js'], function() {
                    require(['/desktop/underscore.js'], function() {
                        require(['/desktop/backbone.js'], function() {
                            require(['/desktop/backbone-house.js'], function() {
                                require(['/desktop/utils.js'], function(utils) {
                                    window.utils = utils;
                                    require(['/clock/clock.js'], function(Clock) {
                                        window.clock = new Clock();
                                        clock.on('init', function() {
                                            require(['/account/account.js'], function(accountProfile) {
                                                accountProfile.updateUi({
                                                    "accountMenuLabel": "≡"
                                                });
                                                accountProfile.auth(function() {
                                                    accountProfile.setElement($('#siteMenu')).render();
                                                    account.getView().onNavInit(function(nav) {
                                                        index.nav = nav;
                                                        nav.router.on('loading', function() {
                                                            $('#loading .progress-bar').css('width', '1%');
                                                            $('body').addClass('loading');
                                                            nav.router.trigger('loadingProgress', 15);
                                                        });
                                                        nav.router.on('loadingProgress', function(percent) {
                                                            if(!percent) percent = 10;
                                                            // console.log($('#loading .progress-bar').css('width'));
                                                            var w = $('#loading .progress-bar')[0].style.width;//.css('width');
                                                            // console.log(w.substr(w.length-1))
                                                            if(w.substr(w.length-1) === '%') {
                                                                w = parseInt(w.substr(0, w.length-1), 10);
                                                                // console.log(w)
                                                                w = w + percent;
                                                            } else {
                                                                w = percent;
                                                            }
                                                            // console.log(w);
                                                            $('#loading .progress-bar').css('width', w+'%');
                                                            // console.log($('#loading .progress-bar').css('width'))
                                                        });
                                                        nav.router.on('loadingComplete', function() {
                                                            $('#loading .progress-bar').css('width', '100%');
                                                            $('body').removeClass('loading');
                                                        });
                                                        require(['/todos/app.js'], function(App) {
                                                            window.app = new App();
                                                            window.app.bindUser(accountProfile.loginStatus.getView().userModel);
                                                            window.app.on('initialized', function() {
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
        });
    }

    if(define) {
        define(function() {
            return index;
        });
    }
})();