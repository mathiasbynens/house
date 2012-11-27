(function() {
    var auth = {};
    auth.get = function(callback) {
        var self = this;
        this.collection.bind("add", function(doc) {
            self.model = doc;
            callback(null, doc);
        });
        this.collection.load();
    };
    auth.prompt = function($el, callback) {
        var thisPrompt = this;
        if (!this.hasOwnProperty("model")) {
            this.model = new this.Model({}, {
                collection: this.collection
            });
        } else {
            delete this.model.id;
        }
        if (!this.model.has("user")) {
            this.model.set({
                email: ""
            }, {
                silent: true
            });
        }
        this.authView = new this.LoginForm({
            model: this.model
        });
        this.model.on("login", function() {
            if (callback) callback();
            if (thisPrompt.hasOwnProperty("onAuthCb")) {
                thisPrompt.onAuthCb();
            }
        });
        $el.html(this.authView.render().$el);
        if(!window.navigator || window.navigator.userAgent.indexOf('iPhone') === -1) {
            this.authView.focus();
        }
        return {
            authorized: function(callback) {
                thisPrompt.onAuthCb = callback;
            }
        };
    };
    auth.Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
            this.views = [];
            this.on("change", function(model, options) {
                var s = model.save(null, {
                    silent: true
                }).done(function(s, typeStr, respStr) {
                    self.renderAll();
                    profile.loadUser();
                    profile.render();
                    console.log(profile);
                    self.trigger("login", model);
                }).fail(function(s, typeStr, respStr) {
                    if (s.status === 403) {
                        self.trigger("badPass", "bad password");
                    }
                });
            });
            this.on("error", function(originalModel, resp, options) {});
            if (this.has("user")) {
                this.trigger("login", this);
            }
        },
        url: function() {
            return "/api/auth";
        },
        renderAll: function() {
            for(var i in this.views){
                this.views[i].render();
            }
            this.view.render();
        },
        getView: function(options) {
            if (!this.hasOwnProperty("view")) {
                if (!options) options = {};
                options.model = this;
                this.view = new auth.View(options);
            }
            return this.view;
        }
    });
    auth.Collection = Backbone.Collection.extend({
        model: auth.Model,
        url: "/api/auth",
        initialize: function() {
            var self = this;
        },
        load: function(callback) {
            var self = this;
            this.reset();
            return this.fetch({
                add: true,
                success: function() {
                    self.trigger("loaded", self.url);
                    if (callback) callback();
                },
                complete: function(xhr) {}
            });
        }
    });
    auth.collection = new auth.Collection;
    auth.LoginForm = Backbone.View.extend({
        tagName: "div",
        className: "authentication",
        render: function() {
            this.$el.html('<h4>Welcome,</h4><p>Join now!</p>');
            this.$el.append('<span class="connect"><button class="connectTwitter">Connect Twitter</button><button class="connectFacebook">Connect Facebook</button></span>');
            var $form = $('<form id="houseAuth"><input name="email" type="email" placeholder="Email" value="" required autocomplete="off" /><input type="password" name="pass" required placeholder="Password" /><input type="submit" name="Join" value="Join" /><span class="msg"></span></form>');
            this.$el.append($form);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.model.on("badPass", function(msg) {
                self.model.set({
                    pass: ""
                }, {
                    silent: true
                });
                self.render();
                self.$el.find('input[name="pass"]').focus();
                self.$el.find(".msg").html("Bad password");
            });
        },
        events: {
            "submit form": "submit"
        },
        submit: function() {
            var email = this.$el.find('input[name="email"]').val();
            var pass = this.$el.find('input[name="pass"]').val();
            if (pass.length < 6) {
                alert("longer password required");
            } else if (email.length < 4) {
                alert("please enter an email address");
            } else {
                var name = email.substr(0,email.indexOf('@'));
                this.model.set({
                    email: email,
                    pass: pass,
                    name: name
                });
            }
            return false;
        },
        focus: function() {
            this.$el.find("input").first().focus();
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    auth.View = Backbone.View.extend({
        tagName: "span",
        className: "profile",
        render: function() {
            var self = this;
            var name = this.model.get('name');
            var loginbtn;
            if (this.model.get('user')) {
                loginbtn = '<li><span class="avatar" title="'+name+'"></span><span class="name">'+name+'</span></li><li class="logout">Sign out</li>';
            } else {
                loginbtn = '<li class="login">Sign in</li>';
            }
            
            this.$el.html('<span class="user">'+name+'<menu>'+loginbtn+'</menu></span>');
            if (this.userModel) {
                this.$el.find(".avatar").append(this.userModel.getAvatarView().render().el);
            } else if (this.model.has("user")) {
                this.getUserModel(function(){
                    self.render();
                });
            }
            this.setElement(this.$el);
            return this;
        },
        refresh: function() {
            var self = this;
            this.userModel.fetch().done(function() {
                self.render();
            });
        },
        fetchUserModel: function() {
            var self = this;
            return window.usersCollection.load(function() {
                self.userModel = window.usersCollection.get(self.model.get("user"));
                console.log('fetchUserModel');
                self.render();
            });
        },
        getUserModel: function(callback) {
            console.log('getUserModel');
            var self = this;
            console.log(self.model);
             if (!this.userModel) {
                this.userModelFetch = this.fetchUserModel();
                this.userModelFetch.done(function(){
                    self.userModel = window.usersCollection.get(self.model.get("user"));
                    console.log(self.userModel)
                    if(callback) callback(self.userModel);
                });
            } else {
                if(callback) callback(this.userModel);
            }
        },
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.userModel = window.usersCollection.get(this.model.get("user"));
            if (!this.userModel) {
                this.getUserModel();
            }
        },
        events: {
            "click .logout": "logout",
            "click .login": "login",
            "click .name": "goToProfile",
        },
        goToProfile: function() {
            this.trigger("goToProfile", this.model.get("name"));
        },
        login: function() {
            var self = this;
            profile.router.navigate('join', true);
        },
        logout: function() {
            if (confirm("Are you sure that you want to log off?")) {
                this.model.destroy();
                function deleteAllCookies() {
                    var cookies = document.cookie.split(";");
                    for (var i = 0; i < cookies.length; i++) {
                        var cookie = cookies[i];
                        var eqPos = cookie.indexOf("=");
                        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    }
                }
                deleteAllCookies();
                setTimeout(function() {
                    window.location.reload();
                }, 500);
            }
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var users = {};
    users.AvatarView = Backbone.View.extend({
        tagName: "span",
        render: function() {
            var self = this;
            if (this.model.has("avatar")) {
                var src = this.model.get("avatar");
                if (src.indexOf("http") === 0) {} else {
                    src = "/api/files/" + src;
                }
                this.$el.html('<img src="' + src + '" />');
            } else {
                this.$el.html("☺");
            }
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {},
        events: {
            click: "goToProfile"
        },
        goToProfile: function() {
            this.trigger("goToProfile", this.model.get("name"));
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    
    var feat = {};
    var userFeat = {};
    
    feat.Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            if (!this.hasOwnProperty("view")) {
                if (!options) options = {};
                options.model = this;
                this.view = new feat.View(options);
            }
            return this.view;
        },
        getForm: function(options) {
            if (!this.hasOwnProperty("form")) {
                if (!options) options = {};
                options.model = this;
                this.form = new feat.Form(options);
            }
            return this.form;
        }
    });
    userFeat.Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            if (!this.hasOwnProperty("view")) {
                if (!options) options = {};
                options.model = this;
                this.view = new userFeat.View(options);
            }
            return this.view;
        },
        getForm: function(options) {
            if (!this.hasOwnProperty("form")) {
                if (!options) options = {};
                options.model = this;
                this.form = new userFeat.Form(options);
            }
            return this.form;
        }
    });
    feat.Collection = Backbone.Collection.extend({
        model: feat.Model,
        url: "/api/feats",
        initialize: function() {
            var self = this;
        },
        load: function(callback) {
            var self = this;
            this.reset();
            return this.fetch({
                add: true,
                success: function() {
                    self.trigger("loaded");
                    if (callback) callback();
                },
                complete: function(xhr) {}
            });
        }
    });
    userFeat.Collection = Backbone.Collection.extend({
        model: userFeat.Model,
        url: "/api/userFeats",
        initialize: function() {
            var self = this;
        },
        load: function(callback) {
            var self = this;
            this.reset();
            return this.fetch({
                add: true,
                success: function() {
                    self.trigger("loaded");
                    if (callback) callback();
                },
                complete: function(xhr) {}
            });
        }
    });
    
    
    
    feat.View = Backbone.View.extend({
        tagName: "div",
        className: "feat",
        render: function() {
            this.$el.append(this.$html);
            this.$name.text(this.model.get('name'));
            this.$desc.text(this.model.get('desc'));
            this.setElement(this.$el);
            console.log('render');
            return this;
        },
        initialize: function() {
            var self = this;
            
            this.$html = $('<span></span>');
            this.$actions = $('<span class="actions"></span>');
            this.$actions.append($('<span class="edit"><button>edit</button></span>'));
            this.$actions.append($('<span class="del"><button>del</button></span>'));
            this.$name = $('<span class="name"></span>');
            this.$desc = $('<span class="desc"></span>');
            
            // template
            this.$html.append(this.$name);
            this.$html.append(this.$desc);
            this.$html.append(this.$actions);
            
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        events: {
            "click .del": "deleteModel",
            "click .edit": "editModel",
        },
        editModel: function() {
            var form = this.model.getForm();
            var lightbox = utils.appendLightBox(form.render().$el);
            form.on("saved", function() {
                form.remove();
                lightbox.remove();
            });
            return false;
        },
        deleteModel: function(e) {
            if(confirm("are you sure that you want to delete this?")) {
                this.model.destroy();
            }
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    feat.ListView = Backbone.View.extend({
        initialize: function() {
            var self = this;
            this.$ul = $('<ul></ul>');
            this.collection.on('add', function(model){
                self.$ul.append(model.getView().render().$el);
            });
            this.collection.on('reset', function() {
                self.$ul.html('');
            });
        },
        tagName: "div",
        className: "featList",
        render: function() {
            console.log('render feat.ListView');
            var self = this;
            this.collection.each(function(model,i){
                model.getView().render();
            });
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        },
        events: {
        }
    });
    
    feat.NewForm = Backbone.View.extend({
        tag: "div",
        className: "featForm",
        render: function() {
            this.$el.html(this.$html);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$html = $('<h3>New Achievement</h3><form><input type="text" name="name" placeholder="new achievement name" autocomplete="off" /><textarea name="desc" placeholder="description"></textarea><input type="submit" value="Save" /></form>');
            this.$name = this.$html.find('input[name="name"]');
            this.$desc = this.$html.find('[name="desc"]');
        },
        events: {
            submit: "submit"
        },
        submit: function(el) {
            var self = this;
            var m = new feat.Model({}, {
                collection: this.collection
            });
            m.set({
                name: this.$name.val(),
                desc: this.$desc.val()
            });
            var s = m.save(null, {
                silent: false,
                wait: true
            });
            s.done(function() {
                self.trigger("saved", m);
                self.collection.add(m);
            });
            self.clear();
            return false;
        },
        clear: function() {
            this.$name.val("");
            this.render();
            this.focus();
        },
        focus: function() {
            this.$name.focus();
        }
    });
    feat.Forfm = Backbone.View.extend({
        tag: "div",
        className: "featForm",
        render: function() {
            this.$name.val(this.model.get('name'));
            this.$desc.val(this.model.get('desc'));
            this.$el.html(this.$html);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$html = $('<h3>Edit Feat</h3><form><input type="text" name="name" placeholder="edit feat name" autocomplete="off" /><textarea name="desc" placeholder="description"></textarea><input type="submit" value="Save" /></form>');
            this.$name = this.$html.find('input[name="name"]');
            this.$desc = this.$html.find('[name="desc"]');
        },
        events: {
            submit: "submit"
        },
        submit: function(el) {
            var self = this;
            return false;
        },
        clear: function() {
            this.$name.val("");
            this.$desc.val("");
            this.render();
            this.focus();
        },
        focus: function() {
            this.$name.focus();
        }
    });
    
    userFeat.ListView = Backbone.View.extend({
        tagName: "div",
        className: "userFeatList",
        initialize: function() {
            this.$ul = $('<ul></ul>');
        },
        events: {
        },
        render: function() {
            var self = this;
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        }
    });
    users.FeatList = Backbone.View.extend({
        tagName: "div",
        className: "feats",
        initialize: function() {
            this.collection = new feat.Collection();
            this.featList = new feat.ListView({collection: this.collection});
            this.collection.load();
            //this.userFeatList = new userFeat.ListView();
        },
        render: function() {
            console.log('render users.FeatList');
            var self = this;
            this.$el.append(this.featList.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
        }
    });
    
    users.UserView = Backbone.View.extend({
        tagName: "span",
        className: "user",
        render: function() {
            var self = this;
            this.$el.html('');
            if (this.model.has("avatar")) {
                var src = this.model.get("avatar");
                if (src.indexOf("http") === 0) {} else {
                    src = "/api/files/" + src;
                }
                this.$el.html('<span class="avatar"><img src="' + src + '" /></span>');
            } else {
            }
            var at = this.model.get('at');
            var m_names = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");
            var atFmt = m_names[at.getMonth()] + ' ' + at.getFullYear();
            this.$el.append('<p class="basicInfo">Member since '+atFmt+'</p>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    users.ModalView = Backbone.View.extend({
        tagName: "div",
        className: "lightbox",
        render: function() {
            var self = this;
            this.$el.html("");
            this.$lightDiv.html("");
            this.$lightDiv.append('<h3 class="name">' + this.model.get("name") + "</h3>");
            if (this.model.has("avatar")) {
                var src = this.model.get("avatar");
                if (src.indexOf("http") === 0) {} else {
                    src = "/api/files/" + src;
                }
                this.$lightDiv.append('<img src="' + src + '" />');
            } else {
                this.$lightDiv.append("no avatar");
            }
            this.$el.append(this.$lightDiv);
            var $close = $('<p class="close"><a href="/" title="close"></a></p>');
            this.$el.append($close);
            $("body").append(this.$el);
            this.setElement(this.$el);
            this.$el.show();
            return this;
        },
        initialize: function() {
            this.$lifghtDiv = $("<div></div>");
        },
        events: {
            "click .close": "hideLightbox"
        },
        hideLightbox: function() {
            this.$el.hide();
            if (history) {
                history.back();
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    users.Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
            var timestamp = this.id.toString().substring(0,8)
            var date = new Date( parseInt( timestamp, 16 ) * 1000 )
            this.attributes.at = date;
        },
        getUserView: function(options) {
            if (!options) options = {};
            if (!this.hasOwnProperty("userView")) {
                options.model = this;
                this.userView = new users.UserView(options);
            }
            return this.userView;
        },
        getAvatarView: function(options) {
            if (!options) options = {};
            if (!this.hasOwnProperty("view")) {
                options.model = this;
                this.view = new users.AvatarView(options);
            }
            return this.view;
        },
        getModalView: function(options) {
            if (!options) options = {};
            if (!this.hasOwnProperty("modalView")) {
                options.model = this;
                this.modalView = new users.ModalView(options);
            }
            return this.modalView;
        }
    });
    users.Collection = Backbone.Collection.extend({
        model: users.Model,
        url: "/api/users",
        initialize: function() {
            var self = this;
        },
        load: function(callback) {
            var self = this;
            this.reset();
            return this.fetch({
                add: true,
                success: function() {
                    self.trigger("loaded", self.url);
                    if (callback) callback();
                },
                complete: function(xhr) {}
            });
        },
        getByName: function(name, callback) {
            var self = this;
            var users = this.where({
                name: name
            });
            if (users.length > 0) {
                callback(users[0]);
            } else {}
        }
    });
    
    
    window.usersCollection = new users.Collection;
    window.usersCollection.load();
    var ProfileView = Backbone.View.extend({
        tag: "span",
        className: "profile",
        render: function() {
            var self = this;
            this.$el.append(this.$profile);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$profile = $('<profile></profile>');
            console.log('test');
            auth.get(function(err, loginStatus) {
                console.log(arguments);
                if (err) {} else if (loginStatus) {
                    self.loginStatus = loginStatus;
                    loginStatus.getView().on("goToProfile", function(username) {
                        self.router.navigate('user/'+username, true);
                    });
                    loginStatus.on("login", function() {
                        loginStatus.getView().render();
                    });
                    console.log(loginStatus.getView().render().$el)
                    self.$profile.append(loginStatus.getView().render().$el);
                    if (loginStatus && loginStatus.has("user")) {} else {}
                    self.trigger('init');
                }
            });
        },
        loadUser: function() {
            window.usersCollection.load();
        },
        isAdmin: function(callback) {
            var self = this;
            self.loginStatus.getView().getUserModel(function(user){
                callback(user && user.has('groups') && user.get('groups').indexOf('admin') !== -1);
            });
        },
        navToUser: function(user) {
            var self = this;
            var $e = user.getUserView({profile: this}).render().$el;
            $e.show();
            this.userLightbox = utils.appendLightBox($e);
            this.userLightbox.on('close', function(){
                window.history.back();
            });
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.route("join", "join", function() {
                self.router.navigate('join');
                
                self.loginLightbox = new utils.LightboxView().render();
                self.loginLightbox.on('close', function(){
                    window.history.back();
                });
                auth.prompt(self.loginLightbox.$container).authorized(function() {
                    self.loginLightbox.trigger('close');
                });
            });
            router.route("me", "profile", function() {
                self.router.navigate('me/', {trigger: true, replace: true});
            });
            router.route("me/*path", "profile", function(path) {
                router.reset();
                router.setTitle("Me");
            });
            router.route("user/*path", "user", function(path) {
                router.reset();
                router.setTitle(path);
                
                usersCollection.getByName(path, function(user){
                    self.navToUser(user);
                });
            });
            router.on('reset', function() {
                
            });
        }
    });
    
    var profile = new ProfileView;
    window.testprofile = profile;
    if (define) {
        define(function() {
            return profile;
        });
    }
})();
