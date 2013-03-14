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
                    account.loadUser();
                    account.render();
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
            if(window.config && window.config.authUrl) {
                return window.config.authUrl;
            } else {
                return "https://"+window.location.hostname+"/api/auth";
            }
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
        },
        isAdmin: function() {
            return(this.has('groups') && this.get('groups').indexOf('admin') !== -1);
        },
        isUser: function() {
            return(this.has('user'));
        },
        isOwner: function(ownerId) {
            return(this.has('user') && this.get('user') == ownerId);
        },
        welcome: function($el, callback) {
            var self = this;
            if(this.isUser()) {
                this.getView().getUserModel(function(user){
                    var $e = user.getWelcomeView().render().$el;
                    $e.show();
                    $el.html($e);
                });
            } else {
                return auth.prompt($el, function(){
                    self.welcome($el);
                });
            }
        }
    });
    auth.Collection = Backbone.Collection.extend({
        model: auth.Model,
        url: function() {
            if(window.config && window.config.authUrl) {
                return window.config.authUrl;
            } else {
                return "https://"+window.location.hostname+"/api/auth";
            }
        },
        initialize: function() {
            var self = this;
        },
        load: function(callback) {
            var self = this;
            this.reset();
            return this.fetch({
                update: true, remove: false,
                success: function() {
                    self.trigger("loaded", self.url);
                    if (callback) callback();
                }
            });
        }
    });
    auth.collection = new auth.Collection;
    auth.ConnectForm = Backbone.View.extend({
        tagName: "div",
        className: "connections",
        initialize: function() {
            var self = this;
        },
        render: function() {
            var loginWelcomMsg = '';
            
            if(this.options.welcomeMsg) {
                loginWelcomMsg = this.options.welcomeMsg;
            }
            
            this.$el.html(loginWelcomMsg);
            this.$el.append(this.$form);
            this.$el.append('or connect <span class="connect"><button class="connectTwitter">Twitter</button><button class="connectFacebook">Facebook</button></span>');
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .connectTwitter": "twitter",
            "click .connectFacebook": "facebook",
            "click .connectGoogle": "google"
        },
        twitter: function() {
            window.location = this.model.url() + '/twitter';
            return false;
        },
        facebook: function() {
            window.location = this.model.url() + '/facebook';
            return false;
        },
        google: function() {
            window.location = this.model.url() + '/google';
            return false;
        }
    });
    auth.LoginForm = Backbone.View.extend({
        tagName: "div",
        className: "authentication",
        render: function() {
            var loginWelcomMsg = '';
            
            if(this.options.welcomeMsg) {
                loginWelcomMsg = this.options.welcomeMsg;
            }
            
            this.$el.html(loginWelcomMsg);
            this.$el.append(this.$form);
            //this.$el.append('or Connect <span class="connect"><button class="connectTwitter">Twitter</button><button class="connectFacebook">Facebook</button></span>');
            this.$el.append(this.connectionView.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$form = $('<form id="houseAuth"><input name="email" type="email" placeholder="my@email.com" value="" required autocomplete="off" /><input style="display:none;" type="password" name="pass" placeholder="Secret password" /><input style="display:none;" type="submit" name="Join" value="Join" /><span class="msg"></span></form>');
            this.$submit = this.$form.find('input[type="submit"]');
            this.$pass = this.$form.find('input[name="pass"]');
            this.model.on("badPass", function(msg) {
                if(self.model.has('pass') && self.model.get('pass')) {
                    self.model.set({
                        pass: ""
                    }, {
                        silent: true
                    });
                    self.render();
                    self.$el.find('input[name="pass"]').focus();
                    self.$el.find(".msg").html('Bad password. <a class="resetPass" href="/">reset password</a>');
                } else {
                    self.$pass.show();
                    self.$pass.focus();
                    self.$submit.show();
                }
            });
            
            this.connectionView = new auth.ConnectForm({model: this.model});
        },
        events: {
            "submit form": "submit",
            'blur form input[name="email"]': "submit",
            'keyup input[name="email"]': "keyupsubmit",
            "click .resetPass": "resetPass"
        },
        keyupsubmit: function(e) {
            if(e.keyCode == 13) {
                this.submit(e);
            }
            return false;
        },
        twitter: function() {
            window.location = window.location.origin + '/api/auth/twitter';
            return false;
        },
        facebook: function() {
            window.location = window.location.origin + '/api/auth/facebook';
            return false;
        },
        google: function() {
            window.location = window.location.origin + '/api/auth/google';
            return false;
        },
        submit: function() {
            var email = this.$el.find('input[name="email"]').val();
            if(email == '') {
                return false;
            }
            if(email.indexOf('@') === -1) {
                alert('valid email required');
                return false;
            }
            var pass = this.$el.find('input[name="pass"]').val();
            if (false && pass.length < 6) {
                alert("longer password required");
            } else if (email.length < 4) {
                //alert("please enter an email address");
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
        resetPass: function() {
            if(confirm("Would you like to reset your password?")) {
                this.model.set({
                    resetPass: true
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
        className: "authView",
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.userModel = window.usersCollection.get(this.model.get("user"));
            if (!this.userModel) {
                //this.getUserModel(); // requires waiting for callback to be useful
            }
        },
        render: function(recursive) {
            var self = this;
            var name = this.model.get('name');
            var loginbtn;
            if (this.model.get('user')) {
                loginbtn = '<li><span class="avatar" title="'+name+'"></span></li><li class="logout">Sign out</li>';
            } else {
                loginbtn = '<li class="login">Sign in</li>';
            }
            
            this.$el.html('<button>⚙</button><menu>'+loginbtn+'</menu>'); // ⊙ ✱ ⎎ ⎈ ⍟ ⊙ 𝆗 ⎎ ⏣⎈
            if (this.userModel) {
                this.$el.find(".avatar").append(this.userModel.getAvatarView().render().el);
            } else if (this.model.has("user")) {
                if(!recursive) {
                    this.getUserModel(function(){
                        self.render(true);
                    });
                }
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
        fetchUserModel: function(callback) {
            var self = this;
            window.usersCollection.getOrFetch(self.model.get("user"), function(user) {
                self.userModel = user;
                if(callback) callback(user);
            });
        },
        getUserModel: function(callback) {
            var self = this;
             if (!this.userModel) {
                this.fetchUserModel(function(){
                    if(callback) callback(self.userModel);
                });
            } else {
                if(callback) callback(this.userModel);
            }
        },
        events: {
            "click .logout": "logout",
            "click .login": "login",
            "click .avatar": "goToProfile",
            "click button": "toggleMenu"
        },
        toggleMenu: function() {
            var v = this.$el.find('menu').css('visibility');
            if(v == 'visible') {
                this.hideMenu();
            } else {
                this.showMenu();
            }
        },
        showMenu: function() {
            this.$el.find('menu').css('visibility', 'visible');
        },
        hideMenu: function() {
            this.$el.find('menu').css('visibility', 'hidden');
        },
        goToProfile: function() {
            this.trigger("goToProfile", this.model.get("name"));
        },
        login: function() {
            var self = this;
            account.router.navigate('join', true);
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
    users.AvatarNameView = Backbone.View.extend({
        tagName: "span",
        className: "avatarName",
        render: function() {
            var self = this;
            if (this.model.has("avatar")) {
                var src = this.model.get("avatar");
                if (src.indexOf("http") === 0) {} else {
                    src = "/api/files/" + src;
                }
                this.$el.html('<img src="' + src + '" />');
            } else {
                this.$el.html("");
            }
            this.$el.append(this.model.get('name'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {},
        events: {
            click: "goToProfile"
        },
        goToProfile: function() {
            this.trigger("goToProfile", this.model);
        },
        remove: function() {
            $(this.el).remove();
        }
    });
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
                this.$el.html(""); //☺
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
            "click .edit": "editModel"
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
    feat.Form = Backbone.View.extend({
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
        getNewAvatarNameView: function(options) {
            if (!options) options = {};
            options.model = this;
            return new users.AvatarNameView(options)
        },
        getAvatarNameView: function(options) {
            if (!options) options = {};
            if (!this.hasOwnProperty("avatarNameView")) {
                this.avatarNameView = this.getNewAvatarNameView(options);
            }
            return this.avatarNameView;
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
        },
        getOrFetch: function(id, callback) {
            var self = this;
            var doc;
            doc = this.get(id);
            if(doc) {
                callback(doc);
            } else {
                var options = { "_id": id };
                this.fetch({data: options, add: true, success: function(collection, response){
                        if(response) {
                            doc = self.get(id);
                            callback(doc);
                        } else {
                            callback(false);
                        }
                    },
                    error: function(collection, response){
                        callback(false);
                    }
                });
            }
        }
    });
    
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
            var loadUsers = function() {
                require(['/users/backbone-users.js'], function(UsersBackbone){
                    self.UsersBackbone = UsersBackbone;
                    window.usersCollection = new UsersBackbone.Collection();
                    auth.get(function(err, loginStatus) {
                        if (err) {
                            alert(err);
                        } else if (loginStatus) {
                            window.account = self.loginStatus = loginStatus;
                            loginStatus.getView().on("goToProfile", function(username) {
                                self.router.navigate('user/'+username, true);
                            });
                            loginStatus.on("login", function() {
                                loginStatus.getView().render();
                                self.trigger('loggedIn', loginStatus);
                            });
                            self.$profile.append(loginStatus.getView().render().$el);
                            if (loginStatus && loginStatus.has("user")) {} else {}
                            self.trigger('init');
                        }
                    });
                });
            }
            require(['/js/config.js'], function(config){
                window.config = config;
                loadUsers();
            }, function (err) {
                window.config = {
                    "authUrl": "https://"+window.location.hostname+"/api/auth"
                };
                loadUsers();
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
        navToMe: function() {
            console.log(this.loginStatus.getView().userModel);
            var user = this.loginStatus.getView().userModel;
            this.navToUser(user);
        },
        join: function() {
            self.router.navigate('join', true);
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.route("join", "join", function() {
                if(self.loginStatus.has('user')) {
                    self.router.navigate('', true);
                    return;
                }
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
                
                usersCollection.getOrFetchName(path, function(user){
                    self.navToUser(user);
                });
            });
            router.on('reset', function() {
                if(self.userLightbox) {
                    self.userLightbox.remove();
                }
                if(account && account.loginStatus) {
                    account.loginStatus.getView().hideMenu();
                }
            });
        }
    });
    
    var account = new ProfileView;
    if (define) {
        define(function() {
            return account;
        });
    }
})();
