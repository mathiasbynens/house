(function() {
    function createCookie(name,value,days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            var expires = "; expires="+date.toGMTString();
        } else {
            var expires = "";
        }
        //var domain = window.location.hostname;
        document.cookie = name+"="+value+expires+"; path=/; domain=";
    }
    var auth = {};
    auth.get = function(callback) {
        var self = this;
        this.collection.bind("add", function(doc) {
            self.model = doc;
            var sid = doc.get('sid');
            if(document.cookie.indexOf(sid) === -1) {
                createCookie('SID',doc.get('sid'));
            }
            callback(null, doc);
        });
        this.collection.load();
    };
    auth.prompt = function($el, options, callback) {
        var thisPrompt = this;
        if(typeof options === 'function') {
            callback = options;
            options = {};
        }
        if(!options) {
            options = {};
        }
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
        options.model = this.model;
        this.authView = new this.LoginForm(options);
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
                    profileView.loadUser();
                    profileView.render();
                    
                    // render nav
                    account.view.nav.list.render();
                    
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
                var hostPath = window.location.hostname;
                if(window.location.port) {
                    hostPath = hostPath + ':' + window.location.port;
                }
                return "https://"+hostPath+"/api/auth";
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
                if(this.ui) {
                    options.ui = this.ui;
                }
                this.view = new auth.View(options);
            }
            return this.view;
        },
        isAdmin: function(callback) {
            var b = (this.has('groups') && this.get('groups').indexOf('admin') !== -1);
            if(callback) {
                callback(b);
            }
            return b;
        },
        isUser: function() {
            return(this.has('user'));
        },
        isOwner: function(ownerId) {
            return(this.has('user') && this.get('user') == ownerId);
        },
        welcome: function($el, options, callback) {
            var self = this;
            if(typeof options === 'function') {
                callback = options;
                options = {};
            }
            if(!options) {
                options = {};
            }
            if(this.isUser()) {
                this.getView().getUserModel(function(user){
                    console.log(options)
                    var $e = user.getWelcomeView(options).render().$el;
                    $e.show();
                    $el.html($e);
                });
            } else {
                return auth.prompt($el, options, function(){
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
            var xhr = this.fetch({
                update: true, remove: false,
                success: function() {
                    self.trigger("loaded", self.url);
                    if (callback) callback();
                }
            });
            return xhr;
        }
    });
    auth.collection = new auth.Collection;
    auth.ConnectForm = Backbone.View.extend({
        tagName: "div",
        className: "connections container text-center",
        initialize: function(options) {
            var self = this;
            this.ui = {
                connectLabel: "or connect with: ",
                emailLabel: "Email"
            }
            for(var i in options.ui) {
                this.ui[i] = options.ui[i];
            }
        },
        render: function() {
            this.$el.append('<button class="connectEmail zocial email">'+this.ui.emailLabel+'</button>\n\
    <button class="connectTwitter zocial twitter">Twitter</button>\n\
    <button class="connectFacebook zocial facebook">Facebook</button>\n\
    <button class="connectGoogle zocial googleplus">Google</button>');
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .connectEmail": "email",
            "click .connectTwitter": "twitter",
            "click .connectFacebook": "facebook",
            "click .connectGoogle": "google"
        },
        email:  function() {
            this.trigger("email");
            return false;
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
        initialize: function(options) {
            var self = this;
            //self.state = 'reset';
            this.ui = {
                emailLabel: "Email",
                connectLabel: "",
                footerLabel: "* we'll never spam you or your friends",
                joinTitle: "Welcome",
                joinMsg: "Become a member:"
            }
            this.klasses = {
                "dialog": "dialog",
                "title": "title",
                "header": "header",
                "content": "content",
                "body": "body",
                "footer": "footer"
            }
            if(options.modal) {
                this.klasses = {
                    "dialog": "modal-dialog",
                    "title": "modal-title",
                    "header": "modal-header",
                    "content": "modal-content",
                    "body": "modal-body",
                    "footer": "modal-footer"
                }
            }
            for(var i in options.ui) {
                this.ui[i] = options.ui[i];
            }
            for(var i in options.klasses) {
                this.klasses[i] = options.klasses[i];
            }
            this.$joinMsg = $('<span class="welcomeLabel"></span>');
            this.$form = $('<form id="houseAuth" class="form-signin">\n\
    <div class="msg alert alert-danger" style="display:none;"></div>\n\
    <input class="form-control" style="display:none;" name="email" type="email" placeholder="my@email.com" value="" required autocomplete="off" tabindex=1 />\n\
    <input class="form-control" style="display:none;" type="password" name="pass" placeholder="Secret password" tabindex=2 />\n\
    <input class="btn btn-lg btn-primary btn-block" style="display:none;" type="submit" name="Sign in" value="Sign in" tabindex=3 />\n\
</form>');
            this.$submit = this.$form.find('input[type="submit"]');
            this.$pass = this.$form.find('input[name="pass"]');
            this.onbadpass = this.model.on("badPass", function(msg) {
                self.hideLoading();
                if(self.model.has('pass') && self.model.get('pass')) {
                    self.model.set({
                        pass: ""
                    }, {
                        silent: true
                    });
                    //self.state = 'badPass';
                    //self.render();
                    self.$pass.val('');
                    self.$pass.focus();
                    self.$form.find(".msg").html('Invalid login. If needed you can <a class="resetPass" href="/">reset</a> your password.');
                    self.$form.find(".msg").show();
                } else {
                    console.log('no pass')
                    self.$form.find(".msg").hide();
                    self.$el.find('input[name="email"]').hide();
                    self.$submit.show();
                    self.$pass.show().focus();
                }
            });
            
            this.connectionView = new auth.ConnectForm({model: this.model, ui: {connectLabel: this.ui.connectLabel}});
            this.connectionView.on('email', function(){
                self.connectEmail();
            });
            this.model.on('change', function(){
                self.showLoading();
            })
        },
        render: function() {
            this.$el.addClass(this.klasses.dialog);
            var closeBtn = '';
            if(this.options.modal) {
                closeBtn = '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>';
            }
            this.$el.html('<div class="'+this.klasses.content+'">\n\
  <div class="'+this.klasses.header+'">'+closeBtn+'\n\
    <h4 class="'+this.klasses.title+'">'+this.ui.joinTitle+'</h4>\n\
  </div>\n\
  <div class="'+this.klasses.body+'">\n\
  </div>\n\
  <div class="'+this.klasses.footer+' text-muted">\n\
    <div class="progress progress-striped active" style="display:none;">\n\
      <div class="progress-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%">\n\
        <span class="sr-only">Loading</span>\n\
      </div>\n\
    </div>\n\
  </div>\n\
</div>');
            this.$el.find('.'+this.klasses.footer).append(this.ui.footerLabel);
            this.$joinMsg.html(this.ui.joinMsg);
            this.$el.find('.'+this.klasses.body).append(this.$joinMsg);
            this.$el.find('.'+this.klasses.body).append(this.$form);
            //this.$el.append('or Connect <span class="connect"><button class="connectTwitter">Twitter</button><button class="connectFacebook">Facebook</button></span>');
            this.$el.find('.'+this.klasses.body).append(this.connectionView.render().$el);
            this.setElement(this.$el);
            return this;
        },
        hideLoading: function() {
            this.$el.find('.progress').hide();
            this.$submit.removeAttr('disabled');
            if(this.prevSubmitVal) {
                this.$submit.val(this.prevSubmitVal);
            }
        },
        showLoading: function() {
            this.$el.find(".msg").hide();
            this.$el.find('.progress').show();
            this.$submit.attr('disabled', 'disabled');
            this.prevSubmitVal = this.$submit.val();
            this.$submit.val('Loading...');
        },
        events: {
            "submit form": "submit",
            'blur form input[name="email"]': "submit",
            'keyup input[name="email"]': "keyupsubmit",
            'keyup input[name="pass"]': "keyupsubmit",
            "click .resetPass": "resetPass",
            "click .connectEmail": "connectEmail"
        },
        connectEmail: function() {
            //this.$el.find('.connectEmail').hide();
            this.$form.show().siblings().hide();
            this.$el.find('input[name="email"]').show();
            this.$el.find('input[name="email"]').focus();
            return false;
        },
        resetForm: function() {
            
            this.model.set({
                email: '',
                pass: null,
                name: null
            }, {silent: true});
            
            this.$form.hide().siblings().show();
            this.$el.find('input[name="email"]').val('');
            this.$el.find('input[name="email"]').show().siblings().hide();
        },
        keyupsubmit: function(e) {
            if(e.keyCode == 13) {
                this.submit(e);
            } else if(e.keyCode == 27) {
                this.resetForm();
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
                this.$el.find(".msg").html('valid email required').show();;
                return false;
            }
            var pass = this.$el.find('input[name="pass"]').val();
            if (false && pass.length < 6) {
                this.$el.find(".msg").html("longer password required").show();;
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
                this.$el.find(".msg").html("Please check your email for a message from us with steps to reset your password.");
            }
            return false;
        },
        focus: function() {
            this.$el.find("input").first().focus();
        },
        remove: function() {
            this.model.off("badPass");
            this.$el.remove();
        }
    });
    auth.View = Backbone.View.extend({
        //tagName: "span",
        //className: "authView",
        initialize: function(options) {
            var self = this;
            this.ui = {
                accountMenuLabel: "⚙"
            }
            for(var i in options.ui) {
                this.ui[i] = options.ui[i];
            }
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.userModel = window.usersCollection.get(this.model.get("user"));
            if (!this.userModel) {
                //this.getUserModel(); // requires waiting for callback to be useful
            }
            require(['/msgs/msgs.js'], function(MsgsBackbone){
                if(!window.MsgsBackbone) {
                    window.MsgsBackbone = MsgsBackbone;
                }
                if(!window.msgsCollection) {
                    window.msgsCollection = new MsgsBackbone.Collection(); // collection
                }
            });
            
            require(['/account/nav.js'], function(nav){
                self.nav = nav;
                nav.init({el: $('header.navbar')});
                //nav.list.showMenu();
                nav.list.on('selected', function(navRow){
                    //self.hideMenu();
                });
                self.trigger('navInit', self.nav);
            });
            this.$guestMenu = $('<li class="login"><a href="/join">Sign in</a></li><li class="feedback"><a href="/feedback">Feedback</a></li>');
            this.$userMenu = $('<li class="current-user"><a href="/me" class="profile"></a></li><li class="feedback"><a href="/feedback">Feedback</a></li><li class="logout"><a href="/leave">Sign out</a></li>');
        },
        onNavInit: function(callback) {
            var self = this;
            if(this.nav) {
                callback(this.nav);
            } else {
                this.on('navInit', function(){
                    callback(self.nav);
                });
            }
        },
        render: function(recursive) {
            var self = this;
            var name = this.model.get('name');
            this.$el.html('');
            //this.$el.html('<button>'+accountMenuStr+'</button><menu class="mainMenu">'+loginbtn+'</menu>'); // ⊙ ✱ ⎎ ⎈ ⍟ ⊙ 𝆗 ⎎ ⏣⎈
            var accountMenuStr = this.ui.accountMenuLabel;
            
            if (this.model.get('user')) {
                this.$el.prepend(this.$userMenu);
                this.$guestMenu.remove();
            } else {
                this.$el.prepend(this.$guestMenu);
                this.$userMenu.remove();
            }
            
            if (this.userModel) {
                this.$el.find(".profile").append(this.userModel.getAvatarView().render().el);
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
        updateUi: function(ui) {
            //loginStatus.getView().render();
            this.ui = ui;
            this.render();
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
            "click .profile": "goToProfile",
            "click .feedback": "feedback",
            "click menu.mainMenu": "clickMenu",
            "click button": "toggleMenu"
        },
        clickMenu: function(e) {
            if(e.target.className == 'mainMenu') {
                this.toggleMenu();
            } else {
                
            }
        },
        toggleMenu: function() {
            var v = this.$el.find('menu.mainMenu').css('visibility');
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
        goToProfile: function(e) {
            this.trigger("goToProfile", this.model.get("name"));
            e.preventDefault();
        },
        feedback: function(e) {
            var self = this;
            require(['/msgs/msgs.js'], function(MsgsBackbone){
                if(MsgsBackbone) {
                    var msgOpts = {
                        formTitle: "Contact Us",
                        sendPlaceholder: "Send Message",
                        msgPlaceholder: "Your message and info.",
                        subjectPlaceholder: "Subject of your feedback",
                        msgLabel: "Leave your contant info, and we'll get back to you as soon as possible.",
                        subjectLabel: "How can we help you?"
                    };
                    self.feedbackForm = new window.MsgsBackbone.Form({
                        collection: window.msgsCollection,
                        ui: msgOpts
                    });
                    var lightbox = utils.appendLightBox(self.feedbackForm.render().$el, msgOpts.formTitle);
                    self.feedbackForm.focus();
                    self.feedbackForm.on("saved", function(doc) {
                        self.feedbackForm.clear();
                        alert('Thank you for your feedback!');
                        lightbox.remove();
                    });
                } else {
                }
            });
            e.preventDefault();
        },
        login: function(e) {
            var self = this;
            profileView.router.navigate('join', {trigger: true});
            e.preventDefault();
        },
        logout: function(e) {
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
            e.preventDefault();
        },
        remove: function() {
            this.$el.remove();
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
            this.$el.remove();
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
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
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
        initialize: function() {
            var self = this;
            self.authFormOptions = {
                ui: {
                    welcomeLabel: "Join now!"
                },
                modal: true
            }
            var loadUsers = function() {
                require(['/users/backbone-users.js'], function(UsersBackbone){
                    self.UsersBackbone = UsersBackbone;
                    window.usersCollection = new UsersBackbone.Collection();
                    if(navigator.userAgent.indexOf('HouseJs HTML Cacher') !== -1) {
                        window.account = self.loginStatus = new auth.Model();
                        //self.$profile.append(self.loginStatus.getView().render().$el);
                        self.loginStatus.getView({el: $('#accountMenu')}).render();
                        self.trigger('init');
                    } else {
                        auth.get(function(err, loginStatus) {
                            if (err) {
                                alert(err);
                            } else if (loginStatus) {
                                window.account = self.loginStatus = loginStatus;
                                loginStatus.getView({el: $('#accountMenu')})
                                .on("goToProfile", function(username) {
                                    self.router.navigate('user/'+username, {trigger: true});
                                })
                                .on("login", function() {
                                    loginStatus.getView().render();
                                    self.trigger('loggedIn', loginStatus);
                                })
                                .render();
                                
                                if (loginStatus && loginStatus.has("user")) {} else {}
                                self.trigger('init');
                            }
                        });
                    }
                });
            }
            var confPath = '/js/config.js';
            require([confPath], function(config){
                window.config = config;
                loadUsers();
            }, function (err) {
                window.config = {
                    "authUrl": "https://"+window.location.hostname+"/api/auth"
                };
                loadUsers();
            });
        },
        render: function() {
            var self = this;
            //this.$el.append(this.$profile);
            return this;
        },
        updateUi: function(ui) {
            var self = this;
            self.authFormOptions.ui = ui;
            //loginStatus.getView().render();
            if(self.loginStatus) {
                self.loginStatus.getView().updateUi(ui);
            } else {
                self.on('init', function(){
                    self.loginStatus.getView().updateUi(ui);
                });
            }
        },
        auth: function(callback) {
            if(this.loginStatus) {
                callback();
            } else {
                this.on('init', callback);
            }
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
            var userView = user.getUserView({profile: this});
            
            var $el = userView.render().$el;
            $el.show();
            this.userModal = utils.appendLightBox($el);
            
            this.userModal.$el.on('hide.bs.modal', function () {
                userView.remove();
                self.userModal.remove();
                self.router.back();
            })
        },
        navToMe: function() {
            var user = this.loginStatus.getView().userModel;
            this.navToUser(user);
        },
        join: function() {
            self.router.navigate('join', {trigger: true});
        },
        navigateToJoin: function(path) {
            var self = this;
            if(!path) {
                path = '';
            }
            if(self.loginStatus.has('user')) {
                self.router.navigate(path, {trigger: true});
                return;
            }
            if($('#joinModal').length === 0) {
                self.$join = $('<div id="joinModal" class="modal"></div>');
                $('body').append(self.$join);
                auth.prompt(self.$join, self.authFormOptions).authorized(function() {
                    self.$join.modal('hide');
                });
                self.$join.on('hide.bs.modal', function () {
                    auth.authView.remove();
                    self.$join.remove();
                    if(self.router) {
                        self.router.back();
                    }
                })
                self.$join.modal();
            }
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.route("join", "join", function() {
                self.navigateToJoin();
                //self.router.navigate('join/', {trigger: true});
            });
            router.route("join/*path", "joinPath", function(path) {
                self.navigateToJoin(path);
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
                if(self.$join) {
                    auth.authView.remove();
                    self.$join.remove();
                    $('body>.modal-backdrop').remove();
                    delete self.$join;
                }
                $('body').removeClass('modal-open');
                /*
                if(account && account.loginStatus) {
                    var accountLoginStatusView = account.loginStatus.getView();
                    if(accountLoginStatusView) {
                        accountLoginStatusView.hideMenu();
                    }
                }*/
            });
        }
    });
    
    var profileView = new ProfileView;
    if (define) {
        define(function() {
            return profileView;
        });
    }
})();
