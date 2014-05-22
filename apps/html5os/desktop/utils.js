(function(){
    
    if (typeof console == "undefined") {
        window.console = {
            log: function () {}
        };
    }
    
    var utils = {};
    
    utils.slugStr = function(str) {
        if(!str) return '';
        return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
    }
    
    utils.getNewModal = function(opts) {
        return new this.ModalView(opts);
    }
    utils.getNewModalContent = function(opts) {
        return new this.ModalContentView(opts);
    }
    
    utils.ModalView = Backbone.View.extend({
        agName: "div",
        className: "modal",
        initialize: function(options) {
            var self = this;
            this.$modalDialog = $('<div class="modal-dialog"></div>');
            this.modalContent = utils.getNewModalContent(options);
            //this.$el.append(this.$modalDialog);
            this.$el.on('hide.bs.modal', function () {
                //window.history.back();
                //auth.authView.remove();
                //self.remove();
                self.$el.remove();
            });
            if(options) {
                if(options.closeBtn) {
                    $modalHead.prepend(this.$closeBtn);
                }
                if(options.title) {
                    this.$modalHead.find('.modal-title').html(options.title);
                }
                if(options.body) {
                    this.$modalBody.append(options.body);
                }
                if(options.footer) {
                    this.$modalFoot.append(options.footer);
                }
                if(options.backdrop) {
                    modalOpts.backdrop = options.backdrop;
                }
                if(options.popup) {
                    this.$el.modal(modalOpts);
                }
            }
        },
        render: function() {
            this.$el.append(this.modalContent.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        remove: function(){
            //this.$el.modal('hide');
            //this.$el.remove();
        }
    });
    
    utils.ModalContentView = Backbone.View.extend({
        tagName: "div",
        className: "modal-content",
        initialize: function(options) {
            var self = this;
            //var modalOpts = {};
            //modalOpts.backdrop = 'static';
            this.$closeBtn = $('<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>');
            this.$modalHead = $('<div class="modal-header"><h4 class="modal-title" id="loginModalLabel"></h4>');
            this.$modalBody = $('<div class="modal-body"></div>');
            this.$modalFoot = $('<div class="modal-footer text-muted"></div>');
            //this.$el.append(this.$modalDialog);
            this.$el.on('hide.bs.modal', function () {
                //window.history.back();
                //auth.authView.remove();
                //self.remove();
               // self.$el.remove();
            });
            if(options) {
                if(options.closeBtn) {
                    $modalHead.prepend(this.$closeBtn);
                }
                if(options.title) {
                    this.$modalHead.find('.modal-title').html(options.title);
                }
                if(options.body) {
                    this.$modalBody.append(options.body);
                }
                if(options.footer) {
                    this.$modalFoot.append(options.footer);
                }
                if(options.backdrop) {
                    //modalOpts.backdrop = options.backdrop;
                }
                if(options.popup) {
                    //this.$el.modal(modalOpts);
                }
            }
        },
        render: function() {
            this.$el.append(this.$modalHead);
            this.$el.append(this.$modalBody);
            this.$el.append(this.$modalFoot);
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        remove: function(){
            //this.$el.modal('hide');
            this.$el.remove();
        }
    });
    
    utils.appendLightBox = function(el, title, footer, opts) {
        if(!opts) {
            opts = {
            }
        }
        if(typeof arguments[arguments.length-1] == 'object')  {
            opts = arguments[arguments.length-1];
        }
        opts.container = el;
        if(title && !opts.title) {
            opts.title = title;
        }
        if(footer && !opts.footer) {
            opts.footer = footer;
        }
        var lightBox = new this.LightboxView(opts);
        lightBox.render();
        return lightBox;
    }
    
    utils.LightboxView = Backbone.View.extend({
        tagName: "div",
        className: "modal",
        initialize: function(options) {
            var self = this;
            this.$modalDialog = $('<div class="modal-dialog">\n\
                                        <div class="modal-content">\n\
                                          <div class="modal-header">\n\
                                            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\n\
                                            <h4 class="modal-title"></h4>\n\
                                          </div>\n\
                                          <div class="modal-body">\n\
                                          </div>\n\
                                          <div class="modal-footer text-muted">\n\
                                          </div>\n\
                                        </div>\n\
                                    </div>');
            this.$el.append(this.$modalDialog);
            $('body').append(this.$el);
            this.$el.on('hide.bs.modal', function () {
                //window.history.back();
                //auth.authView.remove();
                //self.remove();
                $('body').removeClass('modal-open');
                self.$el.remove();
                self.trigger('removed');
            });
            
            if(options.closeBtn === false) {
                this.$modalDialog.find('button.close').remove();
            }
            if(options && options.title) {
                this.$modalDialog.find('.modal-title').html(options.title);
            } else {
                this.$modalDialog.find('.modal-body').prepend(this.$modalDialog.find('button.close'));
                this.$modalDialog.find('.modal-header').remove();
            }
            if(options && options.container) {
                this.$modalDialog.find('.modal-body').append(options.container);
            }
            if(options && options.footer) {
                this.$modalDialog.find('.modal-footer').append(options.footer);
            } else {
                this.$modalDialog.find('.modal-footer').remove();
            }
            var modalOpts = {};
            modalOpts.backdrop = 'static';
            if(options && options.backdrop) {
                modalOpts.backdrop = options.backdrop;
            }
            this.$el.modal(modalOpts);
        },
        render: function() {
            //this.$el.append(this.$modal);
            $('body').append(this.$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        hide: function() {
            this.$el.modal('hide');
        },
        remove: function(){
            this.hide();
            //this.$el.remove();
        }
    });

    utils.UploadInputView = Backbone.View.extend({
        tagName: "div",
        className: "upload",
        initialize: function(options) {
            var self = this;
            options = options || {};
            var acceptType = options.acceptType || 'image/*';
            this.$input = $('<input class="uploadInput" style="display:none" type="file" multiple accept="'+acceptType+'" capture="camera">');
            this.$meter = $('<div class="meter" style="display:none"><div class="bar" style="width:1%"></div></div>');
        },
        render: function() {
            var self = this;
            this.$el.append(this.$input);
            this.$el.append(this.$meter);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "change .uploadInput": "fileChangeListener"
        },
        click: function() {
            //this.$input.show();
            this.$input.click();
        },
        uploadFile: function(blobOrFile, callback) {
            console.log(blobOrFile)
            var self = this;
            self.$meter.show();
            var formData = new FormData;
            var xhr = new XMLHttpRequest;
            var onReady = function(e) {
            };
            var onError = function(err) {
                console.log(err);
                alert("upload failed");
            };
            formData.append("files", blobOrFile);
            xhr.open("POST", "/api/files", true);
            xhr.addEventListener("error", onError, false);
            xhr.addEventListener("readystatechange", onReady, false);
            xhr.onload = function(e) {
                var data = JSON.parse(e.target.response);
                self.$input.hide();
                self.$meter.hide();
                if (callback) callback(data);
            };
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    var per = Math.floor((e.loaded / e.total) * 100);
                    self.$meter.find('.bar').css('width', per+'%');
                }
            };
            xhr.setRequestHeader('cache-control', 'no-cache');
            xhr.send(formData);
        },
        fileChangeListener: function(e) {
            e.stopPropagation();
            e.preventDefault();
            var self = this;
            var files = e.target.files;
            var queue = [];
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                queue.push(file);
            }
            var process = function() {
                if (queue.length) {
                    var f = queue.shift();
                    self.uploadFile(f, function(data) {
                        console.log(data);
                        if(_.isArray(data)) {
                            data = _.first(data);
                        }
                        self.trigger("upload", data);
                    });
                    if (queue.length > 0) {
                        process();
                    } else {}
                }
            };
            process();
            return false;
        }
    });
    
    utils.initalizingTags = false;
    utils.initalizingCbs = [];
    utils.initalizingUsers = false;
    utils.initalizingUsersCbs = [];
    utils.initalizingPosts = false;
    utils.initalizingPostsCbs = [];
    utils.initalizingMenu = false;
    utils.initalizingMenuCbs = [];
    utils.initUsers = function(waitForLoad, callback) {
        if(typeof waitForLoad === 'function') {
            callback = waitForLoad;
            waitForLoad = false;
        }
        if(!callback) callback = function() {}
        
        if(!window.UsersBackbone || !window.usersCollection) {
            if(utils.initalizingUsers) {
                utils.initalizingUsersCbs.push(function(){
                    //utils.initTags(waitForLoad, callback);
                    callback();
                });
            } else {
                utils.initalizingUsers = true;
                require(['/users/backbone-users.js'], function(UsersBackbone){
                    window.UsersBackbone = UsersBackbone;
                    window.usersCollection = new UsersBackbone.Collection(); // collection
                    utils.initalizingUsers = false;
                    if(waitForLoad) {
                        window.usersCollection.load(callback);
                    } else {
                        window.usersCollection.load();
                        callback();
                    }
                    for(var c in utils.initalizingUsersCbs) {
                        var cb = utils.initalizingUsersCbs[c];
                        cb();
                    }
                    utils.initalizingUsersCbs = [];
                });
            }
        } else {
            callback();
        }
    }
    utils.initTags = function(waitForLoad, callback) {
        if(typeof waitForLoad === 'function') {
            callback = waitForLoad;
            waitForLoad = false;
        }
        if(!callback) callback = function() {}
        
        if(!window.TagsBackbone || !window.tagsCollection) {
            if(utils.initalizingTags) {
                utils.initalizingCbs.push(function(){
                    //utils.initTags(waitForLoad, callback);
                    callback();
                });
            } else {
                utils.initalizingTags = true;
                require(['/tags/tags.js'], function(TagsBackbone){
                    window.TagsBackbone = TagsBackbone;
                    window.tagsCollection = new TagsBackbone.Collection(); // collection
                    utils.initalizingTags = false;
                    if(waitForLoad) {
                        window.tagsCollection.load(callback);
                    } else {
                        window.tagsCollection.load();
                        callback();
                    }
                    for(var c in utils.initalizingCbs) {
                        var cb = utils.initalizingCbs[c];
                        cb();
                    }
                    utils.initalizingCbs = [];
                });
            }
        } else {
            callback();
        }
    }
    utils.initMenu = function(waitForLoad, callback) {
        if(typeof waitForLoad === 'function') {
            callback = waitForLoad;
            waitForLoad = false;
        }
        if(!callback) callback = function() {}
        
        if(!window.MenuItemsBackbone || !window.menuItemsCollection) {
            if(utils.initalizingMenu) {
                utils.initalizingMenuCbs.push(function(){
                    //utils.initTags(waitForLoad, callback);
                    callback();
                });
            } else {
                utils.initalizingMenu = true;
                
                require(['/menu/menuItems.js'], function(MenuItems) {
                    window.MenuItems = MenuItems;
                    if(!window.menuItemsCollection) {
                        window.menuItemsCollection = new MenuItems.Collection();
                    }
                    require(['/menu/menuGroups.js'], function(MenuGroups) {
                        window.MenuGroups = MenuGroups;
                        if(!window.menuGroupsCollection) {
                            window.menuGroupsCollection = new MenuGroups.Collection();
                        }
                        require(['/menu/menuItemReviews.js'], function(MenuItemReviews) {
                            window.MenuItemReviews = MenuItemReviews;
                            if(!window.menuItemsCollection) {
                                window.menuItemsCollection = new MenuItemReviews.Collection();
                            }
                            require(['/orders/orders.js'], function(Orders) {
                                window.Orders = Orders;
                                if(!window.ordersCollection) {
                                    window.ordersCollection = new Orders.Collection();
                                }
                                require(['/rewards/rewards.js'], function(Rewards) {
                                    window.Rewards = Rewards;
                                    if(!window.rewardsCollection) {
                                        window.rewardsCollection = new Rewards.Collection();
                                    }
                                    
                                    utils.initalizingMenu = false;
                                    for(var c in utils.initalizingMenuCbs) {
                                        var cb = utils.initalizingMenuCbs[c];
                                        cb();
                                    }
                                    utils.initalizingMenuCbs = [];
                                    if(waitForLoad) {
                                        window.rewardsCollection.load(null, function(){
                                            window.menuItemsCollection.load(null, function() {
                                                window.menuGroupsCollection.load(null, function() {
                                                    window.ordersCollection.load(null, function() {
                                                        if(callback) {
                                                            callback();
                                                        }
                                                    });
                                                });
                                            });
                                        });
                                    } else {
                                        window.rewardsCollection.load(null, function(){
                                            window.menuItemsCollection.load(null, function() {
                                                window.menuGroupsCollection.load(null, function() {
                                                    window.ordersCollection.load(null, function() {
                                                    });
                                                });
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    });
                });
            }
        } else {
            callback();
        }
    }
    utils.initPosts = function(waitForLoad, callback) {
        if(typeof waitForLoad === 'function') {
            callback = waitForLoad;
            waitForLoad = false;
        }
        if(!callback) callback = function() {}
        
        if(!window.PostsBackbone || !window.postsCollection) {
            if(utils.initalizingPosts) {
                utils.initalizingPostsCbs.push(function(){
                    //utils.initTags(waitForLoad, callback);
                    callback();
                });
            } else {
                utils.initalizingPosts = true;
                require(['/posts/backbone-posts.js'], function(PostsBackbone){
                    window.PostsBackbone = PostsBackbone;
                    if(!window.postsCollection) {
                        window.postsCollection = new PostsBackbone.Collection(); // collection
                    }
                    utils.initalizingPosts = false;
                    if(waitForLoad) {
                        window.postsCollection.load(callback);
                    } else {
                        window.postsCollection.load();
                        callback();
                    }
                    for(var c in utils.initalizingPostsCbs) {
                        var cb = utils.initalizingPostsCbs[c];
                        cb();
                    }
                    utils.initalizingPostsCbs = [];
                });
            }
        } else {
            callback();
        }
    }
    
    utils.ModelActionsView = Backbone.View.extend({
        tagName: "div",
        className: "actions",
        initialize: function(options) {
            var self = this;
            self.initialized = false;
            this.actions = [];
            this.options = options;
            this.actionOptions = options.actionOptions || {};
            this.actionOptions.model = this.model;
            // fieldName
            // console.log(this.actionOptions)
            
            // this.groupsView = new utils.SelectGroupsInputView(this.actionOptions);
            if(this.actionOptions.detail) {
                this.infoView = new utils.ModelActionInfo(this.actionOptions);
            }
            if(this.actionOptions.fav) {
                this.favView = new utils.ModelActionFav(this.actionOptions);
            }
            
            if(this.actionOptions.share) {
                this.shareView = new utils.ModelActionShare(this.actionOptions);
            }
            // this.deleteView = new utils.ModelActionDelete(this.actionOptions);
            this.moreActionsView = new utils.MoreActionsView(this.actionOptions);
            if(this.actionOptions.tags) {
                var tagFieldName = this.actionOptions.tags.fieldName || 'tags';
                utils.initTags(function(){
                    
                    self.taggingDropdown = new TagsBackbone.Dropdown({model: self.model, fieldName: tagFieldName});
                    self.taggingDropdown.on('selectedTagName', function(tagName) {
                        self.trigger('goToTagName', tagName)
                    });
                    
                    self.initialized = true;
                    self.trigger('initialized');
                });
            } else {
                self.initialized = true;
                self.trigger('initialized');
            }
            
            
            /*this.fileActionProcess = new FileActionProcess({id: this.id, model: this.model});
            this.$el.append(this.fileActionProcess.render().el);
            this.actions.push(this.fileActionProcess);*/
        },
        render: function() {
            var self = this;
            this.setElement(this.$el);
            if(!this.initialized) {
                this.on('initialized', this.render);
                return this;
            }
            // this.$el.html('');
            // this.$el.append(this.groupsView.render().$el);
            if(this.favView) {
                this.$el.append(this.favView.render().$el);
            }
            if(this.taggingDropdown) {
                this.$el.append(this.taggingDropdown.render().$el);
            }
            if(this.infoView) {
                this.$el.append(this.infoView.render().$el);
            }
            if(this.shareView) {
                this.$el.append(this.shareView.render().$el);
            }
            this.$el.append(this.moreActionsView.render().$el);
            
            return this;
        },
        events: {
            "click": "click"
        },
        click: function(e) {
            // e.preventDefault();
            // e.preventDefault();
            // return false;
        }
    });
    
    utils.ModelActionProcess = Backbone.View.extend({
        tagName: "span",
        className: "process",
        initialize: function() {
        },
        render: function() {
            var $btn = $('<button>process</button>');
            var metadata = this.model.get('metadata');
            if(metadata.hasOwnProperty('proc')) {
                $btn.attr('processed', metadata.proc);
            }
            this.$el.html($btn);
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select"
        },
        select: function() {
            if(confirm("Are you sure that you want to process this?")) {
                
                var m = this.model.get("metadata");
                //m.proc = 1;
                console.log(this.model);
                this.model.set({"metadata.proc": 0},{wait: true});
                console.log(this.model);
            }
            return false;
        }
    });
    
    utils.ModelActionFav = Backbone.View.extend({
        tagName: "div",
        className: "favorite",
        initialize: function() {
            // accept the field name of the favorite, useful for the files collection metadata object namespace
            this.fieldName = (this.options.fav && this.options.fav.fieldName) ? this.options.fav.fieldName : 'fav';
            // this.fieldStr = (this.options.fav && this.options.fav.fieldName) ? this.options.fav.fieldName : 'fav';
            // this.fieldName = this.fieldStr;
            // this.fieldSubName = false;
            // if(this.fieldName.indexOf('.') !== -1) {
            //     this.fieldSubName = this.fieldName.substr(0, this.fieldName.indexOf('.'));
            //     this.fieldName = this.fieldName.substr(this.fieldName.indexOf('.')+1);
            // }
            
            this.$el.attr('title', 'Favorite this');
            this.$btn = $('<button class="fav btn btn-link glyphicon glyphicon-star-empty"> </button>');
        },
        render: function() {
            // var fav = this.getModelVal();
            // console.log(this.fieldName)
            var fav = this.model.get(this.fieldName);
            if(fav) {
                this.$btn.removeClass('glyphicon-star-empty');
                this.$btn.addClass('glyphicon-star');
            } else {
                this.$btn.removeClass('glyphicon-star');
                this.$btn.addClass('glyphicon-star-empty');
            }
            this.$el.append(this.$btn);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .fav": "fav"
        },
        fav: function() {
            var self = this;
            // var fav = this.getModelVal();
            var fav = this.model.get(this.fieldName);
            if(!fav) {
                this.$btn.removeClass('glyphicon-star-empty');
                this.$btn.addClass('glyphicon-star');
                this.setVal(true);
                this.saveValToModel();
            } else {
                this.$btn.removeClass('glyphicon-star');
                this.$btn.addClass('glyphicon-star-empty');
                this.setVal(null);
                this.saveValToModel();
            }
        },
        setVal: function(v) {
            this.value = v;
        },
        getVal: function() {
            return this.value;
        },
        saveValToModel: function() {
            var self = this;
            var setDoc = {
            };
            setDoc[this.fieldName] = this.getVal();
            self.model.set(setDoc, {silent: true});
            // self.model.set(this.fieldName, this.getVal(), {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    // TODO 
                    // fix dot natation
                    // if(self.fieldSubName) {
                    //     self.model.attributes[self.fieldSubName][self.fieldName] = _.clone(self.model.attributes[self.fieldStr]);
                    //     delete self.model.attributes[self.fieldStr];
                    // }
                    self.render();
                });
                // auth failure 
                saveModel.fail(function(s, typeStr, respStr) {
                    if(s.status === 403) {
                        //callback(new Error("Please login to post a URL."));
                    }
                });
            }
        }
    });
    
    utils.ModelActionInfo = Backbone.View.extend({
        tagName: "div",
        className: "info",
        initialize: function() {
            this.$el.attr('title', 'More Info');
            this.$btn = $('<button class="info btn btn-link glyphicon glyphicon-info-sign"> </button>');
        },
        render: function() {
            this.$el.append(this.$btn);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click .info": "infoClick"
        },
        infoClick: function(e) {
            var self = this;
            this.model.collection.trigger('goToNavigatePath', this.model);
            return false;
        },
    });
    
    utils.ModelActionDelete = Backbone.View.extend({
        tagName: "span",
        className: "delete",
        initialize: function() {
            this.$el.attr('title', 'Delete this');
        },
        render: function() {
            this.$el.html('<button class="delete btn btn-link glyphicon glyphicon-trash"> </button>');
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select"
        },
        select: function() {
            console.log(this.model);
            if(confirm("Are you sure that you want to delete this?")) {
                this.model.destroy({success: function(model, response) {
                  console.log('delete');
                }, 
                error: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            }
            return false;
        }
    });
    
    utils.ModelActionShare = Backbone.View.extend({
        tagName: "div",
        className: "share",
        initialize: function(options) {
            this.options = options;
            if(options.model) {
                this.model = options.model;
            }
            this.fieldStr = (this.options.groups && this.options.groups.fieldName) ? this.options.groups.fieldName : 'groups';
            this.fieldName = this.fieldStr;
            this.fieldSubName = false;
            if(this.fieldStr.indexOf('.') !== -1) {
                this.fieldName = this.fieldStr.substr(0, this.fieldStr.indexOf('.'));
                this.fieldSubName = this.fieldStr.substr(this.fieldStr.indexOf('.')+1);
            }
            
            // Owner field name
            this.ownerFieldStr = (this.options.owner && this.options.owner.fieldName) ? this.options.owner.fieldName : 'owner';
            this.ownerFieldName = this.ownerFieldStr;
            this.ownerFieldSubName = false;
            if(this.ownerFieldStr.indexOf('.') !== -1) {
                this.ownerFieldName = this.ownerFieldStr.substr(0, this.ownerFieldStr.indexOf('.'));
                this.ownerFieldSubName = this.ownerFieldStr.substr(this.ownerFieldStr.indexOf('.')+1);
            }
            
            this.$options =  $('<div class="btn-group">\n\
  <button type="button" class="btn btn-link dropdown-toggle glyphicon glyphicon-share-alt" data-toggle="dropdown"> \n\
  </button>\n\
  <ul class="dropdown-menu pull-right" role="menu">\n\
    <li role="presentation" class="dropdown-header">Sharing</li>\n\
    <li class="privacySelector"><span class="off">Off</span> <span class="bulb"> </span> <span class="on">On</span></li>\n\
    <li class="divider"></li>\n\
    <li class="owner"><a href="#"></a></li>\n\
    <li class="shareInfo permalink"><input type="text" value="" name="permaUrl" class="form-control" /></li>\n\
  </ul>\n\
</div>');
        },
        render: function() {
            var self = this;
            this.getModelFieldVal();
            this.$options.find('.permalink input').val(this.model.getNavigateUrl());
            if(this.getValue() && this.getValue().indexOf('public') !== -1) {
                this.$options.find('.privacySelector').removeClass('private').addClass('public');
                this.$options.find('.shareInfo').show();
            } else {
                this.$options.find('.privacySelector').removeClass('public').addClass('private');
                this.$options.find('.shareInfo').hide();
            }
            
            // this.$options.find('.owner').html(this.getOwnerAvatar().render().$el);
            this.getOwnerAvatar(function(ownerAvatar){
                if(ownerAvatar) {
                    self.$options.find('.owner a').html(ownerAvatar.render().$el);
                }
            });
            
            this.$el.append(this.$options);
            
            this.setElement(this.$el);
            return this;
        },
        getOwnerAvatar: function(callback) {
            var self = this;
            // this.getModelOwnerFieldVal();
            // var owner = this.getOwnerValue();
            if(self.ownerAvatar) {
                if(callback) {
                    callback(self.ownerAvatar);
                }
            }
            if(this.model.getOwner) {
                this.model.getOwner(function(owner) {
                    if (owner) {
                        self.ownerAvatar = owner.getNewAvatarNameView();
                        if(callback) {
                            callback(self.ownerAvatar);
                        }
                    }
                });
            }
        },
        getValue: function() {
            return this.value;
        },
        getOwnerValue: function() {
            return this.ownerValue;
        },
        getModelFieldVal: function() {
            if(this.model && this.model.has(this.fieldName)) {
                this.value = this.model.get(this.fieldName);
                if(this.fieldSubName) {
                    if(this.value.hasOwnProperty(this.fieldSubName)) {
                        this.value = this.value[this.fieldSubName];
                    } else {
                        delete this.value;
                    }
                } else {
                    // delete this.value;
                }
            } else {
                delete this.value;
            }
            return this.value;
        },
        getModelOwnerFieldVal: function() {
            if(this.model && this.model.has(this.ownerFieldName)) {
                this.ownerValue = this.model.get(this.ownerFieldName);
                if(this.ownerFieldSubName) {
                    if(this.ownerValue.hasOwnProperty(this.ownerFieldSubName)) {
                        this.ownerValue = this.ownerValue[this.ownerFieldSubName];
                    } else {
                        delete this.ownerValue;
                    }
                } else {
                    delete this.ownerValue;
                }
            } else {
                delete this.ownerValue;
            }
            return this.ownerValue;
        },
        events: {
            "click .privacySelector": "clickPrivacy",
            "click .dropdown-menu": "clickStop",
            "click .permalink input": "clickPermalinkUrl",
            "change .permalink input": "changePermalink",
            "keyup .permalink input": "changePermalink",
        },
        clickShare: function(e) {
            this.$el.find('.permalink input').select();
            e.preventDefault();
        },
        clickPermalinkUrl: function(e) {
            $(e.target).select();
        },
        changePermalink: function(e) {
            if (this.getNavigateUrl() !== $(e.target).val()) {
                $(e.target).val(this.getNavigateUrl());
            }
            this.clickPermalinkUrl(e);
            return false;
        },
        clickStop: function() {
            return false;
        },
        clickPrivacy: function(e) {
            var $et = $(e.currentTarget);
            // this.getModelFieldVal();
            if(this.getValue() && this.getValue().indexOf('public') !== -1) {
                // public - make it private
                this.value = [];
                this.saveVal(); 
            } else {
                // private - make it public
                this.value = ['public'];
                this.saveVal();
            }
            return false;
        },
        saveVal: function() {
            var self = this;
            var setDoc = {
            };
            setDoc[this.fieldStr] = this.getValue();
            self.model.set(setDoc, {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        saveOwnerVal: function() {
            var self = this;
            var setDoc = {
            };
            setDoc[this.ownerFieldStr] = this.getOwnerValue();
            self.model.set(setDoc, {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.render();
                });
            }
        }
    });
    
    utils.MoreActionsView = Backbone.View.extend({
        tagName: "div",
        className: "moreActions",
        initialize: function(options) {
            this.options = options;
            if(options.model) {
                this.model = options.model;
            }
            var moreLis = '';
            var collectionFriendlyName = this.model.collection.collectionName.substring(0, this.model.collection.collectionName.length-1);
            if(options.collectionFriendlyName) {
               collectionFriendlyName = options.collectionFriendlyName;
            }
            if(options.more) {
                for(var m in options.more) {
                    var more = options.more[m];
                    moreLis = moreLis + '<li class="moreAction"><a href="#" data-action-id="'+m+'"><span class="glyphicon glyphicon-'+more.glyphicon+'"></span> '+more.title+'</a></li>\n';
                }
            }
            //<li class="divider"></li>\n\
            this.$options =  $('<div class="btn-group">\n\
  <button type="button" class="btn btn-link dropdown-toggle glyphicon glyphicon-chevron-down" data-toggle="dropdown">\n\
  </button>\n\
  <ul class="dropdown-menu pull-right" role="menu">\n\
  '+moreLis+'\n\
    <li><a class="delete" href="#"><span class="glyphicon glyphicon-trash"></span> Delete '+collectionFriendlyName+'</a></li>\n\
  </ul>\n\
</div>');
        },
        render: function() {
            var self = this;
            if(window.account && (account.isUser() || account.isAdmin())) {
            } else {
                this.$options.find('.delete').remove();
            }
            this.$el.append(this.$options);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click li a.delete": "clickDelete",
            "click a.deleteConfirm": "clickDeleteConfirmed",
            "click li.moreAction a": "clickLiA"
        },
        clickDelete: function(e) {
            var self = this;
            self.deleteHtml = this.$options.find('.delete').html();
            this.$options.find('.delete').addClass('deleteConfirm').removeClass('delete').html('<span class="glyphicon glyphicon-trash"></span> Confirm');
            setTimeout(function(){
                self.$options.find('.delete').removeClass('deleteConfirm').addClass('delete');
                self.$options.find('.delete').html(self.deleteHtml);
            }, 10000);
            return false;
        },
        clickDeleteConfirmed: function(e) {
            // if(confirm("Are you sure that you want to delete this?")) {
                this.model.destroy({success: function(model, response) {
                  console.log('delete');
                }, 
                error: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            // }
            // return false;
            e.preventDefault();
        },
        clickLiA: function(e) {
            var $et = $(e.currentTarget);
            // console.log($et)
            // console.log($et.attr('data-action-id'))
            var actionId = $et.attr('data-action-id');
            // console.log(this.options.more[actionId]);
            if(this.options.more.hasOwnProperty(actionId)) {
                this.options.more[actionId].action(this.model);
            } else {
                console.log('err no action for id '+actionId);
            }
            e.preventDefault();
        },
        saveVal: function() {
            var setDoc = {
            };
            setDoc[this.fieldStr] = this.val();
            self.model.set(setDoc, {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.render();
                });
            }
        }
    });

    utils.SelectGroupsInputView = Backbone.View.extend({
        tagName: "div",
        className: "groups",
        initialize: function(options) {
            this.options = options;
            if(options.model) {
                this.model = options.model;
            }
            this.fieldStr = this.options.fieldName || 'groups';
            this.fieldName = this.options.fieldName || 'groups';
            this.fieldSubName = false;
            if(this.fieldStr.indexOf('.') !== -1) {
                this.fieldName = this.fieldStr.substr(0, this.fieldStr.indexOf('.'));
                this.fieldSubName = this.fieldStr.substr(this.fieldStr.indexOf('.')+1);
            }
            //this.$options = $('<option value="public">public</option><option value="private">private</option>');
//   <button type="button" class="privacy btn btn-default"><span class="glyphicon glyphicon-lock">Privacy</span></button>\n\
    // <span class="caret"></span>\n\
            this.$options =  $('<div class="btn-group">\n\
  <button type="button" class="btn btn-link dropdown-toggle" data-toggle="dropdown">\n\
    <span class="glyphicon glyphicon-lock"></span> \n\
  </button>\n\
  <ul class="dropdown-menu" role="menu">\n\
    <li><a href="#" class="private glyphicon glyphicon-lock"> Private</a></li>\n\
    <li><a href="#" class="public glyphicon glyphicon-globe"> Public</a></li>\n\
    <li class="divider"></li>\n\
    <li><a href="#" class="addGroup">Other Group</a></li>\n\
  </ul>\n\
</div>');
            if(this.model && this.model.has('groups')) {
                this.value = this.model.get('groups');
            }
        },
        getModelFieldVal: function() {
            if(this.model && this.model.has(this.fieldName)) {
                this.value = this.model.get(this.fieldName);
                if(this.fieldSubName) {
                    if(this.value.hasOwnProperty(this.fieldSubName)) {
                        this.value = this.value[this.fieldSubName];
                    } else {
                    }
                }
            }
        },
        renderPrivate: function() {
            var $span = this.$el.find('.privacy.btn span');
            $span.html('Private');
            $span.removeClass('glyphicon-globe');
            $span.addClass('glyphicon-lock');
        },
        renderPublic: function() {
            var $span = this.$el.find('.privacy.btn span');
            $span.html('Public');
            $span.removeClass('glyphicon-lock');
            $span.addClass('glyphicon-globe');
        },
        render: function() {
            var self = this;
            this.$el.append(this.$options);
            if(this.model && this.model.has(this.fieldName)) {
                var fieldVal = this.model.get(this.fieldName);
                if(this.fieldSubName) {
                    fieldVal = fieldVal[this.fieldSubName];
                }
                if(fieldVal.indexOf('public') !== -1) {
                    this.renderPublic();
                }
            } else if(!this.model.has(this.fieldName)) {
                var fieldVal = this.model.get(this.fieldName);
                if(fieldVal && (fieldVal.length == 0 || fieldVal.hasOwnProperty(this.fieldSubName) && fieldVal[this.fieldSubName].length == 0)) {
                    this.renderPrivate();
                } else {
                    
                }
            } else {
                var $span = this.$el.find('.privacy.btn span');
                $span.removeClass('glyphicon-lock');
                $span.removeClass('glyphicon-globe');
                $span.html(this.model.get(this.fieldName));
            }
            this.setElement(this.$el);
            return this;
        },
        val: function() {
            return this.value;
        },
        events: {
            "click a.public": "clickPublic",
            "click a.private": "clickPrivate",
            "click a.addGroup": "addGroup"
        },
        addGroup: function(e) {
            var g = prompt("Enter group name.");
            if(g) {
                this.value = [];
                this.value.push(g);
                var $span = this.$el.find('.privacy.btn span');
                $span.html(g);
                $span.removeClass('glyphicon-lock');
                $span.removeClass('glyphicon-globe');
                //this.trigger('changed', this.value);
                this.saveVal();
            }
            e.preventDefault();
        },
        clickPublic: function(e) {
            this.value = ['public'];
            this.saveVal();
            //this.renderPublic();
            //this.trigger('changed', this.value);
            e.preventDefault();
        },
        clickPrivate: function(e) {
            this.value = [];
            this.saveVal();
            //this.renderPrivate();
            //this.trigger('changed', this.value);
            e.preventDefault();
        },
        saveVal: function() {
            var setDoc = {
            };
            setDoc[this.fieldStr] = this.val();
            self.model.set(setDoc, {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.render();
                });
            }
        }
    });

    if(define) {
        define(function () {
            return utils;
        });
    }
})();