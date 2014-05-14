(function() {
    var MenuGroup = Backbone.House.Model.extend({
        initialize: function(attr, opts) {
            var colOpts = {
                menuGroup: this
            };
            if(attr.hasOwnProperty("images")) {
                this.menuGroupImageCollection = new MenuGroupImageCollection(attr.images, colOpts);
            } else {
                this.menuGroupImageCollection = new MenuGroupImageCollection([], colOpts);
            }
            if(attr.hasOwnProperty("groups")) {
                this.menuGroupGroupCollection = new MenuGroupGroupCollection(attr.groups, colOpts);
            } else {
                this.menuGroupGroupCollection = new MenuGroupGroupCollection([], colOpts);
            }
            if(attr.hasOwnProperty("items")) {
                this.menuGroupItemCollection = new MenuGroupItemCollection(attr.items, colOpts);
            } else {
                this.menuGroupItemCollection = new MenuGroupItemCollection([], colOpts);
            }
            this.addViewType(TableRowView, 'tableRow');
            this.addViewType(MenuGroupView, 'avatar');
            this.addViewType(MenuGroupView, 'full');
            this.addViewType(MenuGroupRowView, 'row');
            this.addViewType(FormView, 'form');
            this.addViewType(PickerView, 'picker');
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        getView: function(options) {
            return this.getAvatarView(options);
        },
        addGroup: function(menuGroup, callback) {
            var self = this;
            var maxRank = 0;
            if(this.has("groups")) {
                maxRank = this.menuGroupGroupCollection.last().get("rank");
            }
            var doc = {
                _id: menuGroup.get("id"),
                name: menuGroup.get("name"),
                rank: maxRank + 1
            };
            this.menuGroupGroupCollection.saveNewModel(doc, function(model){
                if(callback) callback(model);
            });
        },
        addItem: function(menuItem, callback) {
            var self = this;
            var maxRank = 0;
            if(this.has("items")) {
                maxRank = this.menuGroupItemCollection.last().get("rank");
            }
            var doc = {
                _id: menuItem.get("id"),
                name: menuItem.get("name"),
                rank: maxRank + 1
            };
            this.menuGroupItemCollection.saveNewModel(doc, function(model){
                if(callback) callback(model);
            });
        },
        addImage: function(menuImage, callback) {
            var self = this;
            var maxRank = 0;
            if(this.has("images")) {
                maxRank = this.menuGroupImageCollection.last().get("rank");
            }
            var doc = {
                _id: menuImage.id,
                filename: menuImage.filename,
                rank: maxRank + 1
            };
            if(menuImage.sizes) {
                doc.sizes = menuImage.sizes;
            }
            this.menuGroupImageCollection.saveNewModel(doc, function(model){
                if(callback) callback(model);
            });
        }
    });

    var MenuGroupImage = Backbone.House.Model.extend({
        collectionName: "images",
        initialize: function() {
            this.addViewType(MenuGroupImageView, 'avatar');
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        // url: function() {
        //     return "/api/menuGroups/" + this.options.menuGroup.get("id") + "/images";
        // },
        getView: function(options) {
            return this.getAvatarView(options);
        }
    });

    var MenuGroupGroup = Backbone.House.Model.extend({
        collectionName: "groups",
        initialize: function() {
            this.addViewType(MenuGroupGroupView, 'avatar');
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        // url: function() {
        //     return this.collection.url();
        // },
        getView: function(options) {
            return this.getAvatarView(options);
        }
    });

    var MenuGroupItem = Backbone.House.Model.extend({
        initialize: function() {
            this.addViewType(MenuGroupItemView, 'avatar');
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        getView: function(options) {
            return this.getAvatarView(options);
        }
    });

    var MenuGroupsCollection = Backbone.House.Collection.extend({
        model: MenuGroup,
        collectionName: 'menuGroups',
        collectionFriendlyName: 'groups',
        sortField: 'rank',
        pageSize: 0,
        filterParent: function(parentExists) {
            if(parentExists) {
                this.filter = {
                    parent: parentExists
                };
            } else {
                this.filter = {
                    parent: {
                        $exists: false
                    }
                };
            }
        },
    });
    var MenuGroupImageCollection = Backbone.House.Collection.extend({
        model: MenuGroupImage,
        socket: false,
        pageSize: 0,
        sortField: 'rank',
        collectionName: 'images',
        url: function() {
            return "/api/menuGroups/" + this.options.menuGroup.get("id") + "/images";
        },
        // getView: function(options) {
        //     var self = this;
        //     if(!options) options = {};
        //     if(!this.hasOwnProperty("row")) {
        //         options.collection = this;
        //         this.row = new MenuGroupImageList(options);
        //         this.row.on("selected", function(m) {
        //             self.trigger("selected", m);
        //         });
        //     }
        //     return this.row;
        // },
        getViewMini: function(options) {
            var self = this;
            if(!options) options = {};
            if(!this.hasOwnProperty("rowMini")) {
                options.collection = this;
                this.rowMini = new MenuGroupImageList(options);
                this.rowMini.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.rowMini;
        },
        // comparator: function(a) {
        //     return a.get("rank");
        // }
    });
    var MenuGroupGroupCollection = Backbone.House.Collection.extend({
        model: MenuGroupGroup,
        socket: false,
        pageSize: 0,
        sortField: 'rank',
        collectionName: 'groups',
        url: function() {
            // console.log(this.options)
            return "/api/menuGroups/" + this.options.menuGroup.get("id") + "/groups";
        },
        // getView: function(options) {
        //     var self = this;
        //     if(!options) options = {};
        //     if(!this.hasOwnProperty("row")) {
        //         options.collection = this;
        //         this.row = new MenuGroupGroupList(options);
        //         this.row.on("selected", function(m) {
        //             self.trigger("selected", m);
        //         });
        //     }
        //     return this.row;
        // },
        // comparator: function(a) {
        //     return a.get("rank");
        // }
    });
    var MenuGroupItemCollection = Backbone.House.Collection.extend({
        model: MenuGroupItem,
        socket: false,
        pageSize: 0,
        sortField: 'rank',
        collectionName: 'items',
        url: function() {
            return "/api/menuGroups/" + this.options.menuGroup.get("id") + "/items";
        },
        // getView: function(options) {
        //     var self = this;
        //     if(!options) options = {};
        //     if(!this.hasOwnProperty("row")) {
        //         options.collection = this;
        //         this.row = new MenuGroupItemList(options);
        //         this.row.on("selected", function(m) {
        //             self.trigger("selected", m);
        //         });
        //     }
        //     return this.row;
        // },
        // initialize: function(models, options) {
        //     var self = this;
        //     if(!options) {
        //         options = models;
        //     }
        //     this.options = options;
        // },
        // comparator: function(a) {
        //     return a.get("rank");
        // }
    });
    
    var MenuGroupPickerList = Backbone.View.extend({
        tag: "span",
        className: "menuGroups",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html('<span class="groupList"></span>');
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        appendModel: function(m) {
            var $el = m.getRowView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if(!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var MenuGroupList = Backbone.View.extend({
        tag: "span",
        className: "menuGroups",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            if(app.userIsAdmin()) {
                this.$actions.append('<li><button class="addGroup">Add Group</button></li><li><button class="addItem">Add Item</button></li><li><button class="editName">Edit Name</button></li><li class="uploadImage"><button class="attachImage">Attach Image</button></li>');
                this.$actions.find(".uploadImage").append(this.uploadInput.render().$el);
            }
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .addGroup": "addGroup",
            "click .addItem": "addItem",
            "click .editName": "editName",
            "click .attachImage": "attachImage",
        },
        attachImage: function() {
            var self = this;
            this.uploadInput.click();
        },
        addImageToCurrentMenuGroup: function(file) {
            if(!file) {
                return;
            }
            var self = this;
            var imagesMaxRank = 0;
            if(this.selectedMenu.has("images") && this.selectedMenu.menuGroupImageCollection.length > 0) {
                imagesMaxRank = this.selectedMenu.menuGroupImageCollection.last().get("rank");
            }
            var image = {
                _id: file._id,
                filename: file.filename,
                rank: imagesMaxRank + 1
            };
            var model = new MenuGroupImage({}, {
                collection: this.selectedMenu.menuGroupImageCollection
            });
            model.set(image);
            var saveModel = model.save(null, {
                silent: true,
                wait: true
            });
            saveModel.done(function() {
                self.selectedMenu.menuGroupImageCollection.add(model);
            });
        },
        addGroupToCurrentMenuGroup: function(menuGroup) {
            var self = this;
            var groupsLen = 0;
            if(this.selectedMenu.has("groups")) {
                groupsLen = this.selectedMenu.menuGroupGroupCollection.last().get("rank");
            }
            var groupO = {
                _id: menuGroup.get("id"),
                name: menuGroup.get("name"),
                rank: groupsLen + 1
            };
            var m = new MenuGroupGroup({}, {
                collection: this.selectedMenu.menuGroupGroupCollection
            });
            m.set(groupO);
            var s = m.save(null, {
                silent: true,
                wait: true
            });
            s.done(function() {
                self.selectedMenu.menuGroupGroupCollection.add(m);
            });
        },
        addItemToCurrentMenuGroup: function(menuItem) {
            var self = this;
            var itemsLen = 0;
            if(this.selectedMenu.has("items")) {
                itemsLen = this.selectedMenu.menuGroupItemCollection.last().get("rank");
            }
            var itemO = {
                _id: menuItem.get("id"),
                name: menuItem.get("name"),
                rank: itemsLen + 1
            };
            var m = new MenuGroupItem({}, {
                collection: this.selectedMenu.menuGroupItemCollection
            });
            m.set(itemO);
            var s = m.save(null, {
                silent: true,
                wait: true
            });
            s.done(function() {
                self.selectedMenu.menuGroupItemCollection.add(m);
            });
        },
        editName: function() {
            var oldName = this.selectedMenu.get("name");
            var newName = prompt("Edit the menu group name", oldName);
            if(newName && newName != oldName) {
                var savetx = this.selectedMenu.save({
                    name: newName
                }, {
                    silent: false,
                    wait: true
                });
                savetx.done(function(s, typeStr, respStr) {});
            }
        },
        addGroup: function() {
            var self = this;
            var menuGroupPicker = new MenuGroupPicker({
                collection: this.collection
            });
            menuGroupPicker.$light = utils.appendLightBox(menuGroupPicker.render().$el);
            menuGroupPicker.on("selected", function(menuGroup) {
                self.addGroupToCurrentMenuGroup(menuGroup);
                menuGroupPicker.$light.remove();
                $(".lightbox").remove();
            });
        },
        addItem: function() {
            var self = this;
            var menuItemPicker = new MenuItemPicker({
                collection: this.options.itemCollection
            });
            menuItemPicker.$light = utils.appendLightBox(menuItemPicker.render().$el);
            menuItemPicker.on("selected", function(menuItem) {
                self.addItemToCurrentMenuGroup(menuItem);
                menuItemPicker.$light.remove();
                $(".lightbox").remove();
            });
        },
        hideAll: function() {
            var self = this;
            var doFx = false;
            var $sel = this.$ul.children('.menuGroup[selected="selected"]');
            if(doFx) {
                self.$ul.children().removeClass("fadeOut");
                $sel.addClass("fadeOut");
            }
            $sel.removeAttr("selected");
            if(doFx) {
                setTimeout(function() {
                    self.$ul.children().removeClass("fadeOut");
                }, 1e3);
            }
        },
        appendModel: function(m) {
            var self = this;
            var v = m.getView({
                list: this
            });
            var $el = v.render().$el;
            v.on("selectedGroup", function(menuGroupGroup) {
                var slug = menuGroupGroup.model.get("name").toLowerCase();
                menu.router.navigate("menu/" + encodeURIComponent(slug), true);
            });
            v.on("selectedItem", function(menuGroupItem) {
                var slug = menuGroupItem.model.get("id");
                menu.router.navigate("menu/item/" + slug, true);
            });
            if(m.has("root")) {
                $el.attr("selected", true);
                this.selectedMenu = m;
            }
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if(!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });

            this.uploadInput = new UploadInputView;
            this.uploadInput.on("upload", function(data) {
                if(data.file) {
                    self.addImageToCurrentMenuGroup(data.file);
                }
            });
        }
    });
    var MenuGroupImageList = Backbone.View.extend({
        tag: "span",
        className: "menuGroupImages",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.$el.hide();
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        appendModel: function(m) {
            this.$el.show();
            var $el = m.getNewView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if(!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var MenuGroupGroupList = Backbone.View.extend({
        tag: "span",
        className: "menuGroupGroups",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        appendModel: function(m) {
            var $el = m.getView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if(!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var MenuGroupItemList = Backbone.View.extend({
        tag: "span",
        className: "menuGroupItems",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        appendModel: function(m) {
            var $el = m.getView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if(!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var TableRowView = Backbone.View.extend({
        tagName: "tr",
        className: "groupRow",
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            var opts = {
                model: this.model, 
                actionOptions: {
                    collectionFriendlyName: 'group',
                    fav: false,
                    // fav: {fieldName: 'fav'},
                    // tags: {fieldName: 'tags'},
                    // groups: {fieldName: 'groups'},
                    detail: true,
                    // share: true,
                }
            }
            // if(this.model.get('metadata').src) {
            //     var src = this.model.get('metadata').src;
            //     var modelName = src.substr(0, src.length-1);
            //     opts.actionOptions.more = {
            //         "deleteSrc": {
            //             title: "Delete "+modelName,
            //             glyphicon: 'trash',
            //             action: function(model) {
            //                 if(confirm("Are you sure that you want to delete the source "+modelName+"?")) {
            //                     console.log(typeof model.url);
            //                     console.log(model.url);
            //                     model.url = model.url() + '/src';
            //                     // model.url = model.url+'/src';
            //                     // return;
            //                     model.destroy({success: function(model, response) {
            //                       console.log('deleted src');
            //                     }, 
            //                     error: function(model, response) {
            //                         console.log(arguments);
            //                     },
            //                     wait: true});
            //                 }
            //             }
            //         }
            //     }
            // }
            this.actionsView = new utils.ModelActionsView(opts);
            // this.actionsView.on('goToTagName', function(tagName){
            //     app.collection.view.tagsView.tagSelectView.selectTagByName(tagName);
            // });
            
            this.$tdName = $('<td class="name"></td>');
            this.$tdGroupCount = $('<td class="groupCount"></td>');
            this.$tdItemCount = $('<td class="itemCount"></td>');
            // this.$tdAt = $('<td class="at"></td>');
            this.$tdActions = $('<td class="actions"></td>');
            
            // this.$panelHead = $('<div class="panel-heading"></div>');
            // this.$panelBody = $('<div class="panel-body"></div>');
            // this.$panelFoot = $('<div class="panel-footer"></div>');
            // this.$checkbox = $('<input type="checkbox" name="select" />');
            // this.$caption = $('<span class="caption"></span>');
            // this.$byline = $('<span class="byline"></span>');
            // this.$extraInfo = $('<div class="extraInfo"><h3>Metadata</h3></div>');
            // this.$icon = $('<span class="contentIcon"></span>');
            // this.$filename = $('<span class="filename"></span>');
        },
        render: function() {
            // this.$el.html('');
            // this.$el.append(this.$tdIcon);
            this.$el.append(this.$tdName);
            this.$el.append(this.$tdGroupCount);
            this.$el.append(this.$tdItemCount);
            // this.$el.append(this.$tdAt);
            this.$el.append(this.$tdActions);
            
            if(this.model.has('name')) {
                this.$tdName.html(this.model.get('name'));
            }
            // this.$el.append(this.$checkbox);
            // this.$caption.html('');
            // this.$caption.append('<span class="contentType">'+this.model.get('contentType')+'</span>');
            // this.$caption.append('<span class="contentLength">'+this.model.getLengthFormatted()+'</span>');
            // this.$panelFoot.append(this.$caption);
            
            this.$tdActions.append(this.actionsView.render().$el);
            
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "clickSelect",
          "touchstart input": "touchstartstopprop",
          "click .byline a": "clickByline"
        },
        clickByline: function() {
            this.model.collection.trigger('goToNavigatePath', this.model);
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.options.hasOwnProperty('list')) {
                this.options.list.trigger('selected', this);
            }
        },
        deselect: function() {
            this.$el.removeClass("selected");
            this.$el.removeAttr('selected');
            if(this.options.hasOwnProperty('list')) {
                this.options.list.trigger('deselected', this);
            }
        },
        clickSelect: function(e) {
            var self = this;
            var $et = $(e.target);
            if($et.parents('.actions').length) {
            } else {
                var deselectSiblings = function(el) {
                    el.siblings().removeClass('selected');
                    el.siblings().removeAttr('selected');
                }
                if(this.$el.hasClass('selected')) {
                    this.deselect();
                } else {
                    this.select();
                }
            }
        },
        remove: function() {
            if(this.$el.hasClass('selected')) {
                this.deselect();
            }
            this.$el.remove();
        }
    });
    
    var MenuGroupView = Backbone.View.extend({
        tagName: "div",
        className: "menuGroup fullView container",
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.model.menuGroupGroupCollection.on("selected", function(menuGroupGroup) {
                self.trigger("selectedGroup", menuGroupGroup);
            });
            this.model.menuGroupItemCollection.on("selected", function(menuGroupItem) {
                self.trigger("selectedItem", menuGroupItem);
            });
            
            this.$e = $('<span class="group"><div class="btn-group btn-group-justified actions">\
            <div class="btn-group">\
                <button type="button" class="btn btn-primary btn-lg editGroup">Edit</button>\
            </div>\
            <div class="btn-group">\
                <button type="button" class="btn btn-primary btn-lg addItem">+ Item</button>\
            </div>\
            <div class="btn-group">\
                <button type="button" class="btn btn-primary btn-lg addGroup">+ Sub Menu</button>\
            </div>\
</div>');
            this.$desc = $('<p class="desc"></p></span>');

            this.groupGroupsView = this.model.menuGroupGroupCollection.getView({
                loadOnRenderPage: false,
            });
        },
        render: function() {
            var self = this;
            // var $imagesEl = this.model.menuGroupImageCollection.getView().render().$el;
            // this.$e.append($imagesEl);
            // if(!app.userIsAdmin()) {
            //     $imagesEl.hide();
            // }
            // if(this.model.get('root')) {
            //     // console.log($imagesEl.find('li.menuGroupImage img'))
            //     var $imageClone = $imagesEl.find('li.menuGroupImage img').clone();
            //     $imageClone.addClass('menuPic');
            //     $('li.navRow.menu .bg').append($imageClone);
            // }
            // if(this.model.has("groups")) {}
            // this.groupGroupsView.on('selected', function(model) {
            //     self.trigger("selectedGroup", model);
            // });
            this.$el.append(this.$desc);
            this.$el.append(this.groupGroupsView.render().$el);
            // if(this.model.has("items")) {}
            this.$e.append(this.model.menuGroupItemCollection.getView({
                loadOnRenderPage: false,
            }).render().$el);
            this.$el.append(this.$e);
            if(this.model.has("desc")) {
                this.$el.find('.desc').html(this.model.get("desc"));
            }
            
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
            click: "select",
            "click .editGroup": "editGroup",
            "click .addItem": "addItem",
            "click .addGroup": "addGroup",
            "touchstart input": "touchstartstopprop"
        },
        editGroup: function() {
            this.model.collection.trigger('editModel', this.model);
        },
        addItem: function() {
            this.model.collection.trigger('addItemToModel', this.model);
        },
        addGroup: function() {
            this.model.collection.trigger('addGroupToModel', this.model);
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if(this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    var MenuGroupAvatarView = Backbone.View.extend({
        tagName: "li",
        className: "menuGroup",
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.model.menuGroupGroupCollection.on("selected", function(menuGroupGroup) {
                self.trigger("selectedGroup", menuGroupGroup);
            });
            this.model.menuGroupItemCollection.on("selected", function(menuGroupItem) {
                self.trigger("selectedItem", menuGroupItem);
            });
            
            this.$e = $('<span class="group"><h2 class="name"></h2></span>');
        },
        render: function() {
            this.$el.append(this.$e);
            if(this.model.has("name")) {
                this.$e.find('h2').html(this.model.get("name"));
            } else {
                this.$e.find('h2').html('no name');
            }
            var $imagesEl = this.model.menuGroupImageCollection.getView().render().$el;
            this.$e.append($imagesEl);
            if(!app.userIsAdmin()) {
                $imagesEl.hide();
            }
            if(this.model.get('root')) {
                console.log($imagesEl.find('li.menuGroupImage img'))
                var $imageClone = $imagesEl.find('li.menuGroupImage img').clone();
                $imageClone.addClass('menuPic');
                $('li.navRow.menu .bg').append($imageClone);
            }
            // if(this.model.has("groups")) {}
            this.$e.append(this.model.menuGroupGroupCollection.getView().render().$el);
            // if(this.model.has("items")) {}
            this.$e.append(this.model.menuGroupItemCollection.getView().render().$el);
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
            click: "select",
            "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if(this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    var MenuGroupRowView = Backbone.View.extend({
        tagName: "li",
        className: "menuGroup",
        render: function() {
            var $e = $('<span class="group"></span>');
            this.$el.html($e);
            if(this.model.has("name")) {
                $e.append("<h2>" + this.model.get("name") + "</h2>");
            }
            if(this.model.has("groups")) {}
            if(this.model.has("items")) {}
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        events: {
            click: "select",
            "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if(this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    var MenuGroupImageView = Backbone.View.extend({
        tagName: "div",
        className: "menuGroupImage col-xs-4",
        render: function() {
            var $e = $('<span class="groupImage"></span>');
            this.$el.html($e);
            $e.append('<img src="/api/files/' + this.model.get("filename") + '" />');
            if(app.userIsAdmin()) {
                this.$actions = $('<ul class="actions"></ul>');
                this.$actions.append('<li><button class="moveUp btn btn-link glyphicon glyphicon-arrow-up" title="rank ' + this.model.get("rank") + '"> </button></li><li><button class="remove btn btn-link glyphicon glyphicon-trash"></button></li>');
                this.$el.append(this.$actions);
            }
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        events: {
            click: "select",
            "click .moveUp": "moveUp",
            "click .remove": "removeit",
            "touchstart input": "touchstartstopprop"
        },
        moveUp: function(e) {
            var self = this;
            self.model.collection.sort({
                silent: true
            });
            var r = self.model.get("rank");
            var sibId = this.$el.prev().attr("data-id");
            if(sibId) {
                var swapModel = self.model.collection.get(sibId);
                if(swapModel) {
                    var higherRank = swapModel.get("rank");
                    if(higherRank == r) {
                        r++;
                    }
                    swapModel.set({
                        rank: r
                    }, {silent: true});
                    var sm = swapModel.save(null, {
                        silent: false,
                        wait: true
                    }).done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                        // self.options.list.render();
                    });
                    if(higherRank != self.model.get("rank")) {
                        self.model.set({
                            rank: higherRank
                        }, {silent: true});
                        var s = self.model.save(null, {
                            silent: false,
                            wait: true
                        }).done(function(s, typeStr, respStr) {
                            self.render();
                            self.model.collection.sort({
                                silent: true
                            });
                            self.options.list.render();
                        });
                    }
                }
            }
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        removeit: function(e) {
            this.model.destroy();
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if(this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    var MenuGroupGroupView = Backbone.View.extend({
        tagName: "div",
        className: "menuGroupGroup col-md-4",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            var myId = this.model.get("id");
            this.refModel = this.options.list.collection.options.menuGroup.collection.get(myId);
            if(this.refModel) {
                this.refModel.bind('change', this.render, this);
            }
            this.$e = $('<span class="groupGroup"><h3></h3><span class="bgImage"></span></span>');
            this.$bgImage = $('<img>');
        },
        render: function() {
            this.$el.append(this.$e);
            if(this.model.has("name")) {
                this.$e.find('h3').html(this.model.get("name"));
            }
            if(this.refModel) {
                // this.$el.append(this.refModel.menuGroupImageCollection.getViewMini().render().$el);
                var image = this.refModel.menuGroupImageCollection.first();
                if(image) {
                    var filename = image.get('filename');
                    if(image.has('sizes.medium')) {
                        filename = image.get('sizes.medium').filename;
                    }
                    if(this.$bgImage.attr('src') !==  '/api/files/'+filename) {
                        this.$bgImage.attr('src', '/api/files/'+filename);
                    }
                    this.$e.find('.bgImage').append(this.$bgImage);
                }
                // console.log(this.refModel.menuGroupImageCollection.first())
            }
            if(app.userIsAdmin()) {
                this.$actions = $('<ul class="actions"></ul>');
                this.$actions.append('<li><button class="moveUp btn btn-link glyphicon glyphicon-arrow-up" title="rank ' + this.model.get("rank") + '"></button></li><li><button class="remove btn btn-link glyphicon glyphicon-trash"></button></li>');
                this.$el.append(this.$actions);
            }
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
            click: "select",
            "click .moveUp": "moveUp",
            "click .remove": "removeit",
            "touchstart input": "touchstartstopprop"
        },
        moveUp: function(e) {
            var self = this;
            self.model.collection.sort({
                silent: true
            });
            var r = self.model.get("rank");
            var sibId = this.$el.prev().attr("data-id");
            if(sibId) {
                var swapModel = self.model.collection.get(sibId);
                if(swapModel) {
                    var higherRank = swapModel.get("rank");
                    if(higherRank == r) {
                        r++;
                    }
                    swapModel.set({
                        rank: r
                    }, {silent: true});
                    var sm = swapModel.save(null, {
                        silent: false,
                        wait: true
                    }).done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                        // self.options.list.render();
                    });
                    if(higherRank != self.model.get("rank")) {
                        self.model.set({
                            rank: higherRank
                        }, {silent: true})
                        var s = self.model.save(null, {
                            silent: false,
                            wait: true
                        }).done(function(s, typeStr, respStr) {
                            self.render();
                            self.model.collection.sort({
                                silent: true
                            });
                            self.options.list.render();
                        });
                    }
                }
            }
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        removeit: function(e) {
            this.model.destroy();
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if(this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    var MenuGroupItemView = Backbone.View.extend({
        tagName: "li",
        className: "menuGroupItem",
        render: function() {
            var $e = $('<span class="groupItem"></span>');
            this.$el.html($e);
            if(this.model.has("title")) {
                $e.append("<h3>" + this.model.get("title") + "</h3>");
            }
            if(this.refModel) {
                this.$el.append(this.refModel.menuItemImageCollection.getViewMini().render().$el);
                $e.append("<h3>" + this.refModel.get("title") + "</h3>");
            }
            if(app.userIsAdmin()) {
                this.$actions = $('<ul class="actions"></ul>');
                this.$actions.append('<li><button class="moveUp" title="rank ' + this.model.get("rank") + '">Move Up</button></li><li><button class="remove">Remove</button></li>');
                this.$el.append(this.$actions);
            }
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            var myId = this.model.get("id");
            var cc = this.options.list.collection.options.menuGroup.menuGroupView.options.list.options.itemCollection;
            this.refModel = cc.get(myId);
        },
        events: {
            "click": "select",
            "click .moveUp": "moveUp",
            "click .remove": "removeit",
            "touchstart input": "touchstartstopprop"
        },
        moveUp: function(e) {
            var self = this;
            self.model.collection.sort({
                silent: true
            });
            var r = self.model.get("rank");
            var sibId = this.$el.prev().attr("data-id");
            if(sibId) {
                var swapModel = self.model.collection.get(sibId);
                if(swapModel) {
                    var higherRank = swapModel.get("rank");
                    if(higherRank == r) {
                        r++;
                    }
                    var sm = swapModel.save({
                        rank: r
                    }, {
                        wait: true
                    }).done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                        self.options.list.render();
                    });
                    if(higherRank != self.model.get("rank")) {
                        var s = self.model.save({
                            rank: higherRank
                        }, {
                            wait: true
                        }).done(function(s, typeStr, respStr) {
                            self.render();
                            self.model.collection.sort({
                                silent: true
                            });
                            self.options.list.render();
                        });
                    }
                }
            }
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        removeit: function(e) {
            this.model.destroy();
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if(this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    var MenuGroupPicker = Backbone.View.extend({
        tag: "div",
        className: "menuGroupPicker",
        render: function() {
            this.$el.html('<form><input type="text" name="query" placeholder="search group names" autocomplete="off" /><input type="submit" value="Search" /></form>');
            this.$query = this.$el.find('input[name="query"]');
            this.$el.append(this.menuGroupPickerList.render().$el);
            this.$el.append(this.menuGroupForm.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.menuGroupPickerList = new MenuGroupPickerList({
                collection: this.collection
            });
            this.menuGroupPickerList.on("selected", function(menuGroupView) {
                self.trigger("selected", menuGroupView.model);
            });
            this.menuGroupForm = new MenuGroupForm({
                collection: this.collection
            });
            this.menuGroupForm.on("saved", function(menuGroup) {
                self.trigger("selected", menuGroup);
            });
        },
        events: {
            submit: "submit"
        },
        submit: function(el) {
            var self = this;
            return false;
        },
        clear: function() {
            this.$query.val("");
            this.render();
            this.focus();
        },
        focus: function() {
            this.$query.focus();
        }
    });
    
    var PickerView = Backbone.View.extend({
        tagName: "div",
        className: "menu-group-picker",
        initialize: function() {
            var self = this;
            this.menuGroupsList = window.menuGroupsCollection.getNewListView({
                layout: 'tableRow',
                search: {
                    'fieldName': 'name'
                },
            });
            this.menuGroupsList.on('selected', function(view) {
                console.log(view);
                self.trigger('picked', view.model);
            });
            var newModel = window.menuGroupsCollection.getNewModel({});
            console.log(newModel)
            var formOpts = {
                collection: window.menuGroupsCollection,
                model: newModel,
                submit: false,
                cancel: false,
                delete: false
            };
            formOpts.fields = {
                "name": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "Menu group title",
                    className: "form-control"
                },
            }
            self.houseFormView = formOpts.collection.getNewFormView(formOpts);
            self.houseFormView.on('keyUp', function(inputs){
                var query = inputs.name;
                self.menuGroupsList.searchView.query(query);
            });
            self.houseFormView.on('saved', function(doc){
                self.trigger('picked', doc);
            });
        },
        searchForGroupName: function(groupName) {
            var self = this;
            this.menuGroupsList.search(groupName);
        },
        render: function() {
            var self = this;
            
            this.$el.append(self.houseFormView.render().$el);
            this.$el.append(this.menuGroupsList.render().$el);
            
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        focus: function() {
            this.houseFormView.focus();
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "menu-group-form",
        initialize: function() {
            var self = this;
            var formOpts = {
                collection: this.model.collection,
                model: this.model,
                submit: 'Save',
                cancel: 'Cancel',
                delete: true
            };
            formOpts.fields = {
                "name": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "menu group title",
                    className: "form-control"
                },
                "desc": {
                    validateType: 'string',
                    tagName: 'textarea',
                    placeholder: "details",
                    className: "form-control"
                },
            }
            self.houseFormView = formOpts.collection.getNewFormView(formOpts);
            self.houseFormView.on('saved', function(doc){
                self.trigger('saved', doc);
            });
            self.houseFormView.on('cancelled', function(doc){
                self.trigger('saved', doc);
            });
            self.houseFormView.on('deleted', function(doc){
                self.trigger('saved', doc);
            });
            
            self.$navTabs = $('<ul class="nav nav-tabs">\
    <li class="active"><a href="#'+self.cid+'-basic" data-toggle="tab">Basic Info</a></li>\
    <li><a href="#'+self.cid+'-images" data-toggle="tab">Images</a></li>\
</ul>');
            self.$tabContent = $('<div class="tab-content">\
    <div class="tab-pane active basicInfo" id="'+self.cid+'-basic"></div>\
    <div class="tab-pane images" id="'+self.cid+'-images"><div class="images-list"></div><button class="upload btn btn-primary btn-block">Upload Image</button></div>\
</div>');

            this.groupImagesView = this.model.menuGroupImageCollection.getView({
                // layout: 'row',
                loadOnRenderPage: false,
            });
            
            self.uploadImageFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'image', metadata:{groups: ['public']}});
            self.uploadImageFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(data.image) {
                    self.model.addImage(data.image);
                }
            });
        },
        render: function() {
            var self = this;
            
            self.$tabContent.find('.basicInfo').append(self.houseFormView.render().$el);
            self.$tabContent.find('.images-list').append(self.groupImagesView.render().$el);
            self.$tabContent.find('.images').append(self.uploadImageFrame.render().$el.hide());
            this.$el.append(self.$navTabs);
            this.$el.append(self.$tabContent);
            
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .upload": "uploadImage"
        },
        uploadImage: function() {
            this.uploadImageFrame.pickFiles();
        },
        focus: function() {
            this.houseFormView.focus();
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    if(define) {
        define(function() {
            return {
                Collection: MenuGroupsCollection,
                Model: MenuGroup,
                Form: FormView,
                Picker: PickerView
            };
        });
    }
})();