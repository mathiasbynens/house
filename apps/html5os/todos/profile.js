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
                name: ""
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
                thisPrompt.onAuthCb(thisPrompt.user);
            }
        });
        $el.html(this.authView.render().el);
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
            this.on("change", function(model, options) {
                var s = model.save(null, {
                    silent: true
                }).done(function(s, typeStr, respStr) {
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
            this.$el.html('<h4>Welcome to Askao,</h4><p>Join to place an order, leave reviews, and earn rewards!</p>');
            this.$el.append('<span class="connect"><button class="connectTwitter">Connect Twitter</button><button class="connectFacebook">Connect Facebook</button></span>');
            var $form = $('<form id="houseAuth"><input type="text" name="name" placeholder="username" value="" autocomplete="off" /><input type="password" name="pass" placeholder="password" /><input type="submit" name="Join" value="Join" /><span class="msg"></span></form>');
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
            var name = this.$el.find('input[name="name"]').val();
            var pass = this.$el.find('input[name="pass"]').val();
            if (pass.length < 6) {
                alert("longer password required");
            } else if (name.length < 4) {
                alert("name must be longer");
            } else {
                this.model.set({
                    name: name,
                    pass: pass
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
    auth.UploadAvatarView = Backbone.View.extend({
        render: function() {
            var self = this;
            this.$input = $('<input type="file" multiple accept="image/*">');
            this.$input.on("change", function(e) {
                self.inputChange(e.target.files);
            });
            this.$el.html("");
            this.$el.append(this.$input);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {},
        events: {},
        remove: function() {
            $(this.el).remove();
        },
        updateAvatar: function(filename) {
            var self = this;
            this.model.set({
                avatar: filename
            });
            this.model.save(null, {
                silent: true,
                wait: true
            }).done(function() {
                console.log("saved avatar " + filename);
                self.model.getAvatarView().render();
                self.trigger("updated", filename);
            });
        },
        inputChange: function(files) {
            var self = this;
            function uploadFile(blobOrFile, options) {
                var callback = options.complete;
                var progress = options.progress;
                var formData = new FormData;
                var xhr = new XMLHttpRequest;
                var onReady = function(e) {};
                var onError = function(err) {};
                formData.append("files", blobOrFile);
                xhr.open("POST", "/api/files", true);
                xhr.addEventListener("error", onError, false);
                xhr.addEventListener("readystatechange", onReady, false);
                xhr.onload = function(e) {
                    console.log("upload complete");
                    var data = JSON.parse(e.target.response);
                    callback(data);
                };
                xhr.upload.onprogress = function(e) {
                    if (e.lengthComputable && progress) {
                        progress(e.loaded / e.total * 100);
                    }
                };
                xhr.send(formData);
            }
            var queue = [];
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var path = file.webkitRelativePath || file.mozFullPath || file.name;
                if (path.indexOf(".AppleDouble") != -1) {
                    continue;
                }
                var size = file.size || file.fileSize || 4096;
                if (size < 4095) {
                    continue;
                }
                queue.push(file);
            }
            var process = function() {
                if (queue.length) {
                    console.log(queue);
                    var f = queue.shift();
                    var $localFile = $('<div class="localFile"></div>');
                    $localFile.append('<progress min="0" max="100" value="0" style="display:none;">0% complete</progress>');
                    self.$el.append($localFile);
                    $localFile.find("progress").show();
                    uploadFile(f, {
                        complete: function(data) {
                            $localFile.remove();
                            self.updateAvatar(data.file.filename);
                        },
                        progress: function(percent) {
                            self.$el.find("progress").val(percent);
                        }
                    });
                    process();
                    var lq = queue.length;
                    setTimeout(function() {
                        if (queue.length == lq) {
                            process();
                        }
                    }, 300);
                }
            };
            process();
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
                loginbtn = '<li class="logout">Sign out</li>';
            } else {
                loginbtn = '<li class="login">Sign in</li>';
            }
            
            this.$el.html('<span class="user"><menu><li><span class="avatar" title="'+name+'"></span><span class="name">'+name+'</span></li><li class="achievements">Achievements</li><li class="history">History</li><li class="settings">Settings</li>'+loginbtn+'</menu></span>');
            if (this.userModel) {
                this.$el.find(".avatar").append(this.userModel.getAvatarView().render().el);
            } else if (this.model.has("user")) {
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
            this.$upload = $('<div class="upload"></div>');
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
            "click .avatar": "uploadAvatar",
            "click .name": "goToProfile",
            "click .achievements": "goToProfile"
        },
        goToProfile: function() {
            this.trigger("goToProfile", this.model.get("name"));
        },
        uploadAvatar: function() {
            this.$el.append(this.$upload);
            var uploadView = new auth.UploadAvatarView({
                el: this.$upload,
                model: this.userModel
            });
            uploadView.render();
            uploadView.$el.find('input').click();
        },
        login: function(callback) {
            var self = this;
            this.$loginLightbox = utils.appendLightBox("");
            var $auth = this.$loginLightbox.find("div");
            auth.prompt($auth).authorized(function(loginStatus) {
                self.$loginLightbox.remove();
                if(callback) {
                    callback();
                }
            });
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
    
    var AchCaseView = Backbone.View.extend({
        tagName: "div",
        className: "achCase",
        render: function() {
            var self = this;
            this.$el.html('');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
        }
    });
    
    users.PatronView = Backbone.View.extend({
        tagName: "span",
        className: "patron",
        render: function() {
            var self = this;
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
            this.$el.append('<p class="basicInfo">Patron since '+atFmt+'</p>');
            this.$el.append('<h3>Your Points</h3><ul class="recent"><li>+12 Welcome!</li><li>+30 order placed</li></ul><div class="total"></div>');
            this.$el.find('.total').html('<span class="num">42</span> Patron Points');
            this.$el.append('<h3>Achievements</h3>');
            this.$el.append('<div class="achievements"></div>');
            this.$el.find('.achievements').html(this.achCase.render().$el);
            
            this.options.profile.isAdmin(function(isAdmin){
                self.$actions = $('<ul class="actions"></ul>');
                self.$actions.append('<li class="newAchievement">Add Achievement</li>');
                self.$el.append(self.$actions);
            });
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            
            this.achCase = new AchCaseView();
            
        },
        events: {
            "click .newAchievement": "newAchievement",
        },
        newAchievement: function() {
            
            return false;
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
            this.$lightDiv = $("<div></div>");
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
        getPatronView: function(options) {
            if (!options) options = {};
            if (!this.hasOwnProperty("patronView")) {
                options.model = this;
                this.patronView = new users.PatronView(options);
            }
            return this.patronView;
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
            this.$el.html("");
            this.$el.append(this.$profile);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$profile = $('<div id="me"></div>');
            auth.get(function(err, loginStatus) {
                if (err) {} else if (loginStatus) {
                    self.loginStatus = loginStatus;
                    loginStatus.getView().on("goToProfile", function(username) {
                        self.router.navigate('patron/'+username, true);
                    });
                    loginStatus.on("login", function(loginStatus) {
                        self.loginStatus = loginStatus;
                        self.$profile.html(loginStatus.getView().render().el);
                    });
                    self.$profile.html(loginStatus.getView().render().el);
                    if (loginStatus && loginStatus.has("user")) {} else {}
                    self.trigger('init');
                }
            });
        },
        isAdmin: function(callback) {
            var self = this;
            self.loginStatus.getView().getUserModel(function(user){
                callback(user && user.has('groups') && user.get('groups').indexOf('admin') !== -1);
            });
        },
        navToPatron: function(user) {
            var self = this;
            var $e = user.getPatronView({profile: this}).render().$el;
            $e.show();
            this.$el.append($e);
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.route("me", "profile", function() {
                self.router.navigate('me/', {trigger: true, replace: true});
                $('#me').siblings().hide();
                $('#me').show();
            });
            router.route("me/*path", "profile", function(path) {
                router.reset();
                self.$el.parent().show();
                router.setTitle("Me");
                $('#me').siblings().hide();
                $('#me').show();
            });
            router.route("patron/*path", "patron", function(path) {
                router.reset();
                self.$el.parent().show();
                router.setTitle(path);
                $('#me').hide();
                
                usersCollection.getByName(path, function(user){
                    console.log(user);
                    self.navToPatron(user);
                });
            });
        }
    });
    
    var profile = new ProfileView;
    
    if (define) {
        define(function() {
            return profile;
        });
    }
})();