//
// app
//
//
//
//
(function(){

    var headID = document.getElementsByTagName('head')[0];
    var cssEl = document.createElement('link');
    cssEl.type = 'text/css';
    cssEl.rel = 'stylesheet';
    cssEl.href = '/todos/todos.css';
    cssEl.media = 'screen';
    headID.appendChild(cssEl);

    var app = {};
    
    app.init = function(callback) {
        require(['underscore.js'], function(){
            require(['backbone.js'], function(){
                require(['backbone-house.js'], function(){
                    require(['profile.js'], function(profile){
                        profile.on('init', function(){
                            app.profile = profile;
                            var $profile = $('<div id="profile"></div>');
                            $('#container').append($profile);
                            $profile.append(profile.render().$el);
                        
                            require(['todos.js'], function(todos) {
                                if(callback) callback(todos);
                            });
                        });
                    });
                });
            });
        });
    }
    if(define) {
        define(function () {
            return app;
        });
    }
})();
