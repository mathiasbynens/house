//
//
//
//
//
//
(function(){

    var index = {};
    index.init = function(callback) {
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
                                
                                require(['windows.js'], function(windows){
                                    index.windows = windows;
                                    windows.render($('body'));
                                    
                                    require(['/clock/clock.js'], function(Clock){
                                        var clock = new Clock();
                                        $('#header').append(clock.render().$el);
                                    });
                                    
                                    require(['nav.js'], function(nav){
                                        index.nav = nav;
                                        nav.init();
                                        $('#header').append(nav.list.render().$el);
                                        
                                        //
                                        // Example of simple model we generate on the fly to build our nav
                                        //
                                        // nav.col.add({a:"Wikipedia", href:"http://Wikipedia.com", imgSrc: "http://Wikipedia.com/favicon.ico"});
                                        // nav.col.add({a:"home", href:"/", imgSrc: "/favicon.ico"});
                                        //
                                        require(['/applications/applications.js'], function(apps){
                                            apps.init();
                                            apps.col.bind("add", function(doc) {
                                                nav.col.add({title: doc.get("name"), url: doc.get("url"), imgSrc: doc.get("icon")});
                                            });
                                            apps.col.load();
                                        });
                                        
                                        nav.list.on('selected', function(navRow){
                                            index.windows.openUrl(navRow.model.get('url'), navRow.model.get('name'))
                                        });
                                        
                                        require(['/wallpaper/wallpaper.js'], function(wallpaper){
                                            wallpaper.on('initialized', function(){
                                                var wallpaperBackground = wallpaper.getBackgroundView();
                                                $('body').append(wallpaperBackground.render().$el);
                                                wallpaperBackground.transitionEvery(60000*15);
                                            });
                                        });
                                        
                                        account.bindRouter(nav.router);
                                        nav.startRouter('/desktop/');
                                        
                                        require(['jquery.idle-timer.js'], function() {
                                            var idleTimer = $(document).idleTimer(3200);
                                            $(document).bind("idle.idleTimer", function(e){
                                                $('body').addClass('idle');
                                            });
                                            $(document).bind("active.idleTimer", function(){
                                                $('body').removeClass('idle');
                                            });
                                        });
                                        if(callback) {
                                            callback();
                                        }
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