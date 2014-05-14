(function() {
    var MenuGroup = Backbone.Model.extend({
        initialize: function(attr, opts) {
            var self = this;
            
            var colOpts = {
                menuGroup: this
            };
            
            require(['/menu/menuItems.js'], function(MenuItems){
                window.MenuItems = MenuItems;
                require(['/menu/menuGroups.js'], function(MenuGroups){
                    window.MenuGroups = MenuGroups;
                    require(['/menu/menuItemReviews.js'], function(MenuItemReviews){
                        window.MenuItemReviews = MenuItemReviews;
                        
                        // self.collection = window.urlsCollection = new UrlsBackbone.Collection(); // collection
                        // self.listView = self.collection.getView();
                        
        
                        if (attr.hasOwnProperty("images")) {
                            self.menuGroupImageCollection = new MenuGroupImageCollection(attr.images, colOpts);
                        } else {
                            self.menuGroupImageCollection = new MenuGroupImageCollection([], colOpts);
                        }
                        if (attr.hasOwnProperty("groups")) {
                            self.menuGroupGroupCollection = new MenuGroupGroupCollection(attr.groups, colOpts);
                        } else {
                            self.menuGroupGroupCollection = new MenuGroupGroupCollection([], colOpts);
                        }
                        if (attr.hasOwnProperty("items")) {
                            self.menuGroupItemCollection = new MenuGroupItemCollection(attr.items, colOpts);
                        } else {
                            self.menuGroupItemCollection = new MenuGroupItemCollection([], colOpts);
                        }
                    });
                });
            });
        },
        getView: function(options) {
            if (!this.hasOwnProperty("menuGroupView")) {
                options.model = this;
                this.menuGroupView = new MenuGroupView(options);
            }
            return this.menuGroupView;
        },
        getRowView: function(options) {
            if (!this.hasOwnProperty("menuGroupRowView")) {
                options.model = this;
                this.menuGroupRowView = new MenuGroupRowView(options);
            }
            return this.menuGroupRowView;
        }
    });
    var MenuGroupImage = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            options.model = this;
            return new MenuGroupImageView(options);
        }
    });
    var MenuGroupGroup = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = new MenuGroupGroupView(options);
            }
            return this.row;
        }
    });
    var MenuGroupItem = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = new MenuGroupItemView(options);
            }
            return this.row;
        }
    });
    var MenuItem = Backbone.Model.extend({
        initialize: function(attr, opts) {
            var colOpts = {
                menuItem: this
            };
            if (attr.hasOwnProperty("images")) {
                this.menuItemImageCollection = new MenuItemImageCollection(attr.images, colOpts);
            } else {
                this.menuItemImageCollection = new MenuItemImageCollection([], colOpts);
            }
            if (attr.hasOwnProperty("skus")) {
                this.menuItemSkuCollection = new MenuItemSkuCollection(attr.skus, colOpts);
            } else {
                this.menuItemSkuCollection = new MenuItemSkuCollection([], colOpts);
            }
            this.menuItemReviewCollection = new MenuItemReviewCollection([], colOpts);
        },
        getView: function(options) {
            if(!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = new MenuItemView(options);
            }
            return this.row;
        },
        getRowView: function(options) {
            if(!options) options = {};
            if (!this.hasOwnProperty("menuItemRowView")) {
                options.model = this;
                this.menuItemRowView = new MenuItemRowView(options);
            }
            return this.menuItemRowView;
        },
        getShareView: function(options) {
            if(!options) options = {};
            if (!this.hasOwnProperty("menuItemShareView")) {
                options.model = this;
                this.menuItemShareView = new MenuItemShareView(options);
            }
            return this.menuItemShareView;
        }
    });
    var MenuItemImage = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if(!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            if(!options) options = {};
            options.model = this;
            return new MenuItemImageView(options);
        }
    });
    var MenuItemSku = Backbone.Model.extend({
        idAttribute: "sku",
        initialize: function() {},
        getView: function(options) {
            if(!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            if(!options) options = {};
            options.model = this;
            return new MenuItemSkuView(options);
        },
        getNewSelectOption: function(options) {
            if(!options) options = {};
            options.model = this;
            return new MenuItemSkuSelectOptionView(options);
        }
    });
    var MenuItemReview = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if(!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            if(!options) options = {};
            options.model = this;
            return new MenuItemReviewView(options);
        }
    });
    var Order = Backbone.Model.extend({
        initialize: function(attr, opts) {
            var colOpts = {
                order: this
            };
            if (attr.hasOwnProperty("itemSkus")) {
                this.orderItemSkuCollection = new OrderItemSkuCollection(attr.itemSkus, colOpts);
            } else {
                this.orderItemSkuCollection = new OrderItemSkuCollection([], colOpts);
            }
        },
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            options.model = this;
            return new OrderView(options);
        }
    });
    var OrderItemSku = Backbone.Model.extend({
        idAttribute: "item_id",
        initialize: function(attr, opts) {
            console.log(attr);
            if (attr.hasOwnProperty("item_id") && attr.hasOwnProperty("sku")) {
                this.id = attr.item_id + "/" + attr.sku;
            }
        },
        url: function() {
            var base = getValue(this, "urlRoot") || getValue(this.collection, "url") || urlError();
            if (this.isNew()) return base;
            return base + (base.charAt(base.length - 1) == "/" ? "" : "/") + this.id;
        },
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getBillView: function(options) {
            if (!this.hasOwnProperty("billView")) {
                options.model = this;
                this.billView = this.getNewBillView(options);
            }
            return this.billView;
        },
        getNewBillView: function(options) {
            options.model = this;
            return new OrderItemSkuBillView(options);
        },
        getNewView: function(options) {
            options.model = this;
            return new OrderItemSkuView(options);
        }
    });
    var MenuGroupCollection = Backbone.Collection.extend({
        model: MenuGroup,
        url: "/api/menuGroups",
        initialize: function() {
            var self = this;
        },
        filterParent: function(parentExists) {
            if (parentExists) {
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
        count: function(callback) {
            var aj = $.ajax({
                type: "HEAD",
                url: "/api/menuGroups",
                data: {},
                success: function(json) {
                    callback(aj.getResponseHeader("X-Count"));
                },
                xhrFields: {
                    withCredentials: true
                }
            });
        },
        refreshCount: function() {
            var self = this;
            self.count(function(count) {
                self.colCount = count;
                self.trigger("colCount", count);
            });
        },
        load: function(callback) {
            var self = this;
            if (!this.colCount) {}
            this.reset();
            this.fetch({
                add: true,
                data: this.filter,
                complete: function() {
                    if (callback) callback();
                }
            });
        },
        search: function(term) {
            var self = this;
            if (this.searching) return;
            this.searching = true;
            this.fetch({
                add: true,
                data: {
                    ss: term,
                    sort: "playCount-",
                    limit: limit
                },
                complete: function() {
                    self.searching = false;
                }
            });
        }
    });
    var MenuGroupImageCollection = Backbone.Collection.extend({
        model: MenuGroupImage,
        url: function() {
            return "/api/menuGroups/" + this.options.menuGroup.get("id") + "/images";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new MenuGroupImageList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        getViewMini: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("rowMini")) {
                options.collection = this;
                this.rowMini = new MenuGroupImageList(options);
                this.rowMini.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.rowMini;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        comparator: function(a) {
            return a.get("rank");
        }
    });
    var MenuGroupGroupCollection = Backbone.Collection.extend({
        model: MenuGroupGroup,
        url: function() {
            return "/api/menuGroups/" + this.options.menuGroup.get("id") + "/groups";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new MenuGroupGroupList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        comparator: function(a) {
            return a.get("rank");
        }
    });
    var MenuGroupItemCollection = Backbone.Collection.extend({
        model: MenuGroupItem,
        url: function() {
            return "/api/menuGroups/" + this.options.menuGroup.get("id") + "/items";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new MenuGroupItemList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        comparator: function(a) {
            return a.get("rank");
        }
    });
    var MenuItemCollection = Backbone.Collection.extend({
        model: MenuItem,
        url: "/api/menuItems",
        initialize: function() {
            var self = this;
        },
        filterParent: function(parentExists) {
            if (parentExists) {
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
        count: function(callback) {
            var aj = $.ajax({
                type: "HEAD",
                url: "/api/menuItems",
                data: {},
                success: function(json) {
                    callback(aj.getResponseHeader("X-Count"));
                },
                xhrFields: {
                    withCredentials: true
                }
            });
        },
        refreshCount: function() {
            var self = this;
            self.count(function(count) {
                self.colCount = count;
                self.trigger("colCount", count);
            });
        },
        load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({
                add: true,
                data: this.filter,
                complete: function() {
                    if (callback) callback();
                }
            });
        }
    });
    var MenuItemImageCollection = Backbone.Collection.extend({
        model: MenuItemImage,
        url: function() {
            return "/api/menuItems/" + this.options.menuItem.get("id") + "/images";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new MenuItemImageList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        getViewMini: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("rowMini")) {
                options.collection = this;
                this.rowMini = new MenuItemImageList(options);
                this.rowMini.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.rowMini;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        comparator: function(a) {
            return a.get("rank");
        }
    });
    var MenuItemSkuCollection = Backbone.Collection.extend({
        model: MenuItemSku,
        url: function() {
            return "/api/menuItems/" + this.options.menuItem.get("id") + "/skus";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new MenuItemSkuList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        getSelectView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("selectrow")) {
                options.collection = this;
                options.selectView = true;
                this.selectrow = new MenuItemSkuList(options);
                this.selectrow.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.selectrow;
        },
        getViewMini: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("rowMini")) {
                options.collection = this;
                this.rowMini = new MenuItemSkuList(options);
                this.rowMini.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.rowMini;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        comparator: function(a) {
            return a.get("rank");
        }
    });
    var MenuItemReviewCollection = Backbone.Collection.extend({
        model: MenuItemReview,
        url: function() {
            return "/api/menuItems/" + this.options.menuItem.get("id") + "/reviews";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new MenuItemReviewList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        getForm: function(options) {
            var self = this;
            if (!options) options = {
                menuItem: this.options.menuItem
            };
            options.collection = this;
            this.formView = new MenuItemReviewForm(options);
            return this.formView;
        },
        load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({
                add: true,
                complete: function() {
                    if (callback) callback();
                }
            });
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        comparator: function(a) {
            return a.get("at");
        }
    });
    var OrderCollection = Backbone.Collection.extend({
        model: Order,
        url: "/api/orders",
        initialize: function() {
            var self = this;
        },
        filterPending: function(pendingExists) {
            if (pendingExists) {
                this.filter = {
                    status: pendingExists
                };
            } else {
                this.filter = {
                    status: {
                        $exists: false
                    }
                };
            }
        },
        count: function(callback) {
            var aj = $.ajax({
                type: "HEAD",
                url: "/api/orders",
                data: {},
                success: function(json) {
                    callback(aj.getResponseHeader("X-Count"));
                },
                xhrFields: {
                    withCredentials: true
                }
            });
        },
        refreshCount: function() {
            var self = this;
            self.count(function(count) {
                self.colCount = count;
                self.trigger("colCount", count);
            });
        },
        load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({
                add: true,
                data: this.filter,
                complete: function() {
                    if (callback) callback();
                }
            });
        }
    });
    var OrderItemSkuCollection = Backbone.Collection.extend({
        model: OrderItemSku,
        url: function() {
            return "/api/orders/" + this.options.order.get("id") + "/itemSkus";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new OrderItemSkuList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        getFullView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("fullview")) {
                options.collection = this;
                this.fullview = new OrderItemSkuBill(options);
                this.fullview.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.fullview;
        },
        getViewMini: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("rowMini")) {
                options.collection = this;
                this.rowMini = new OrderItemSkuList(options);
                this.rowMini.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.rowMini;
        },
        addItem: function(menuItem, itemSku) {
            var self = this;
            var newO = {
                qty: 1
            };
            newO.item_id = menuItem.id;
            newO.item_title = menuItem.get("title");
            if (itemSku) {
                newO.sku = itemSku.id;
                newO.sku_name = itemSku.get("name");
                if (itemSku.has("price")) {
                    newO.price = itemSku.get("price");
                }
            }
            var m = new this.model({}, {
                collection: this
            });
            m.set(newO);
            delete m.id;
            var saveModel = m.save();
            saveModel.done(function() {
                self.add(m);
            });
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        }
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
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var MenuItemPickerList = Backbone.View.extend({
        tag: "span",
        className: "menuItems",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html('<span class="itemList"></span>');
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
                if (!self.$ul) {
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
            if (account.isAdmin()) {
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
            if (!file) {
                return;
            }
            var self = this;
            var imagesMaxRank = 0;
            if (this.selectedMenu.has("images") && this.selectedMenu.menuGroupImageCollection.length > 0) {
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
            if (this.selectedMenu.has("groups")) {
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
            if (this.selectedMenu.has("items")) {
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
            if (newName && newName != oldName) {
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
            if (m.has("root")) {
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
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
            
            this.uploadInput = new UploadInputView;
            this.uploadInput.on("upload", function(data) {
                if (data.file) {
                    self.addImageToCurrentMenuGroup(data.file);
                }
            });
        }
    });
    var UploadInputView = Backbone.View.extend({
        tag: "span",
        className: "upload",
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
            this.$input.show();
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
                console.log(arguments);
                var data = JSON.parse(e.target.response);
                self.$input.hide();
                self.$meter.hide();
                if (callback) callback(data);
            };
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    console.log(e);
                    var per = Math.floor((e.loaded / e.total) * 100);
                    self.$meter.find('.bar').css('width', per);
                }
            };
            xhr.setRequestHeader('cache-control', 'no-cache');
            xhr.send(formData);
        },
        fileChangeListener: function(e) {
            console.log(e.target)
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
                        self.trigger("upload", data);
                    });
                    if (queue.length > 0) {
                        process();
                    } else {}
                }
            };
            process();
            return false;
        },
        initialize: function() {
            var self = this;
            this.$input = $('<input class="uploadInput" style="display:none" type="file" multiple accept="image/*" capture="camera">');
            this.$meter = $('<div class="meter" style="display:none"><div class="bar" style="width:1%"></div></div>');
        }
    });
    var MenuItemList = Backbone.View.extend({
        tag: "span",
        className: "menuItems",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            if (this.options.menu.userIsAdmin()) {
                this.$actions.append('<li><button class="editName">Edit Name</button><button class="editDesc">Edit Desc</button></li>');
                var $liAttach = $('<li><button class="attachImage">Attach Image</button></li>');
                $liAttach.append(this.uploadInput.render().$el);
                this.$actions.append($liAttach);
                this.$actions.append('<li><button class="addSku">Add SKU</button></li>');
            }
            this.$el.append(this.$ul);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .editName": "editName",
            "click .editDesc": "editDesc",
            "click .addSku": "addSku",
            "click .attachImage": "attachImage"
        },
        addSku: function() {
            var self = this;
            var sku = prompt("Enter a SKU");
            var name = prompt("Enter a product name");
            if (!sku || !name) return;
            var maxRank = 1;
            if (this.selectedMenuItem.has("skus") && this.selectedMenuItem.menuItemSkuCollection.length > 0) {
                maxRank = this.selectedMenuItem.menuItemSkuCollection.last().get("rank");
            }
            var newDoc = {
                name: name,
                sku: sku,
                rank: maxRank
            };
            var model = new MenuItemSku(newDoc, {
                collection: this.selectedMenuItem.menuItemSkuCollection
            });
            model.id = null;
            var saveModel = model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.selectedMenuItem.menuItemSkuCollection.add(model);
            });
        },
        attachImage: function() {
            this.$el.find('input[type="file"]').show();
            this.$el.find('input[type="file"]').click();
        },
        addImageToCurrentMenuItem: function(file) {
            if (!file) {
                return;
            }
            var self = this;
            var imagesMaxRank = 0;
            if (this.selectedMenuItem.has("images") && this.selectedMenuItem.menuItemImageCollection.length > 0) {
                imagesMaxRank = this.selectedMenuItem.menuItemImageCollection.last().get("rank");
            }
            var image = {
                _id: file._id,
                filename: file.filename,
                rank: imagesMaxRank + 1
            };
            var model = new MenuItemImage({}, {
                collection: this.selectedMenuItem.menuItemImageCollection
            });
            model.set(image);
            var saveModel = model.save(null, {
                silent: true,
                wait: true
            });
            saveModel.done(function() {
                self.selectedMenuItem.menuItemImageCollection.add(model);
            });
        },
        editName: function() {
            var oldName = this.selectedMenuItem.get("title");
            var newName = prompt("Edit the menu item title", oldName);
            if (newName && newName != oldName) {
                var savetx = this.selectedMenuItem.save({
                    title: newName
                }, {
                    silent: false,
                    wait: true
                });
                savetx.done(function(s, typeStr, respStr) {});
            }
        },
        editDesc: function() {
            var oldName = this.selectedMenuItem.get("desc");
            var newName = prompt("Edit the menu item desc", oldName);
            if (newName && newName != oldName) {
                var savetx = this.selectedMenuItem.save({
                    desc: newName
                }, {
                    silent: false,
                    wait: true
                });
                savetx.done(function(s, typeStr, respStr) {});
            }
        },
        hideAll: function() {
            this.$ul.children().removeAttr("selected");
        },
        appendModel: function(m) {
            var self = this;
            var v = m.getView({
                list: this
            });
            var $el = v.render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.options.menu.on("refreshUser", function(user) {
                self.render();
            });
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
            this.uploadInput = new UploadInputView;
            this.uploadInput.on("upload", function(data) {
                if (data.file) {
                    self.addImageToCurrentMenuItem(data.file);
                }
            });
        }
    });
    var MenuItemImageList = Backbone.View.extend({
        tag: "span",
        className: "menuItemImages",
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
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var MenuItemSkuList = Backbone.View.extend({
        tag: "span",
        className: "menuItemSkus",
        render: function() {
            var self = this;
            if (this.options.selectView) {
                this.$ul = $("<select></select>");
            } else {
                this.$ul = $("<ul></ul>");
            }
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
            if (this.options.selectView) {
                var $el = m.getNewSelectOption({
                    list: this
                }).render().$el;
            } else {
                var $el = m.getNewView({
                    list: this
                }).render().$el;
            }
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var MenuItemReviewList = Backbone.View.extend({
        tag: "span",
        className: "menuItemReviews",
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("<h4>Customer Reviews</h4>");
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
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
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
                if (!self.$ul) {
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
                if (!self.$ul) {
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
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var OrderList = Backbone.View.extend({
        tag: "span",
        className: "orders",
        render: function() {
            var self = this;
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
            var self = this;
            this.$el.show();
            var v = m.getView({
                list: this
            });
            var $el = v.render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var OrderItemSkuList = Backbone.View.extend({
        tag: "span",
        className: "orderItemSkuList",
        renderCount: function() {
            this.$itemSkuCount.find(".count").html(this.collection.length);
        },
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$ul.hide();
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.renderCount();
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            this.$el.append(this.$itemSkuCount);
            this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .itemSkuCount": "toggleItems"
        },
        toggleItems: function() {
            this.$ul.toggle();
        },
        appendModel: function(m) {
            var self = this;
            this.$el.show();
            var $el = m.getView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.$itemSkuCount = $('<span class="itemSkuCount">items: <span class="count"></span></span>');
            this.collection.on("add", function(m) {
                self.appendModel(m);
                self.$el.parents(".orderFrame").show();
                self.renderCount();
            });
            this.collection.on("remove", function(m) {
                self.renderCount();
            });
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var OrderItemSkuBill = Backbone.View.extend({
        tag: "span",
        className: "orderItemSkuBill",
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
            this.renderTotals();
            this.$el.append(this.$totals);
            this.setElement(this.$el);
            return this;
        },
        renderTotals: function() {
            var totalPrice = 0;
            this.collection.each(function(m, i, c) {
                if (m.has("price")) {
                    totalPrice += parseFloat(m.get("price"));
                }
            });
            this.$totals.html('Total: <span class="totalPrice"></span>');
            this.$totals.find(".totalPrice").html("$" + totalPrice);
        },
        events: {
            "click .itemSkuCount": "toggleItems"
        },
        toggleItems: function() {
            this.$ul.toggle();
        },
        appendModel: function(m) {
            var self = this;
            this.$el.show();
            var $el = m.getBillView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
        initialize: function() {
            var self = this;
            this.$totals = $('<div class="totals"></div>');
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("remove", function(m) {});
            this.collection.on("reset", function() {
                if (!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
                }
            });
        }
    });
    var MenuGroupView = Backbone.View.extend({
        tagName: "li",
        className: "menuGroup",
        render: function() {
            var $e = $('<span class="group"></span>');
            this.$el.html($e);
            if (this.model.has("name")) {
                $e.append("<h2>" + this.model.get("name") + "</h2>");
            }
            var $imagesEl = this.model.menuGroupImageCollection.getView().render().$el;
            $e.append($imagesEl);
            if(!menu.userIsAdmin()) {
                $imagesEl.hide();
            }
            if(this.model.get('root')) {
                console.log($imagesEl.find('li.menuGroupImage img'))
                var $imageClone = $imagesEl.find('li.menuGroupImage img').clone();
                $imageClone.addClass('menuPic');
                $('li.navRow.menu .bg').append($imageClone);
            }
            if (this.model.has("groups")) {}
            $e.append(this.model.menuGroupGroupCollection.getView().render().$el);
            if (this.model.has("items")) {}
            $e.append(this.model.menuGroupItemCollection.getView().render().$el);
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
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
        },
        events: {
            click: "select",
            "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuGroupRowView = Backbone.View.extend({
        tagName: "li",
        className: "menuGroup",
        render: function() {
            var $e = $('<span class="group"></span>');
            this.$el.html($e);
            if (this.model.has("name")) {
                $e.append("<h2>" + this.model.get("name") + "</h2>");
            }
            if (this.model.has("groups")) {}
            if (this.model.has("items")) {}
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
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuItemRowView = Backbone.View.extend({
        tagName: "li",
        className: "menuItem",
        render: function() {
            var $e = $('<span class="item"></span>');
            this.$el.html($e);
            if (this.model.has("title")) {
                $e.append("<h2>" + this.model.get("title") + "</h2>");
            }
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
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuItemShareView = Backbone.View.extend({
        tagName: "span",
        className: "menuItemShare",
        render: function() {
            //console.log(this.options.review.getView().render().$el);
            var $e = $('<span class="item"></span>');
            this.$el.html($e);
            if (this.model.has("title")) {
                $e.append("<h2>Your review of " + this.model.get("title") + "</h2><p>Thanks for taking the time to leave a review for us!  Take a second to share your thoughts with the world.</p>");
            }
            this.$el.append(this.options.review.getNewView().render().$el);
            
            this.$el.append('<span class="urlShare">Copy the link: <input type="text" value="'+window.location+'" /></span>');
            this.$el.append('<button class="blue">Share to Facebook</button>');
            this.$el.append('<button class="blue">Share to Twitter</button>');
            
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            
        },
        events: {
            "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuItemImageView = Backbone.View.extend({
        tagName: "li",
        className: "menuItemImage",
        render: function() {
            var $e = $('<span class="itemImage"></span>');
            this.$el.html($e);
            $e.append('<img src="/api/files/' + this.model.get("filename") + '" />');
            if (menu.userIsAdmin()) {
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
            menu.on("refreshUser", function(user) {
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
            if (sibId) {
                var swapModel = self.model.collection.get(sibId);
                if (swapModel) {
                    var higherRank = swapModel.get("rank");
                    if (higherRank == r) {
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
                    if (higherRank != self.model.get("rank")) {
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
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuItemSkuView = Backbone.View.extend({
        tagName: "li",
        className: "menuItemSku",
        render: function() {
            var $e = $('<span class="itemSku"></span>');
            this.$el.html($e);
            $e.append('<span class="name">' + this.model.get("name") + "</span>");
            if (this.model.has("price")) {
                $e.append('<span class="price">$' + this.model.get("price") + "</span>");
            }
            if (menu.userIsAdmin()) {
                this.$actions = $('<ul class="actions"></ul>');
                this.$actions.append('<li><button class="setPrice">Set Price</button></li><li><button class="moveUp" title="rank ' + this.model.get("rank") + '">Move Up</button></li><li><button class="remove">Remove</button></li>');
                if (this.model.has("default")) {
                    this.$actions.append('<li><button class="removeDefault">Remove as Default</button></li>');
                } else {
                    this.$actions.append('<li><button class="setDefault">Set as Default</button></li>');
                }
                this.$el.append(this.$actions);
            }
            this.$el.attr("data-id", this.model.get("sku"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            menu.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        events: {
            click: "select",
            "click .setPrice": "setPrice",
            "click .moveUp": "moveUp",
            "click .remove": "removeit",
            "touchstart input": "touchstartstopprop"
        },
        setPrice: function(e) {
            var self = this;
            var newPrice = prompt("Set SKU price", this.model.get("price"));
            var saveModel = self.model.save({
                price: newPrice
            }, {
                wait: true
            });
            saveModel.done(function(s, typeStr, respStr) {
                self.render();
                self.model.collection.sort({
                    silent: true
                });
                self.options.list.render();
            });
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        moveUp: function(e) {
            var self = this;
            self.model.collection.sort({
                silent: true
            });
            var r = self.model.get("rank");
            var sibId = this.$el.prev().attr("data-id");
            if (sibId) {
                var swapModel = self.model.collection.get(sibId);
                if (swapModel) {
                    var higherRank = swapModel.get("rank");
                    if (higherRank == r) {
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
                    if (higherRank != self.model.get("rank")) {
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
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuItemSkuSelectOptionView = Backbone.View.extend({
        tagName: "option",
        className: "menuItemSkuSelectOption",
        render: function() {
            this.$el.html("");
            this.$el.html(this.model.get("name"));
            if (this.model.has("price")) {
                this.$el.html(this.$el.html() + " $" + this.model.get("price"));
            }
            this.$el.attr("data-id", this.model.get("sku"));
            this.$el.attr("value", this.model.get("sku"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        events: {},
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuItemReviewView = Backbone.View.extend({
        tagName: "li",
        className: "menuItemReview",
        render: function() {
            var $e = $('<span class="itemReview"></span>');
            this.$el.html($e);
            var $user = $('<span class="user"></span>');
            if (this.model.get("user").avatar) {
                $user.append('<span class="avatar"><img src="/api/files/' + this.model.get("user").avatar + '" /></span>');
            }
            $user.append('<span class="name">' + this.model.get("user").name + "</span>");
            $user.attr("data-id", this.model.get("user").id);
            $e.append($user);
            if (this.model.has("vote")) {
                var $vote = $('<span class="vote"></span>');
                var $thumb = $('<span></span>');
                if (this.model.get("vote")) {
                    $vote.html("like");
                    $thumb.addClass('thumbUp');
                } else {
                    $vote.html("dislike");
                    $thumb.addClass('thumbDown');
                }
                $thumb.append($vote);
                $e.append($thumb);
            }
            if (this.model.has("image")) {
                $e.append('<span class="image"><img src="/api/files/' + this.model.get("image").filename + '" /></span>');
            }
            if (this.model.has("msg")) {
                $e.append('<span class="msg"><p>' + this.model.get("msg") + "</p></span>");
            }
            this.$actions = $('<ul class="actions"></ul>');
            if (menu.userIsAdmin()) {
                this.$actions.append('<li><button class="remove">Delete Review</button></li>');
            }
            this.$el.append(this.$actions);
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            menu.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        events: {
            click: "select",
            "click .remove": "removeit",
            "touchstart input": "touchstartstopprop"
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
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuGroupImageView = Backbone.View.extend({
        tagName: "li",
        className: "menuGroupImage",
        render: function() {
            var $e = $('<span class="groupImage"></span>');
            this.$el.html($e);
            $e.append('<img src="/api/files/' + this.model.get("filename") + '" />');
            if (menu.userIsAdmin()) {
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
            menu.on("refreshUser", function(user) {
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
            if (sibId) {
                var swapModel = self.model.collection.get(sibId);
                if (swapModel) {
                    var higherRank = swapModel.get("rank");
                    if (higherRank == r) {
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
                    if (higherRank != self.model.get("rank")) {
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
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuGroupGroupView = Backbone.View.extend({
        tagName: "li",
        className: "menuGroupGroup",
        render: function() {
            var $e = $('<span class="groupGroup"></span>');
            this.$el.html($e);
            if (this.model.has("name")) {
                $e.append("<h3>" + this.model.get("name") + "</h3>");
            }
            if(this.refModel) {
                this.$el.append(this.refModel.menuGroupImageCollection.getViewMini().render().$el);
            }
            if (menu.userIsAdmin()) {
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
            menu.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            var myId = this.model.get("id");
            this.refModel = this.options.list.collection.options.menuGroup.collection.get(myId);
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
            if (sibId) {
                var swapModel = self.model.collection.get(sibId);
                if (swapModel) {
                    var higherRank = swapModel.get("rank");
                    if (higherRank == r) {
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
                    if (higherRank != self.model.get("rank")) {
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
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuGroupItemView = Backbone.View.extend({
        tagName: "li",
        className: "menuGroupItem",
        render: function() {
            var $e = $('<span class="groupItem"></span>');
            this.$el.html($e);
            if (this.model.has("title")) {
                $e.append("<h3>" + this.model.get("title") + "</h3>");
            }
            if(this.refModel) {
                this.$el.append(this.refModel.menuItemImageCollection.getViewMini().render().$el);
                $e.append("<h3>" + this.refModel.get("title") + "</h3>");
            }
            if (menu.userIsAdmin()) {
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
            menu.on("refreshUser", function(user) {
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
            if (sibId) {
                var swapModel = self.model.collection.get(sibId);
                if (swapModel) {
                    var higherRank = swapModel.get("rank");
                    if (higherRank == r) {
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
                    if (higherRank != self.model.get("rank")) {
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
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuItemView = Backbone.View.extend({
        tagName: "li",
        className: "menuItem",
        render: function() {
            var $e = $("<span></span>");
            this.$el.html($e);
            $e.append(this.model.menuItemImageCollection.getView().render().$el);
            if (this.model.has("title")) {
                $e.append("<h2>" + this.model.get("title") + "</h2>");
            }
            if (this.model.has("desc")) {
                $e.append('<p class="desc">' + this.model.get("desc") + "</p>");
            }
            if (this.model.has("el")) {
                $e.append(this.model.get("el"));
            }
            $e.append(this.model.menuItemSkuCollection.getSelectView().render().$el);
            $e.append('<div class="orderbtn"><button class="order">Add to Order</button></div>');
            console.log("render menu item view");
            $e.append(this.model.menuItemReviewCollection.getView().render().$el);
            $e.append('<div class="btn"><button class="postReview blue">Post a Review</button></div>');
            if (menu.userIsAdmin()) {
                $e.append("<h4>Edit Product</h4>");
                $e.append(this.model.menuItemSkuCollection.getView().render().$el);
            }
            this.model.menuItemReviewCollection.load();
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            menu.on("refreshUser", function(user) {
                self.render();
            });
        },
        events: {
            click: "select",
            "click button.order": "order",
            "click button.postReview": "postReview",
            "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        order: function() {
            console.log(menu);
            console.log(this.options.list.options.menu);
            var sku = this.$el.find("option:selected").val();
            var itemSku = this.model.menuItemSkuCollection.get(sku);
            this.options.list.options.menu.orderPending.addMenuItemSkuToOrder(this.model, itemSku);
            return false;
        },
        postReview: function() {
            var self = this;
            var form = this.model.menuItemReviewCollection.getForm();
            var $lightbox = utils.appendLightBox(form.render().$el);
            form.on("saved", function(menuItemReview) {
                form.remove();
                $lightbox.remove();
                // share me!
                var shareView = self.model.getShareView({review: menuItemReview});
                var $mlightbox = utils.appendLightBox(shareView.render().$el);
            });
            return false;
        },
        select: function() {
            if (this.model.has("navigate")) {
                nav.router.navigate(this.model.get("navigate"), true);
            } else {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
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
    var MenuItemPicker = Backbone.View.extend({
        tag: "div",
        className: "menuItemPicker",
        render: function() {
            this.$el.html('<form><input type="text" name="query" placeholder="search items" autocomplete="off" /><input type="submit" value="Search" /></form>');
            this.$query = this.$el.find('input[name="query"]');
            this.$el.append(this.menuItemPickerList.render().$el);
            this.$el.append(this.menuItemForm.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.menuItemPickerList = new MenuItemPickerList({
                collection: this.collection
            });
            this.menuItemPickerList.on("selected", function(menuItemView) {
                self.trigger("selected", menuItemView.model);
            });
            this.menuItemForm = new MenuItemForm({
                collection: this.collection
            });
            this.menuItemForm.on("saved", function(menuItem) {
                self.trigger("selected", menuItem);
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
    var MenuGroupForm = Backbone.View.extend({
        tag: "div",
        className: "menuGroupForm",
        render: function() {
            this.$el.html('<form><input type="text" name="name" placeholder="new menu group name" autocomplete="off" /><input type="submit" value="Save" /></form>');
            this.$name = this.$el.find('input[name="name"]');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
            submit: "submit"
        },
        submit: function(el) {
            var self = this;
            var m = new MenuGroup({}, {
                collection: this.collection
            });
            m.set({
                name: this.$name.val()
            });
            var s = m.save(null, {
                silent: true,
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
    var MenuItemSkuForm = Backbone.View.extend({
        tag: "div",
        className: "menuItemSkuForm",
        render: function() {
            this.$el.html('<form><input type="text" name="name" placeholder="new menu item name" autocomplete="off" /><input type="submit" value="Save" /></form>');
            this.$title = this.$el.find('input[name="title"]');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
            submit: "submit"
        },
        submit: function(el) {
            var self = this;
            var m = new MenuItem({}, {
                collection: this.collection
            });
            m.set({
                title: this.$title.val()
            });
            var s = m.save(null, {
                silent: true,
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
            this.$title.val("");
            this.render();
            this.focus();
        },
        focus: function() {
            this.$title.focus();
        }
    });
    var MenuItemForm = Backbone.View.extend({
        tag: "div",
        className: "menuItemForm",
        render: function() {
            this.$el.html('<form><input type="text" name="title" placeholder="new menu item title" autocomplete="off" /><input type="submit" value="Save" /></form>');
            this.$title = this.$el.find('input[name="title"]');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
            submit: "submit"
        },
        submit: function(el) {
            var self = this;
            var m = new MenuItem({}, {
                collection: this.collection
            });
            m.set({
                title: this.$title.val()
            });
            var s = m.save(null, {
                silent: true,
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
            this.$title.val("");
            this.render();
            this.focus();
        },
        focus: function() {
            this.$title.focus();
        }
    });
    var MenuSearchFormView = Backbone.View.extend({
        tag: "div",
        className: "menuSearchForm",
        render: function() {
            this.$el.html('<form><input type="text" name="query" placeholder="search everything" autocomplete="off" /><input type="submit" value="Search" /></form>');
            this.$query = this.$el.find('input[name="query"]');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
            submit: "submit"
        },
        submit: function(el) {
            var self = this;
            return false;
        },
        clear: function() {
            this.$msg.val("");
            this.render();
            this.focus();
        },
        focus: function() {
            this.$msg.focus();
        }
    });
    var MenuItemReviewForm = Backbone.View.extend({
        tagName: "div",
        className: "menuItemReviewForm",
        render: function() {
            var menuItemTitle = this.options.menuItem.get('title');
            var onOff = '<span class="toggle" style=""><label class="thumbUp"><input type="radio" name="toggle" value="good"><span>Like</span></label><label class="thumbDown"><input type="radio" name="toggle" value="bad"><span>Dislike</span></label></span>';
            this.$el.html('<h4>Review '+menuItemTitle+'</h4><form id="menuItemReviewForm">' + onOff + '<span class="msgWrap"><textarea name="msg" placeholder="Tell us what you think about this"></textarea></span><span class="image"><button class="attachPhoto blue">Attach Photo</button></span><input type="submit" value="Submit Review" /></form>');
            this.$el.find(".image").append(this.uploadInput.render().$el);
            if(menu.user) {
                var $reviewAsUser = menu.user.getAvatarNameView().render().$el.clone();
                this.$el.find('h4').after($reviewAsUser);
            }
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.uploadInput = new UploadInputView;
            this.uploadInput.on("upload", function(data) {
                if (data.file) {
                    self.addImage(data);
                }
            });
        },
        events: {
            "submit form": "submit",
            "click button.attachPhoto": "attachPhoto"
        },
        attachPhoto: function() {
            this.$el.find('input[type="file"]').show();
            this.$el.find('input[type="file"]').click();
            return false;
        },
        addImage: function(data) {
            console.log(data);
            var $previewImg = $('<img src="/api/files/' + data.file.filename + '" />');
            var $img = this.$el.find(".image");
            $img.append($previewImg);
            $img.attr("data-id", data.file._id);
            $img.attr("data-filename", data.file.filename);
            this.$el.find('input[type="file"]').hide();
        },
        submit: function() {
            var self = this;
            var toggle = this.$el.find("input:checked").val();
            console.log(toggle);
            var msg = this.$el.find('[name="msg"]').val();
            console.log(msg);
            var $img = this.$el.find(".image");
            console.log($img.attr("data-id"));
            var newReview = {};
            if (toggle) {
                if (toggle == "bad") {
                    newReview.vote = 0;
                } else {
                    newReview.vote = 1;
                }
            }
            if ($img.attr("data-id") && $img.attr("data-filename")) {
                newReview.image = {
                    id: $img.attr("data-id"),
                    filename: $img.attr("data-filename")
                };
            }
            if (msg && msg !== "") {
                newReview.msg = msg;
            }
            console.log(newReview);
            if (newReview != {}) {
                var m = new MenuItemReview({}, {
                    collection: this.collection
                });
                m.set(newReview);
                var s = m.save(null, {
                    silent: true,
                    wait: true
                });
                s.done(function() {
                    self.trigger("saved", m);
                    self.collection.add(m);
                });
            }
            return false;
        },
        focus: function() {},
        remove: function() {
            $(this.el).remove();
        }
    });
    var OrderView = Backbone.View.extend({
        tagName: "span",
        className: "order",
        render: function() {
            var $e = $('<span class="orderView"></span>');
            console.log(this.model);
            $e.append(this.model.orderItemSkuCollection.getView().render().$el);
            this.$el.html($e);
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            menu.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        events: {
            click: "select",
            "click .remove": "removeit",
            "touchstart input": "touchstartstopprop"
        },
        removeit: function(e) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var OrderItemSkuBillView = Backbone.View.extend({
        tagName: "li",
        className: "orderItemSku",
        render: function() {
            this.$el.html("");
            if (this.model.has("item_title")) {
                this.$el.append('<span class="itemTitle">' + this.model.get("item_title") + "</span>");
            }
            if (this.model.has("sku_name")) {
                this.$el.append(' <span class="skuName">' + this.model.get("sku_name") + "</span>");
            }
            if (this.model.has("price")) {
                this.$el.append('<span class="price">$ ' + this.model.get("price") + "</span>");
            }
            this.$el.append(this.$actions);
            if (this.model.has("qty")) {
                this.$el.append('<span class="qty">qty <input title="quantity" type="text" class="qtyInput" value="' + this.model.get("qty") + '" name="qty" /></span>');
            }
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$actions = $('<ul class="actions"></ul>');
            this.$actions.append('<a href="#" class="delete">remove</a>');
        },
        events: {
            click: "select",
            "click .delete": "destroy",
            "touchstart input": "touchstartstopprop"
        },
        destroy: function(e) {
            console.log(this.model);
            this.model.destroy();
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var OrderItemSkuView = Backbone.View.extend({
        tagName: "li",
        className: "orderItemSku",
        render: function() {
            this.$el.html("");
            if (this.model.has("item_title")) {
                this.$el.append('<span class="itemTitle">' + this.model.get("item_title") + "</span>");
            }
            if (this.model.has("sku_name")) {
                this.$el.append(' <span class="skuName">' + this.model.get("sku_name") + "</span>");
            }
            if (this.model.has("price")) {
                this.$el.append('<span class="price">$ ' + this.model.get("price") + "</span>");
            }
            if (this.model.has("qty")) {}
            this.$el.append(this.$actions);
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$actions = $('<ul class="actions"></ul>');
            this.$actions.append('<button class="delete">X</button>');
        },
        events: {
            click: "select",
            "click .delete": "destroy",
            "touchstart input": "touchstartstopprop"
        },
        destroy: function(e) {
            console.log(this.model);
            this.model.destroy();
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        select: function() {
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var OrderPendingView = Backbone.View.extend({
        tag: "span",
        className: "ordersPending",
        render: function() {
            var self = this;
            this.$el.html('<div id="orderFrame" class="orderFrame" style="display:none;"><span class="pendingOrders"></span> <button class="placeOrder">Place Order</button></div>');
            this.$el.find(".pendingOrders").html(this.ordersPendingList.render().$el);
            if (this.orderCollection.length > 0 && this.orderCollection.first().orderItemSkuCollection.length > 0) {
                console.log(this.orderCollection);
                this.$el.find(".orderFrame").show();
            }
            return this;
        },
        initialize: function() {
            var self = this;
            this.orderCollection = new OrderCollection;
            this.ordersPendingList = new OrderList({
                collection: this.orderCollection
            });
            this.orderCollection.filterPending(false);
            this.orderCollection.load(function() {
                self.render();
            });
        },
        events: {
            "click button.placeOrder": "placeOrder"
        },
        makeFirstOrder: function(callback) {
            var model = new Order({}, {
                collection: this.orderCollection
            });
            var saveModel = model.save(null, {
                silent: false,
                wait: true
            });
            if (saveModel) {
                saveModel.done(function() {
                    model.collection.add(model);
                    if (callback) {
                        callback();
                    }
                });
            }
        },
        placeOrder: function() {
            var order = this.orderCollection.first();
            var placeOrderView = new PlaceOrderView({
                order: order
            });
            this.$placeOrderLight = utils.appendLightBox(placeOrderView.render().$el);
            return false;
        },
        addMenuItemSkuToOrder: function(menuItem, itemSku) {
            var self = this;
            if (this.orderCollection.length === 0) {
                this.makeFirstOrder(function() {
                    self.addMenuItemSkuToOrder(menuItem, itemSku);
                });
                return;
            }
            this.order = this.orderCollection.first();
            console.log(this.order);
            console.log(arguments);
            if (this.order) {
                this.order.orderItemSkuCollection.addItem(menuItem, itemSku);
            } else {
                console.log("err");
                console.log(this.orderCollection);
            }
        }
    });
    var PlaceOrderView = Backbone.View.extend({
        tagName: "span",
        className: "placeOrder",
        render: function() {
            console.log(this.options.order);
            var $e = $('<span class="placeOrderView"><h3>Place Order</h3><div class="items"></div><span class="paymentMethods"><p>Choose payment method:</p><button class="cash">Cash</button><button class="credit">Credit</button><button class="points">Patron Points</button></span>');
            $e.find(".items").append(this.options.order.orderItemSkuCollection.getFullView().render().$el);
            this.$el.html($e);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            menu.on("refreshUser", function(user) {
                self.render();
            });
        },
        events: {
            "click button.cash": "order",
            "click button.credit": "order",
            "touchstart input": "touchstartstopprop"
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        order: function() {
            var self = this;
            if (!menu.user) {
                menu.auth.getView().login(function() {
                    console.log(menu.auth);
                    menu.auth.getView().getUserModel(function(user) {
                        console.log(user);
                        menu.bindUser(user);
                        self.order();
                    });
                });
                return false;
            }
            this.options.order.set({
                status: 10
            }, {
                silent: true,
                wait: true
            });
            var saveModel = this.options.order.save(null);
            if (saveModel) {
                saveModel.done(function() {
                    alert("Thank you!  Your order has been placed.");
                    menu.router.navigate("patron/" + menu.auth.getView().userModel.get("name"), true);
                });
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var MenuView = Backbone.View.extend({
        tag: "span",
        className: "menu",
        render: function() {
            var self = this;
            this.$el.html("");
            this.$el.append(this.menuGroupList.render().$el);
            this.$el.append(this.menuItemList.render().$el);
            this.$el.append(this.orderPending.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.menuGroupCollection = new MenuGroupCollection;
            this.menuItemCollection = new MenuItemCollection;
            this.menuGroupList = new MenuGroupList({
                collection: this.menuGroupCollection,
                itemCollection: this.menuItemCollection
            });
            this.menuItemList = new MenuItemList({
                collection: this.menuItemCollection,
                menu: this
            });
            this.orderPending = new OrderPendingView;
            this.menuItemCollection.load(function() {
                self.menuGroupCollection.load(function() {
                    self.initalized = true;
                    self.trigger('initalized', true);
                });
            });
        },
        findMenuRoot: function() {
            return _(this.menuGroupCollection.where({
                root: true
            })).first();
        },
        findMenuItemById: function(id) {
            return this.menuItemCollection.get(id);
        },
        findMenuSlug: function(slug) {
            var menuGroups = this.menuGroupCollection.filter(function(e) {
                if (e.get("name").toLowerCase() == slug) {
                    return true;
                }
                return false;
            });
            if (menuGroups.length > 0) {
                return _(menuGroups).first();
            }
        },
        userIsAdmin: function() {
            return this.user && this.user.has("groups") && this.user.get("groups").indexOf("admin") !== -1;
        },
        bindAuth: function(auth) {
            var self = this;
            self.auth = auth;
        },
        bindUser: function(user) {
            var self = this;
            self.user = user;
            self.trigger("refreshUser", user);
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            var doFx = false;
            var menuRouter = function(path) {
                router.reset();
                //$('body').addClass('loading');
                $('#splash').show();
                // window.scrollTo(0);
                menu.$el.parent().show();
                var navDir = Backbone.history.navDirection;
                var gotoMenu = function(menuGroup) {
                    console.log(menuGroup)
                    router.setTitle(menuGroup.get("name"));
                    var v = menuGroup.getView();
                    v.$el.addClass("loading");
                    if (v.options.list.selectedMenu == menuGroup) {} else {
                        v.options.list.selectedMenu = menuGroup;
                        v.options.list.hideAll();
                    }
                    $(".menu").children().removeAttr("selected");
                    $(".menuGroups").attr("selected", true);
                    v.$el.attr("selected", true);
                    v.$el.removeClass("loading");
                    //$('body').removeClass('loading');
                    $('#splash').hide();
                };
                var gotoMenuItem = function(menuItem) {
                    router.setTitle(menuItem.get("title"));
                    var v = menuItem.getView();
                    v.$el.addClass("loading");
                    v.options.list.selectedMenuItem = menuItem;
                    v.options.list.hideAll();
                    v.$el.attr("selected", true);
                    $(".menu").children().removeAttr("selected");
                    $(".menuItems").attr("selected", true);
                    v.$el.removeClass("loading");
                    //$('body').removeClass('loading');
                    $('#splash').hide();
                };
                console.log(path)
                setTimeout(function(){
                if (path == "") {
                    var menuGroup = self.findMenuRoot();
                    gotoMenu(menuGroup);
                } else if (path.indexOf("/") === 0) {
                    var subPath = path.substr(1);
                    if (subPath.indexOf("item/") === 0) {
                        var itemId = subPath.substr(5);
                        var menuItem = self.findMenuItemById(itemId);
                        gotoMenuItem(menuItem);
                    } else {
                        var menuGroup = self.findMenuSlug(decodeURIComponent(subPath));
                        if (!menuGroup) {
                            router.navigate("menu", true);
                            return;
                        }
                        gotoMenu(menuGroup);
                    }
                }
                },100);
            }
            router.route("menu*path", "menu", function(path) {
                if(!self.initalized) {
                    self.on('initalized', function(){
                        menuRouter(path);
                    });
                    return;
                } else {
                    menuRouter(path);
                }
            });
        }
    });
    var menu = new MenuView;
    if (define) {
        define(function() {
            return menu;
        });
    }
})();