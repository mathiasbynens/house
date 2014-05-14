(function() {
    var MenuItem = Backbone.House.Model.extend({
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
            // this.menuItemReviewCollection = new MenuItemReviewCollection([], colOpts);
            this.addViewType(TableRowView, 'tableRow');
            this.addViewType(MenuItemView, 'avatar');
            this.addViewType(MenuItemRowView, 'row');
            this.addViewType(MenuItemShareView, 'share');
            this.addViewType(PickerView, 'picker');
        },
        getView: function(options) {
            return this.getRowView();
        },
        slugStr: function(str) {
            return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
        },
        setSlug: function(slug) {
            this.set('slug', this.slugStr(slug));
        },
    });
    var MenuItemImage = Backbone.House.Model.extend({
        initialize: function() {
            this.addViewType(MenuItemImageView, 'avatar');
        },
        getView: function(options) {
            return this.getAvatarView(options);
        }
    });
    var MenuItemSku = Backbone.House.Model.extend({
        idAttribute: "sku",
        initialize: function() {
            this.addViewType(MenuItemSkuView, 'avatar');
        },
        getView: function(options) {
            return this.getAvatarView(options);
        },
        getNewSelectOption: function(options) {
            if(!options) options = {};
            options.model = this;
            return new MenuItemSkuSelectOptionView(options);
        }
    });
    var MenuItemReview = Backbone.House.Model.extend({
        initialize: function() {
            this.addViewType(MenuItemReviewView, 'avatar');
        },
        getView: function(options) {
            return this.getAvatarView(options);
        },
    });
    var MenuItemsCollection = Backbone.House.Collection.extend({
        model: MenuItem,
        collectionName: 'menuItems',
        collectionFriendlyName: 'items',
        sortField: 'rank',
        pageSize: 0,
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
    });
    var MenuItemImageCollection = Backbone.House.Collection.extend({
        model: MenuItemImage,
        collectionName: 'images',
        url: function() {
            return "/api/menuItems/" + this.options.menuItem.get("id") + "/images";
        },
        // getView: function(options) {
        //     var self = this;
        //     if (!options) options = {};
        //     if (!this.hasOwnProperty("row")) {
        //         options.collection = this;
        //         this.row = new MenuItemImageList(options);
        //         this.row.on("selected", function(m) {
        //             self.trigger("selected", m);
        //         });
        //     }
        //     return this.row;
        // },
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
        // comparator: function(a) {
        //     return a.get("rank");
        // }
    });
    var MenuItemSkuCollection = Backbone.House.Collection.extend({
        model: MenuItemSku,
        collectionName: 'skus',
        url: function() {
            return "/api/menuItems/" + this.options.menuItem.get("id") + "/skus";
        },
        // getView: function(options) {
        //     var self = this;
        //     if (!options) options = {};
        //     if (!this.hasOwnProperty("row")) {
        //         options.collection = this;
        //         this.row = new MenuItemSkuList(options);
        //         this.row.on("selected", function(m) {
        //             self.trigger("selected", m);
        //         });
        //     }
        //     return this.row;
        // },
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
        comparator: function(a) {
            return a.get("rank");
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
            // $e.append(this.model.menuItemReviewCollection.getView().render().$el);
            $e.append('<div class="btn"><button class="postReview blue">Post a Review</button></div>');
            if (menu.userIsAdmin()) {
                $e.append("<h4>Edit Product</h4>");
                $e.append(this.model.menuItemSkuCollection.getView().render().$el);
            }
            // this.model.menuItemReviewCollection.load();
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
            // var form = this.model.menuItemReviewCollection.getForm();
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
    
    var TableRowView = Backbone.View.extend({
        tagName: "tr",
        className: "itemRow",
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            var opts = {
                model: this.model, 
                actionOptions: {
                    collectionFriendlyName: 'item',
                    fav: false,
                    // fav: {fieldName: 'fav'},
                    // tags: {fieldName: 'tags'},
                    // groups: {fieldName: 'groups'},
                    detail: true,
                    // share: true,
                }
            }
            this.actionsView = new utils.ModelActionsView(opts);
            // this.actionsView.on('goToTagName', function(tagName){
            //     app.collection.view.tagsView.tagSelectView.selectTagByName(tagName);
            // });
            
            this.$tdName = $('<td class="name"></td>');
            this.$tdGroupCount = $('<td class="groupCount"></td>');
            this.$tdItemCount = $('<td class="itemCount"></td>');
            // this.$tdAt = $('<td class="at"></td>');
            this.$tdActions = $('<td class="actions"></td>');
        },
        render: function() {
            this.$el.append(this.$tdName);
            this.$el.append(this.$tdGroupCount);
            this.$el.append(this.$tdItemCount);
            // this.$el.append(this.$tdAt);
            this.$el.append(this.$tdActions);
            
            if(this.model.has('name')) {
                this.$tdName.html(this.model.get('name'));
            }
            
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
    
    var PickerView = Backbone.View.extend({
        tagName: "div",
        className: "menu-item-picker",
        initialize: function() {
            var self = this;
            this.initNewFormView();
        },
        initNewFormView: function() {
            var self = this;
            this.pickerMenuItemsCollection = window.menuItemsCollection.clone();
            if(this.menuItemsList) {
                this.menuItemsList.remove();
            }
            this.menuItemsList = this.pickerMenuItemsCollection.getNewListView({
                layout: 'tableRow',
                search: {
                    'fieldName': 'name'
                },
            });
            this.menuItemsList.on('selected', function(view) {
                self.trigger('picked', view.model);
            });
            var newModel = this.pickerMenuItemsCollection.getNewModel({});
            // console.log(newModel)
            var formOpts = {
                collection: this.pickerMenuItemsCollection,
                model: newModel,
                submit: false,
                cancel: false,
                delete: false
            };
            formOpts.fields = {
                "name": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "Item title",
                    className: "form-control"
                },
            }
            if(self.houseFormView) {
                self.houseFormView.remove();
            }
            self.houseFormView = formOpts.collection.getNewFormView(formOpts);
            self.houseFormView.on('keyUp', function(inputs){
                var query = inputs.name;
                self.menuItemsList.searchView.query(query);
            });
            self.houseFormView.on('saved', function(doc){
                self.initNewFormView();
                self.searchForItemName('');
                self.trigger('picked', doc);
            });
        },
        searchForItemName: function(q) {
            var self = this;
            this.menuItemsList.search(q);
        },
        render: function() {
            var self = this;
            
            this.$el.append(self.houseFormView.render().$el);
            this.$el.append(this.menuItemsList.render().$el);
            
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
    if (define) {
        define(function() {
            return {
                Collection: MenuItemsCollection,
                Model: MenuItem,
                Form: MenuItemForm,
                Picker: PickerView
            };
        });
    }
})();