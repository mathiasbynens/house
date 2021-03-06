(function() {
    
    var Model = Backbone.House.Model.extend({
        collectionName: "msgs",
        initialize: function(attr, options) {
            var self = this;
            this.TableRowView = RowView;
            this.RowView = RowView;
            this.AvatarView = RowView;
            this.FullView = RowView;
            options = options || {};
            options.ownerFieldName = 'from';
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        getFrom: function(callback) {
            if(this.has('from')) {
                var from = this.get('from');
                if(from.id) {
                    window.usersCollection.getOrFetch(from.id, callback);
                } else if(to.name) {
                    window.usersCollection.getOrFetchName(from.name, callback);
                }
            }
        },
        getTo: function(callback) {
            if(this.has('to')) {
                var to = this.get('to');
                if(to.id) {
                    window.usersCollection.getOrFetch(to.id, callback);
                } else if(to.name) {
                    window.usersCollection.getOrFetchName(to.name, callback);
                }
            }
        },
        getNewAvatarNameView: function(options) {
            if (!options) options = {};
            options.model = this;
            return new AvatarNameView(options)
        },
        getAvatarNameView: function(options) {
            if (!options) options = {};
            options.model = this;
            if (!this.hasOwnProperty("avatarNameView")) {
                this.avatarNameView = this.getNewAvatarNameView(options);
            }
            return this.avatarNameView;
        },
        getUserView: function(options) {
            return this.getFullView(options);
        },
        slugStr: function(str) {
            return str.toLowerCase().replace(/ /gi, '-');
        },
        setSlug: function(slug) {
            this.set('slug', this.slugStr(slug));
        },
    });
    
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'msgs',
        url: '/api/msgs',
        getOrFetchName: function(slug, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({name:slug}));
            if(doc) {
                callback(doc);
            } else {
                var options = { "name": slug };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = _.first(self.where({name:slug}));
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
        },
    });
    
    var ListView = Backbone.View.extend({
        layout: 'row',
        initialize: function() {
            var self = this;
            self.loading = false;
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> messages</div>');
            var $ul = this.$ul = $('<ul class="images"></ul>');
            this.collection.on('add', function(doc) {
                var view;
                if(self.layout === 'row') {
                    view = doc.getRow({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatar({list: self});
                }
                self.appendRow(view);
                self.renderPager();
                doc.on('remove', function(){
                    view.$el.remove();
                    return false;
                });
            });
            this.collection.on('remove', function(doc, col, options) {
                self.renderPager();
            });
            this.collection.on('count', function() {
                self.renderPager();
            });
            this.collection.on('reset', function(){
                self.render();
            });
            
            $(window).scroll(function(){
                if(self.$el.is(":visible")) {
                  if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()){
                    self.loading = true;
                    self.loadMore();
                  }
                }
            });
        },
        filter: function(f) {
            var self = this;
            if(f && typeof f == 'function') {
                this.currentFilter = f;
                this.collection.filter(function(model) {
                  if(f(model)) {
                      self.getDocLayoutView(model).$el.show();
                      return true;
                  }
                  self.getDocLayoutView(model).$el.hide();
                  return false;
                });
            } else {
                // show all
                self.$ul.children().show();
                self.currentFilter = false;
            }
        },
        events: {
          "click .list-pager": "loadMore"
        },
        loadMore: function() {
            var self = this;
            this.collection.getNextPage(function(){
                self.loading = false;
            });
        },
        getDocLayoutView: function(doc) {
            var view;
            if(this.layout === 'row') {
                view = doc.getRow({list: this});
            } else if(this.layout === 'avatar') {
                view = doc.getAvatar({list: this});
            }
            return view;
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append(this.$ul);
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view = self.getDocLayoutView(doc);
                self.appendRow(view);
            });
            this.$el.append(this.$pager);
            this.renderPager();
            this.trigger('resize');
            this.setElement(this.$el);
            return this;
        },
        renderPager: function() {
            var len = this.collection.length;
            var c = this.collection.count > len ? this.collection.count : len;
            this.$pager.find('.list-length').html(len);
            this.$pager.find('.list-count').html(c);
        },
        appendRow: function(row) {
            var rank = new Date(row.model.get('at'));
            rank = rank.getTime();
            var rowEl = row.render().$el;
            if(this.currentFilter && !this.currentFilter(row.model)) {
                rowEl.hide();
            }
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$ul.children();
            var last = $lis.last();
            var lastRank = parseInt(last.attr('data-sort-rank'), 10);
            if(rank > lastRank) {
                $lis.each(function(i,e){
                    if(d) return;
                    var r = parseInt($(e).attr('data-sort-rank'), 10);
                    if(rank > r) {
                        $(e).before(rowEl);
                        d = true;
                    }
                });
            }
            if(!d) {
                this.$ul.append(rowEl);
            }
        }
    });
    
    var AvatarNameView = Backbone.View.extend({
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

    var RowView = Backbone.View.extend({
        tagName: "li",
        className: "row",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        render: function() {
            var self = this;
            this.$el.html('');
            var $byline = $('<span class="byline"></span>');
            this.$el.append('<span class="avatar"></span>');
            if(this.model.has('from')) {
                this.$el.append('<strong class="from">'+this.model.get('from').name+'</strong>');
                this.model.getFrom(function(from){
                    if(from) {
                        self.$el.find('.from').html(from.getNewAvatarNameView().render().$el);
                    }
                });
            }
            if(this.model.has('to')) {
                this.$el.append('<strong class="to">'+this.model.get('to').name+'</strong>');
            }
            if(this.model.has('txt')) {
                this.$el.append('<span class="txt">'+this.model.get('txt')+'</span>');
            }
            if(this.model.has('at')) {
                var $at = $('<span class="at"></span>');
                if(window.clock) {
                    $at.attr('title', clock.moment(this.model.get('at')).format('LLLL'));
                    $at.html(clock.moment(this.model.get('at')).calendar());
                } else {
                    $at.html(this.model.get('at'));
                }
                $byline.append($at);
            }
            this.$el.append($byline);
            this.$el.attr('data-id', this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select"
        },
        select: function(e) {
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.hasOwnProperty('list')) {
                this.list.trigger('select', this);
            }
            this.trigger('select');
            this.trigger('resize');
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    var FullView = Backbone.View.extend({
        tagName: "div",
        className: "fullView",
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            var self = this;
            var isa = (window.account && (account.isAdmin() || account.isOwner(this.model.id)));
            this.$el.html('');
            var $byline = $('<span></span>');
            var displayName = this.model.get('displayName') || this.model.get('name');
            this.$el.append('<h1 class="displayName">'+displayName+'</h1>');
            this.$el.append('<h2 class="name">'+this.model.get('name')+'</h2>');
            
            this.$el.append('<span class="avatar"></span>');
            if (this.model.has("avatar") && this.model.get("avatar")) {
                var src = this.model.get("avatar");
                if (typeof src == 'string') {
                } else if(src.hasOwnProperty('url')) {
                    src = src.url;
                }
                if (src.indexOf("http") === 0) {
                    
                } else {
                    src = "/api/files/" + src;
                }
                this.$el.find('.avatar').append('<img src="' + src + '" />');
            }
            
            if(isa) {
                this.$el.find('h1').append('<a class="editDisplayName" title="Edit display name" href="#">edit real name</a>');
                this.$el.find('h2').append('<a class="editName" title="Edit user name" href="#">edit user name</a>');
                this.$el.find('h2').append('<a class="editPass" title="Edit user password" href="#">change password</a>');
                this.$el.find('.avatar').append('<a class="editAvatar" title="Upload avatar" href="#">upload avatar</a>');
            }
            
            if (this.model.has("url") || isa) {
                var src = this.model.get("url") || 'http://yourwebsite.com/';
                this.$el.append('<span class="url"><a href="'+src+'" target="_new">' + src + '</a></span>');
                if(isa) {
                    this.$el.find('.url').append('<a class="editUrl" title="Edit web address" href="#">edit URL</a>');
                }
            }
            
            if(this.model.has('at')) {
                var $at = $('<span class="at"></span>');
                if(window.clock) {
                    $at.attr('title', clock.moment(this.model.get('at')).format('LLLL'));
                    $at.html(clock.moment(this.model.get('at')).calendar());
                } else {
                    $at.html(this.model.get('at'));
                }
                $byline.append(' member since ');
                $byline.append($at);
            }
            if(this.model.has('email')) {
                var $msg = $('<div class="email"></div>');
                $msg.html(this.model.get('email'));
                
                if(window.account && (account.isAdmin() || account.isOwner(this.model.id))) {
                    $msg.append('<a class="editEmail" title="Edit email address" href="#">edit email</a>');
                }
                
                this.$el.append($msg);
            }
            this.$el.append($byline);
            
            if(window.account && (account.isAdmin() || account.isOwner(this.model.id))) {
                this.$el.append(this.actions.render().$el);
            }
            this.setElement(this.$el);
            return this;
        },
        renderActions: function() {
            this.actions.render();
        },
        show: function() {
            this.$el.show();
        },
        events: {
            "click .editEmail": "editEmail",
            "click .editName": "editName",
            "click .editPass": "editPass",
            "click .editDisplayName": "editDisplayName",
            "click .editUrl": "editUrl",
            "click .editAvatar": "editAvatar"
        },
        editPass: function() {
            var self = this;
            var txt = prompt("Enter your current, soon to be old password");
            if(txt) {
                var newPass = prompt("Enter a new password");
                var newPassCheck = prompt("And prove that you didn't forget it already");
                if(newPass && newPassCheck && newPass == newPassCheck) {
                    this.model.set({'oldPass': txt, 'pass': newPass}, {silent: true});
                    var saveModel = this.model.save(null, {
                        silent: false ,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.render();
                            alert('Password changed.');
                        });
                        saveModel.fail(function(s, typeStr, respStr) {
                            alert('Your password was incorrect');
                        });
                    }
                } else {
                    alert("That didn't take long!");
                }
            }
            return false;
        },
        editEmail: function() {
            var self = this;
            var txt = prompt("Enter your new email address", this.model.get('email'));
            if(txt && txt !== this.model.get('email')) {
                this.model.set({'email': txt}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false ,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                    saveModel.fail(function(s, typeStr, respStr) {
                        alert('That email address is already in use.');
                    });
                }
            }
            return false;
        },
        editName: function() {
            var self = this;
            var txt = prompt("Enter your new user name", this.model.get('name'));
            if(txt && txt !== this.model.get('name')) {
                this.model.set({'name': txt}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false ,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                    saveModel.fail(function(s, typeStr, respStr) {
                        alert('That username is unavailable.');
                    });
                }
            }
            return false;
        },
        editDisplayName: function() {
            var self = this;
            var d = this.model.get('displayName') || this.model.get('name');
            var txt = prompt("Enter your new display name", d);
            if(txt && txt !== this.model.get('name')) {
                this.model.set({'displayName': txt}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false ,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
            return false;
        },
        editUrl: function() {
            var self = this;
            var txt = prompt("Enter your URL", this.model.get('url'));
            if(txt && txt !== this.model.get('url')) {
                this.model.set({'url': txt}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false ,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
            return false;
        },
        editAvatar: function() {
            var self = this;
            if(window.FilesBackbone) {
                self.uploadFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'image', metadata:{groups: ['public']}});
                self.uploadFrame.on('uploaded', function(data){
                    if(_.isArray(data)) {
                        data = _.first(data);
                    }
                    if(data.image) {
                        var setDoc = {
                            image: data.image
                        }
                        var avatar = data.image.filename;
                        if(data.image.sizes) {
                            if(data.image.sizes.thumb) {
                                avatar = data.image.sizes.thumb.filename;
                            }
                        }
                        setDoc.avatar = avatar;
                        self.model.set(setDoc, {silent: true});
                        var saveModel = self.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        if(saveModel) {
                            saveModel.done(function() {
                                self.render();
                                self.uploadFrame.remove();
                            });
                        }
                    }
                });
                this.$el.find('.avatar').append(this.uploadFrame.render().$el);
                self.uploadFrame.pickFiles();
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    
    window.nl2br = function(str) {
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + "<br />");
    };
    
    var AvatarView = Backbone.View.extend({
        tagName: "span",
        className: "avatar",
        render: function() {
            this.$el.html('');
            var $byline = $('<span class="byline"></span>');
            if(this.model.has('title')) {
                this.$el.append('<strong class="title">'+this.model.get('title')+'</strong>');
            }
            if(this.model.has('owner')) {
                $byline.append(' by '+this.model.get('owner').name);
            }
            if(this.model.has('msg')) {
                var $msg = $('<span class="msg"></span>');
                $msg.html(this.model.get('msg'));
                this.$el.append($msg);
            }
            this.$el.append($byline);
            this.$el.attr('data-id', this.model.get("_id"));
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            if(options && options.list) {
                this.list = options.list;
            }
            if(this.model) {
                this.model.bind('change', this.render, this);
                this.model.bind('destroy', this.remove, this);
            }
        },
        events: {
          "click": "select"
        },
        select: function(e) {
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            
            deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            
            if(this.hasOwnProperty('list')) {
                this.list.trigger('select', this);
            }
                
            this.trigger('select');
            this.trigger('resize');
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    var SelectGroupsView = Backbone.View.extend({
        tagName: "select",
        className: "groups",
        initialize: function() {
            this.$options = $('<option value="public">public</option><option value="private">private</option>');
        },
        render: function() {
            var self = this;
            this.$el.attr('name', 'groups');
            this.$el.append(this.$options);
            if(this.model && this.model.has('groups') && this.model.get('groups').indexOf('public') !== -1) {
                this.$el.val('public');
            } else {
                console.log('rpv')
                this.$el.val('private');
                this.$options.find('option[value="private"]').attr('selected','selected');
            }
            this.setElement(this.$el);
            return this;
        },
        val: function() {
            var groups = [];
            if(this.$el.find('input').val() == 'public') {
                groups = ['public'];
            }
            return groups;
        },
        events: {
        }
    });
    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "form",
        initialize: function() {
            var self = this;
            this.$from = $('');
            if(this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
                this.$from = $(''+this.model.get('from').name);
            } else {
                if(!this.model) {
                    this.model = new Model({}, {
                        collection: this.collection
                    });
                } else {
                }
            }
            if(window.app && window.app.user) {
                this.from = window.app.user.getNewAvatarNameView();
            } else if(window.account && window.account.loginStatus && window.account.loginStatus.has('user')) {
                window.account.loginStatus.getView().getUserModel(function(user){
                    self.from = user.getNewAvatarNameView();
                });
                //this.from = window.app.user.getNewAvatarNameView();
            }
            
            if(this.options.to) {
                if(this.options.to.id) {
                    this.model.set({to: this.options.to}, {silent: true});
                    
                    this.model.getTo(function(to){
                        if(to) {
                            self.to = to.getAvatarNameView();
                        }
                    });
                }
            }
            
            var msgs = {
                sendPlaceholder: "SEND",
                msgPlaceholder: "Your message",
                subjectPlaceholder: "Subject of your message",
                msgLabel: "",
                subjectLabel: "",
                msgRows: "4"
            }
            if(this.options.ui) {
                for(var i in this.options.ui) {
                    msgs[i] = this.options.ui[i];
                }
            }
            var classFormControl = ' class="form-control"';
            if(msgs.controlClass) {
                classFormControl = ' class="'+msgs.controlClass+'"';
            }
            
            var classFormSubmit = ' class="btn btn-lg btn-primary btn-block"';
            if(msgs.submitClass) {
                classFormControl = ' class="'+msgs.submitClass+'"';
            }
            this.$inputSub = $('<input type="text" name="sub" placeholder="'+msgs.subjectPlaceholder+'" autocomplete="off"'+classFormControl+' />');
            this.$inputTxt = $('<textarea name="txt" placeholder="'+msgs.msgPlaceholder+'" autocomplete="off"'+classFormControl+' rows="'+msgs.msgRows+'"></textarea>');
            this.$form = $('<form class="msg"><span class="to"></span><span class="from"></span><fieldset></fieldset><div class="controls"></div></form>');
            
            this.$form.find('fieldset').append('<div class="subjectInputs form-group"><label>'+msgs.subjectLabel+'</label></div>');
            this.$form.find('fieldset .subjectInputs').append(this.$inputSub);
            this.$form.find('fieldset').append('<div class="txtInputs form-group"><label>'+msgs.msgLabel+'</label></div>');
            this.$form.find('fieldset .txtInputs').append(this.$inputTxt);
            this.$form.find('.controls').append('<input type="submit" value="'+msgs.sendPlaceholder+'"'+classFormSubmit+'/>');
        },
        render: function() {
            var self = this;
            if(this.$el.find('form').length === 0) {
                this.$el.append(this.$form);
            }
            if(this.to) {
                this.$el.find('.to').append(this.to.render().$el);
            }
            if(this.from) {
                this.$el.find('.from').append(this.from.render().$el);
            }
            if(this.model) {
                if(this.model.has('txt')) {
                    this.$inputTxt.val(this.model.get('txt'));
                }
                if(this.model.has('sub')) {
                    this.$inputSub.val(this.model.get('sub'));
                }
                if(this.model.has('to')) {
                    this.model.getTo(function(to){
                        if(to) {
                            self.$el.find('.to').html(to.getAvatarNameView().render().$el);
                        }
                    });
                }
                if(this.model.has('from')) {
                    this.model.getFrom(function(from){
                        if(from) {
                            self.$el.find('.from').html(from.getAvatarNameView().render().$el);
                        }
                    });
                }
            }
            this.setElement(this.$el);
            return this;
        },
        events: {
            "submit form": "submit"
        },
        submit: function() {
            var self = this;
            var setDoc = {};
            var txt = this.$inputTxt.val();
            var sub = this.$inputSub.val();
            if(txt !== '' && txt !== this.model.get('txt')) {
                setDoc.txt = txt;
            }
            if(sub !== '' && sub !== this.model.get('sub')) {
                setDoc.sub = sub;
            }
            if(_.size(setDoc) === 0) {
                alert('A message is required!');
                return false;
            }
            
            if(this.to) {
                setDoc.to = {
                    id: this.to.model.id,
                    name: this.to.model.get('name')
                }
            }
            if(this.screenshotImg) {
                setDoc.screenshotImg = this.screenshotImg.outerHTML;
            }
            // console.log(setDoc)
            this.model.set(setDoc, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false ,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.trigger("saved", self.model);
                    self.collection.add(self.model);
                });
            } else {
                self.trigger("saved", self.model);
            }
            return false;
        },
        focus: function() {
            this.$inputTxt.focus();
        },
        remove: function() {
            this.$el.remove();
        },
        clear: function() {
            this.$inputTxt.val('');
            this.$inputSub.val('');
            this.model = new Model({}, {
                collection: this.collection
            });
        }
    });
    
    if(define) {
        define(function () {
            return {
                Collection: Collection,
                Model: Model,
                List: ListView,
                Row: RowView,
                Avatar: AvatarView,
                Full: FullView,
                Form: FormView
            }
        });
    }
})();
