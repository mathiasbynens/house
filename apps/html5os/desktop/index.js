(function() {
    var index = {};
    index.init = function(callback) {
        require(['/desktop/jquery.js'], function() {
            require(['/pages/bootstrap.js'], function() {
                $(document).ready(function() {
                    require(['/desktop/underscore.js'], function() {
                        require(['/desktop/backbone.js'], function() {
                            require(['/desktop/backbone-house.js'], function() {
                                require(['/desktop/utils.js'], function(utils) {
                                    window.utils = utils;
                                    require(['/account/account.js'], function(accountProfile) {
                                        accountProfile.updateUi({
                                            "welcomeLabel": "Join using ",
                                            "connectLabel": "",
                                            "accountMenuLabel": "≡"
                                        });
                                        accountProfile.auth(function() {
                                            account.getView().getUserModel(function(accountUser) {
                                                if (!account.isUser() || (account.isUser() && (!accountUser.has('email') || (accountUser.has('pass') && accountUser.get('pass') === false)))) {
                                                    account.welcome($('#welcome'), {
                                                        ui: {
                                                            "welcomeLabel": "GET STARTED",
                                                            "welcomeBackLabel": "Welcome back ",
                                                            "noEmailLabel": "Your email: ",
                                                            "noPassLabel": "Don't forget to ",
                                                            "emailLabel": "Email Address",
                                                            "regInfoLabel": "",
                                                            "connectLabel": "",
                                                            "footerLabel": " * We'll never spam you.",
                                                            "defaultAvatar": "Upload a photo",
                                                            "joinTitle": "Join now in less than 30 seconds.",
                                                            "joinMsg": ""
                                                        },
                                                        klasses: {
                                                            "dialog": "modal-dialog",
                                                            "title": "modal-title",
                                                            "header": "modal-header",
                                                            "content": "modal-content",
                                                            "body": "modal-body",
                                                            "footer": "modal-footer"
                                                        },
                                                        modal: false
                                                    });
                                                } else {
                                                    $('#welcome').hide();
                                                }
                                            });
                                            accountProfile.setElement($('#siteMenu')).render();
                                            account.getView().onNavInit(function(nav) {
                                                //require(['/desktop/windows.js'], function(windows) {
                                                    //index.windows = windows;
                                                    //windows.render($('body'));

                                                    require(['/clock/clock.js'], function(Clock) {
                                                        var clock = new Clock({format: 'h:mm A'});
                                                        $('.clock').append(clock.render().$el);
                                                    });

                                                    require(['/applications/applications.js'], function(apps) {
                                                        apps.init();
                                                        var appsNav = new nav.col.model({
                                                            id: 'Apps',
                                                            glyphicon: 'th-large',
                                                            subNav: true
                                                        });
                                                        nav.col.add(appsNav);
                                                        apps.col.bind("add", function(doc) {
                                                            //subNav.col.add({title: doc.get("name"), url: doc.get("url"), imgSrc: doc.get("icon")});
                                                            appsNav.subNavCol.add({
                                                                title: doc.get("name"),
                                                                url: doc.get("url"),
                                                                imgSrc: doc.get("icon")
                                                            });
                                                        });
                                                        apps.col.load();
                                                        appsNav.subNavCol.list.on('selected', function(navRow) {
                                                            //index.windows.openUrl(navRow.model.get('url'), navRow.model.get('name'))
                                                            window.location = navRow.model.get('url');
                                                        });

                                                    });

                                                    //
                                                    // Example of simple model we generate on the fly to build our nav
                                                    //
                                                    // nav.col.add({a:"Wikipedia", href:"http://Wikipedia.com", imgSrc: "http://Wikipedia.com/favicon.ico"});
                                                    // nav.col.add({a:"home", href:"/", imgSrc: "/favicon.ico"});
                                                    //

                                                    require(['/wallpaper/wallpaper.js'], function(wallpaper) {
                                                        var startWallpaper = function() {
                                                            var wallpaperBackground = wallpaper.getBackgroundView();
                                                            $('body').append(wallpaperBackground.render().$el);
                                                            wallpaperBackground.transitionEvery(60000 * 15); // 60000 * 15
                                                        }
                                                        if (wallpaper.initialized) {
                                                            startWallpaper();
                                                        } else {
                                                            wallpaper.on('initialized', function() {
                                                                startWallpaper();
                                                            });
                                                        }
                                                    });
                                                    
                                                    require(['/desktop/app.js'], function(DesktopApp) {
                                                        window.app = new DesktopApp({el: $('body')[0]});
                                                        app.accountProfile = accountProfile;
                                                        app.on('initialized', function(){
                                                            app.render();
                                                            app.bindNav(nav);
                                                            accountProfile.bindRouter(nav.router);
                                                            nav.startRouter('/desktop/');
                                                            if(callback) callback(app);
                                                        });
                                                    });

                                                    //accountProfile.bindRouter(nav.router);
                                                    //nav.startRouter('/desktop/');
                                                    /*
                                        require(['/desktop/jquery.idle-timer.js'], function() {
                                            var idleTimer = $(document).idleTimer(3200);
                                            $(document).bind("idle.idleTimer", function(e){
                                                $('body').addClass('idle');
                                            });
                                            $(document).bind("active.idleTimer", function(){
                                                $('body').removeClass('idle');
                                            });
                                        });*/
                                                    if (callback) {
                                                        callback();
                                                    }
                                                });
                                            //});
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

    if (define) {
        define(function() {
            return index;
        });
    }
})();