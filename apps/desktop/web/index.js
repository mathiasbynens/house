//
//
//
//
//
//
(function(){

    var index = {};

    index.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                require(['backbone-house.js'], function(){
                    require(['utils.js'], function(utils){
                        window.utils = utils;
                        require(['../account/account.js'], function(account){
                            account.on('init', function(){
                                var $account = $('<account></account>');
                                $('header').append($account);
                                $account.append(account.render().$el);
                                
                                require(['windows.js'], function(windows){
                                    index.windows = windows;
                                    windows.render($('body'));
                                    
                                    $('header').append('<clock data-format="digital"></clock>');
                                    require(['../clock/clock.js'], function(clock){
                                        clock.startClocks($('clock'));
                                    });
                                    
                                    require(['nav.js'], function(nav){
                                        index.nav = nav;
                                        nav.init();
                                        $('body').append(nav.list.render().$el);
                                        
                                        //
                                        // Example of simple model we generate on the fly to build our nav
                                        //
                                        // nav.col.add({a:"Wikipedia", href:"http://Wikipedia.com", imgSrc: "http://Wikipedia.com/favicon.ico"});
                                        // nav.col.add({a:"home", href:"/", imgSrc: "/favicon.ico"});
                                        //
                                        require(['../applications/applications.js'], function(apps){
                                            apps.init();
                                            apps.col.bind("add", function(doc) {
                                                nav.col.add({title: doc.get("name"), url: doc.get("url"), imgSrc: doc.get("icon")});
                                            });
                                            apps.col.load();
                                        });
                                        
                                        nav.list.on('selected', function(navRow){
                                            index.windows.openUrl(navRow.model.get('url'), navRow.model.get('name'))
                                        });
                                        
                                        require(['../wallpaper/wallpaper.js'], function(wallpaper){
                                            wallpaper.init();
                                        });
                                        
                                        account.bindRouter(nav.router);
                                        nav.startRouter('/desktop/');
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