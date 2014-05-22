(function() {
    var MenuItem = Backbone.House.Model.extend({
        initialize: function(attr, opts) {
            var colOpts = {
                menuItem: this
            };
            if(attr.hasOwnProperty("images")) {
                this.menuItemImageCollection = new MenuItemImageCollection(attr.images, colOpts);
            } else {
                this.menuItemImageCollection = new MenuItemImageCollection([], colOpts);
            }
            if(attr.hasOwnProperty("skus")) {
                this.menuItemSkuCollection = new MenuItemSkuCollection(attr.skus, colOpts);
            } else {
                this.menuItemSkuCollection = new MenuItemSkuCollection([], colOpts);
            }
            // this.menuItemReviewCollection = new MenuItemReviewCollection([], colOpts);
            this.addViewType(TableRowView, 'tableRow');
            this.addViewType(MenuItemView, 'avatar');
            this.addViewType(MenuItemView, 'full');
            this.addViewType(MenuItemPurchaseView, 'purchase');
            this.addViewType(MenuItemRowView, 'row');
            this.addViewType(MenuItemShareView, 'share');
            this.addViewType(ImageCarouselView, 'imageCarousel');
            this.addViewType(PickerView, 'picker');
            this.addViewType(FormView, 'form');
        },
        getView: function(options) {
            return this.getRowView();
        },
        slugStr: function(str) {
            return str.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase().replace(/ /gi, '-');
        },
        setSlug: function(slug) {
            this.set('slug', this.slugStr(slug));
        },
        addImage: function(doc, callback) {
            var self = this;
            var maxRank = 0;
            if(this.has("images") && this.menuItemImageCollection.length > 0) {
                maxRank = this.menuItemImageCollection.last().get("rank");
            }
            var newDoc = {
                _id: doc.id,
                filename: doc.filename,
                rank: maxRank + 1
            };
            if(doc.sizes) {
                newDoc.sizes = doc.sizes;
            }
            this.menuItemImageCollection.saveNewModel(newDoc, function(model) {
                if(callback) callback(model);
            });
        },
        // addSku: function(doc, callback) {
        //     var self = this;
        //     var maxRank = 0;
        //     if(this.has("images") && this.menuItemSkuCollection.length > 0) {
        //         maxRank = this.menuItemSkuCollection.last().get("rank");
        //     }
        //     var newDoc = {
        //         _id: doc.id,
        //         name: doc.name,
        //         rank: maxRank + 1
        //     };
        //     if(doc.sizes) {
        //         newDoc.sizes = doc.sizes;
        //     }
        //     this.menuItemSkuCollection.saveNewModel(newDoc, function(model){
        //         if(callback) callback(model);
        //     });
        // },
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
        // idAttribute: "sku",
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
        getOrFetchBySkuId: function(skuId, callback) {
            var self = this;
            var whereDoc = {'skus.id': skuId};
            // doc = _.first(this.where(whereDoc));
            this.fetch({
                data: whereDoc,
                update: true,
                remove: false,
                success: function(collection, response) {
                    if (response) {
                        // doc = _.first(self.where(whereDoc));
                        // console.log(response.length)
                        // self.each(function(doc, i){
                        //     if(doc.has("skus")) {
                        //         var skus = doc.get("skus");
                        //         for(var s in skus) {
                        //             var sku = skus[s];
                        //             var skuInt = parseInt(sku.id, 10);
                        //         }
                        //     }
                        // });
                        
                        callback(_.first(response));
                    } else {
                        callback(false);
                    }
                },
                error: function(collection, response) {
                    callback(false);
                }
            });
        },
        getMaxSku: function() {
            var max = 1;
            this.each(function(doc, i){
                if(doc.has("skus")) {
                    var skus = doc.get("skus");
                    for(var s in skus) {
                        var sku = skus[s];
                        var skuInt = parseInt(sku.id, 10);
                        if(skuInt > max) {
                            max = skuInt;
                        }
                    }
                }
            });
            return max;
        },
        getUniqueSkuId: function(callback, max) {
            var self = this;
            var doc;
            if(!max) {
                max = this.getMaxSku();
            }
            max = max + 1;
            
            this.getOrFetchBySkuId(max, function(menuItem){
                if(menuItem) {
                    self.getUniqueSkuId(callback, max);
                } else {
                    callback(max);
                }
            });
        }
    });

    var MenuItemImageCollection = Backbone.House.Collection.extend({
        model: MenuItemImage,
        collectionName: 'images',
        socket: false,
        pageSize: 0,
        sortField: 'rank',
        url: function() {
            return "/api/menuItems/" + this.options.menuItem.get("id") + "/images";
        },
        getViewMini: function(options) {
            var self = this;
            if(!options) options = {};
            if(!this.hasOwnProperty("rowMini")) {
                options.collection = this;
                this.rowMini = new MenuItemImageList(options);
                this.rowMini.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.rowMini;
        },
    });
    var MenuItemSkuCollection = Backbone.House.Collection.extend({
        model: MenuItemSku,
        collectionName: 'skus',
        socket: false,
        pageSize: 0,
        sortField: 'rank',
        url: function() {
            return "/api/menuItems/" + this.options.menuItem.get("id") + "/skus";
        },
        getSelectView: function(options) {
            var self = this;
            if(!options) options = {};
            if(!this.hasOwnProperty("selectrow")) {
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
            if(!options) options = {};
            if(!this.hasOwnProperty("rowMini")) {
                options.collection = this;
                this.rowMini = new MenuItemSkuList(options);
                this.rowMini.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.rowMini;
        },
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
                if(!self.$ul) {
                    self.$ul = $("<ul></ul>");
                } else {
                    self.$ul.html("");
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
            var $el = m.getAvatarView({
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
    var MenuItemSkuList = Backbone.View.extend({
        tag: "span",
        className: "menuItemSkus",
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
        },
        render: function() {
            var self = this;
            if(this.options.selectView) {
                this.$ul = $('<select class="form-control input-lg"></select>');
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
        events: {
            "change select": "selectChange",
            "blur select": "selectBlur",
        },
        selectChange: function() {
            this.trigger('selected', this.collection.get(this.$ul.val()));
        },
        selectBlur: function() {
            this.trigger('blurred', this.collection.get(this.$ul.val()));
        },
        appendModel: function(m) {
            this.$el.show();
            if(this.options.selectView) {
                var $el = m.getNewSelectOption({
                    list: this
                }).render().$el;
            } else {
                var $el = m.getNewView({
                    list: this
                }).render().$el;
            }
            this.$ul.append($el);
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
                if(!self.$ul) {
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
            if(this.model.has("title")) {
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
            if(this.options.list) {
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
            if(this.model.has("title")) {
                $e.append("<h2>Your review of " + this.model.get("title") + "</h2><p>Thanks for taking the time to leave a review for us!  Take a second to share your thoughts with the world.</p>");
            }
            this.$el.append(this.options.review.getNewView().render().$el);

            this.$el.append('<span class="urlShare">Copy the link: <input type="text" value="' + window.location + '" /></span>');
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
        tagName: "div",
        className: "menuItemImage col-md-4",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$e = $('<span class="itemImage"></span>');
            this.$actions = $('<ul class="actions"></ul>');
            this.$img = $('<img>');
            this.$actions = $('<ul class="actions"></ul>');
        },
        render: function() {
            this.$el.append(this.$e);
            this.$el.append(this.$img);
            this.$img.attr('src', '/api/files/' + this.model.get("filename"));
            if(account.isAdmin()) {
                // this.$actions.append('<li><button class="moveUp" title="rank ' + this.model.get("rank") + '">Move Up</button></li><li><button class="remove">Remove</button></li>');
                this.$actions.html('<li><button class="moveUp btn btn-link glyphicon glyphicon-arrow-up" title="rank ' + this.model.get("rank") + '"> </button></li><li><button class="remove btn btn-link glyphicon glyphicon-trash"></button></li>');
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
                    }, {
                        silent: true
                    });
                    var sm = swapModel.save(null, {
                        silent: false,
                        wait: true
                    }).done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                    });
                    if(higherRank != self.model.get("rank")) {
                        self.model.set({
                            rank: higherRank
                        }, {
                            silent: true
                        });
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
            $(this.el).remove();
        }
    });
    var MenuItemSkuView = Backbone.View.extend({
        tagName: "div",
        className: "menuItemSku",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$e = $('<div class="itemSku row">\
    <div class="skuId col-md-2"></div>\
    <div class="name col-xs-6"></div>\
    <div class="price col-xs-2"><a href="#" title="Change Price"></a></div>\
    <div class="actions col-xs-2"></div>\
</div>');
            
            var opts = {
                model: this.model, 
                actionOptions: {
                    collectionFriendlyName: 'sku',
                    fav: false,
                    detail: false,
                    // fav: {fieldName: 'fav'},
                    // tags: {fieldName: 'tags'},
                    // groups: {fieldName: 'groups'},
                    // share: true,
                }
            }
            opts.actionOptions.more = {
                "editName": {
                    title: "Edit Name",
                    glyphicon: 'pencil',
                    action: function(model) {
                        self.setName();
                        return false;
                    }
                },
                "moveUp": {
                    title: "Move Up",
                    glyphicon: 'arrow-up',
                    action: function(model) {
                        self.moveUp();
                        return false;
                    }
                },
                "setDuration": {
                    title: "Set Duration",
                    glyphicon: 'time',
                    action: function(model) {
                        self.setDuration();
                        return false;
                    }
                },
                "setRepeat": {
                    title: "Set Repeat",
                    glyphicon: 'repeat',
                    action: function(model) {
                        self.setRepeat();
                        return false;
                    }
                },
                "setDefault": {
                    title: "Set as Default",
                    glyphicon: 'certificate',
                    action: function(model) {
                        self.setAsDefault();
                        return false;
                    }
                },
            }
            this.actionsView = new utils.ModelActionsView(opts);
        },
        render: function() {
            this.$el.append(this.$e);
            if(this.model.get('default')) {
                this.$e.find('.skuId').html('<b>'+this.model.id+'</b>');
            } else {
                this.$e.find('.skuId').html(this.model.id);
            }
            if(this.model.has("name")) {
                this.$e.find('.name').html('<span class="text">'+this.model.get("name")+'</span><span class="moreInfo"><span class="duration"></span><span class="repeat"></span></span>');
            }
            if(this.model.has('duration')) {
                this.$e.find('.duration').html('<button class="btn btn-link glyphicon glyphicon-time"></button>');
                var duration = this.model.get('duration');
                this.$e.find('.duration button').attr('title', this.getDurationStr());
                // this.$e.find('.duration button').html(this.getDurationStr());
            }
            if(this.model.has('repeat')) {
                this.$e.find('.repeat').html('<button class="btn btn-link glyphicon glyphicon-repeat"></button>');
                var repeat = this.model.get('repeat');
                this.$e.find('.repeat button').attr('title', this.getRepeatStr());
                // this.$e.find('.duration button').html(this.getDurationStr());
            }
            if(this.model.has('repeat')) {
                
            }
            if(this.model.has("price")) {
                this.$e.find('.price a').html('$' + this.model.get("price"));
            }
            if(account.isAdmin()) {
                // this.$actions = $('<ul class="actions"></ul>');
                // this.$actions.append('<li><button class="setPrice">Set Price</button></li><li><button class="moveUp" title="rank ' + this.model.get("rank") + '">Move Up</button></li><li><button class="remove">Remove</button></li>');
                // if(this.model.has("default")) {
                //     this.$actions.append('<li><button class="removeDefault">Remove as Default</button></li>');
                // } else {
                //     this.$actions.append('<li><button class="setDefault">Set as Default</button></li>');
                // }
                this.$e.find('.actions').append(this.actionsView.render().$el);
            }
            this.$el.attr("data-id", this.model.id);
            this.setElement(this.$el);
            return this;
        },
        events: {
            // click: "select",
            "click .moreInfo .duration": "removeDuration",
            "click .moreInfo .repeat": "removeRepeat",
            "click .price a": "setPrice",
            "click .moveUp": "moveUp",
            "click .remove": "removeit",
            "touchstart input": "touchstartstopprop"
        },
        setName: function() {
            var self = this;
            var newName = prompt("Set SKU name", this.model.get("name"));
            if(newName && newName !== this.model.get("name")) {
                self.model.set({
                    name: newName
                }, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function(s, typeStr, respStr) {
                        self.render();
                        // self.model.collection.sort({
                        //     silent: true
                        // });
                        self.options.list.render();
                    });
                }
            }
            return false;
        },
        setPrice: function(e) {
            var self = this;
            var newPrice = prompt("Set SKU price", this.model.get("price"));
            if(newPrice) {
                self.model.set({
                    price: parseFloat(newPrice)
                }, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                        self.options.list.render();
                    });
                }
                e.stopPropagation();
                e.preventDefault();
            }
            return false;
        },
        getTimeLengthStrFromObj: function(obj) {
            var str = '';
            if(obj.days) {
                if(obj.days === 1) {
                    str = 'daily';
                } else {
                    str = obj.days+ ' days';
                }
            } else if(obj.weeks) {
                if(obj.weeks === 1) {
                    str = 'weekly';
                } else {
                    str = obj.weeks+ ' weeks';
                }
            } else if(obj.months) {
                if(obj.months === 1) {
                    str = 'monthly';
                } else {
                    str = obj.months+ ' months';
                }
            } else if(obj.years) {
                if(obj.years === 1) {
                    str = 'yearly';
                } else {
                    str = obj.years+ ' years';
                }
            }
            return str;
        },
        getDurationStr: function() {
            if(!this.model.get('duration')) {
                return '';
            }
            var duration = this.model.get('duration');
            return this.getTimeLengthStrFromObj(duration);
        },
        getRepeatStr: function() {
            if(!this.model.get('repeat')) {
                return '';
            }
            return this.getTimeLengthStrFromObj(this.model.get('repeat'));
        },
        setDuration: function() {
            var self = this;
            var userStr = prompt("ex. daily, monthly, 3 months", this.getDurationStr());
            if(userStr && userStr !== this.getDurationStr()) {
                userStr = userStr.trim();
                var num = 1;
                if(userStr === 'daily') {
                    userStr = 'days';
                } else if(userStr === 'weekly') {
                    userStr = 'weeks';
                } else if(userStr === 'monthly') {
                    userStr = 'months';
                } else if(userStr === 'yearly') {
                    userStr = 'years';
                } else {
                    var splitUserStr = userStr.split(' ');
                    if(splitUserStr.length > 1) {
                        num = parseInt(splitUserStr[0], 10);
                        userStr = splitUserStr[1];
                    }
                }
                var durationObj = {};
                durationObj[userStr] = num;
                self.model.set({duration: durationObj}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                });
            }
        },
        setRepeat: function() {
            var self = this;
            var userStr = prompt("ex. daily, monthly, 3 months", this.getRepeatStr());
            if(userStr && userStr !== this.getRepeatStr()) {
                userStr = userStr.trim();
                var num = 1;
                if(userStr === 'daily') {
                    userStr = 'days';
                } else if(userStr === 'weekly') {
                    userStr = 'weeks';
                } else if(userStr === 'monthly') {
                    userStr = 'months';
                } else if(userStr === 'yearly') {
                    userStr = 'years';
                } else {
                    var splitUserStr = userStr.split(' ');
                    if(splitUserStr.length > 1) {
                        num = parseInt(splitUserStr[0], 10);
                        userStr = splitUserStr[1];
                    }
                }
                var durationObj = {};
                durationObj[userStr] = num;
                self.model.set({repeat: durationObj}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                });
            }
        },
        removeDuration: function() {
            var self = this;
            if(confirm("Do you want to remove the duration?")) {
                self.model.set({duration: null}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                });
            }
        },
        removeRepeat: function() {
            var self = this;
            if(confirm("Do you want to remove the repeat?")) {
                self.model.set({repeat: null}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                });
            }
        },
        moveUp: function() {
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
                        self.options.list.render();
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
            return false;
        },
        unsetDefaultForModel: function(model) {
            var self = this;
            model.set({default: null}, {silent: true});
            model.save(null, {
                silent: false,
                wait: true
            }).done(function(s, typeStr, respStr) {
                self.render();
                self.options.list.render();
            });
        },
        setAsDefault: function() {
            var self = this;
            this.model.set({default: true}, {silent: true});
            var s = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(s) {
                s.done(function(s, typeStr, respStr) {
                    self.render();
                    self.options.list.render();
                    
                    // unset the rest in the collection
                    self.model.collection.each(function(model){
                        if(model.id !== self.model.id) {
                            self.unsetDefaultForModel(model);
                        }
                    });
                });
            } else {
                self.model.collection.each(function(model){
                    if(model.id !== self.model.id) {
                        self.unsetDefaultForModel(model);
                    }
                });
            }
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
    var MenuItemSkuSelectOptionView = Backbone.View.extend({
        tagName: "option",
        className: "menuItemSkuSelectOption",
        initialize: function() {
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        render: function() {
            this.$el.html("");
            this.$el.html(this.model.get("name"));
            if(this.model.has("price")) {
                this.$el.html(this.$el.html()); //  + " $" + this.model.get("price")
            }
            this.$el.attr("data-id", this.model.get("id"));
            this.$el.attr("value", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {},
        remove: function() {
            this.$el.remove();
        }
    });
    var MenuItemReviewView = Backbone.View.extend({
        tagName: "li",
        className: "menuItemReview",
        render: function() {
            var $e = $('<span class="itemReview"></span>');
            this.$el.html($e);
            var $user = $('<span class="user"></span>');
            if(this.model.get("user").avatar) {
                $user.append('<span class="avatar"><img src="/api/files/' + this.model.get("user").avatar + '" /></span>');
            }
            $user.append('<span class="name">' + this.model.get("user").name + "</span>");
            $user.attr("data-id", this.model.get("user").id);
            $e.append($user);
            if(this.model.has("vote")) {
                var $vote = $('<span class="vote"></span>');
                var $thumb = $('<span></span>');
                if(this.model.get("vote")) {
                    $vote.html("like");
                    $thumb.addClass('thumbUp');
                } else {
                    $vote.html("dislike");
                    $thumb.addClass('thumbDown');
                }
                $thumb.append($vote);
                $e.append($thumb);
            }
            if(this.model.has("image")) {
                $e.append('<span class="image"><img src="/api/files/' + this.model.get("image").filename + '" /></span>');
            }
            if(this.model.has("msg")) {
                $e.append('<span class="msg"><p>' + this.model.get("msg") + "</p></span>");
            }
            this.$actions = $('<ul class="actions"></ul>');
            if(account.userIsAdmin()) {
                this.$actions.append('<li><button class="remove">Delete Review</button></li>');
            }
            this.$el.append(this.$actions);
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
            if(this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            $(this.el).remove();
        }
    });

    var ImageCarouselView = Backbone.View.extend({
        tagName: "div",
        className: "carousel",
        initialize: function() {
            var self = this;
            // console.log(this.model.collection.on('add'))
            this.model.menuItemImageCollection.on("add", function(){
                self.$el.html('');
                if(self.carouselInterval) {
                    clearInterval(self.carouselInterval);
                }
                delete self.carousel;
                self.initCarousel();
                self.render();
            });
            this.model.menuItemImageCollection.on("remove", function(){
                self.$el.html('');
                if(self.carouselInterval) {
                    clearInterval(self.carouselInterval);
                }
                delete self.carousel;
                self.initCarousel();
                self.render();
            });
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            // this.$image = $('<img>');
            // this.$about = $('<a class="carousel-control left" href="#left" data-slide="prev">‹</a><a class="carousel-control right" href="#right" data-slide="next">›</a>');
        },
        initCarousel: function() {
            var self = this;
            if(self.carousel) {
                return;
            }
            if(self.model.menuItemImageCollection.length > 0) {
                var pages = self.model.menuItemImageCollection.length;
                self.carousel = new SwipeView(this.$el[0], {
                    numberOfPages: pages,
                    hastyPageFlip: true
                });
                var page;
                // Load initial data
                for(i = 0; i < 3; i++) {
                    page = i == 0 ? pages - 1 : i - 1;
                    el = document.createElement('img');
                    // 	el.className = 'loading';
                    var im = self.model.menuItemImageCollection.at(page);
                    if(im) {
                        el.src = '/api/files/' + im.get('filename');
                    }
                    // 	el.width = slides[page].width;
                    // 	el.height = slides[page].height;
                    // 	el.onload = function () { this.className = ''; }
                    self.carousel.masterPages[i].appendChild(el);

                    // 	el = document.createElement('span');
                    // 	el.innerHTML = slides[page].desc;
                    // 	gallery.masterPages[i].appendChild(el)
                }
                self.carousel.onFlip(function() {
                    var el;
                    var upcoming;
                    var i;

                    for(i = 0; i < 3; i++) {
                        upcoming = self.carousel.masterPages[i].dataset.upcomingPageIndex;
                        if(upcoming != self.carousel.masterPages[i].dataset.pageIndex) {
                            el = self.carousel.masterPages[i].querySelector('img');
                            el.className = 'loading';
                            el.src = '/api/files/' + self.model.menuItemImageCollection.at(upcoming).get('filename');
                            // el.width = self.model.attributes.images[upcoming].width;
                            // el.height = self.model.attributes.images[upcoming].height;

                            // el = gallery.masterPages[i].querySelector('span');
                            // el.innerHTML = self.model.attributes.images[upcoming].desc;
                        }
                    }

                    // 	document.querySelector('#nav .selected').className = '';
                    // 	dots[gallery.pageIndex+1].className = 'selected';
                });
                if(self.model.menuItemImageCollection.length > 1) {
                    if(self.carouselInterval) {
                        clearInterval(self.carouselInterval);
                    }
                    self.carouselInterval = setInterval(function() {
                        self.carousel.next();
                    }, 5000);
                }
            }
        },
        render: function() {
            var self = this;
            this.setElement(this.$el);

            if(!this.carousel) {
                //     this.initCarousel();
            } else {
                // this.carousel.refreshSize();
            }

            var images = this.model.get('images');
            for(var i in images) {
                var image = images[i];
                var filename = image.filename;
                // var $img = $('<img src="/api/files/' + filename + '">');
                // var $caption = $('<div class="caption"></div>');
                // $(self.carousel.masterPages[i]).append($img);
                // $(self.carousel.masterPages[i]).append($caption);
                // $(self.carousel.masterPages[i]).find('img').attr('src', '/api/files/' + filename);
            }
            // $(self.carousel.masterPages[0]).append('<img src="cookies.jpg" /><div class="caption">Stop by for a sweet treat!</div>');
            return this;
        },
        events: {
            "click .left": "prev",
            "click .right": "next"
        },
        prev: function() {
            this.carousel.prev();
        },
        next: function() {
            this.carousel.next();
        }
    })

    var MenuItemPurchaseView = Backbone.View.extend({
        tagName: "div",
        className: "purchaseItem",
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$currency = $('<div class="currency col-md-1 col-xs-3 text-right"><button class="btn btn-lg btn-link disabled">$</button></div>');
            this.$cost = $('<div class="cost col-md-2 col-xs-9"><button class="btn btn-lg btn-link disabled"></button></div>');
            this.$priceInput = $('<input type="number" min="1" max="10000" step="1" name="price" class="form-control input-lg" value="1" />');
            // this.$priceCol = $('<div class="form-group"></div>');
            // this.$priceCol.append(this.$price);
            this.$buy = $('<button class="buy btn btn-lg btn-warning btn-block">Purchase</button>');
            this.$buyCol = $('<div class="form-group col-md-3 col-xs-12"></div>');
            this.$buyCol.append(this.$buy);
            
            this.skuSelector = this.model.menuItemSkuCollection.getSelectView({className: 'menuItemSkus col-md-6'});
            this.skuSelector.on('selected', function(model){
                console.log(model)
                self.selectedSku = model;
                self.renderCost();
            });
            this.skuSelector.on('blurred', function(model){
                // if(self.model.get('donation')) {
                //     self.$priceInput.focus();
                // } else {
                //     self.$buy.focus();
                // }
            });
        },
        renderCost: function() {
            this.$cost.attr('data-price', this.selectedSku.get('price'));
            this.$cost.find('button').html(this.selectedSku.get('price'));
        },
        renderDonationPriceSlider: function() {
            var p = this.$cost.attr('data-price');
            this.$cost.html('').append(this.$priceInput);
            // this.$priceInput.val(p);
        },
        render: function() {
            var self = this;
            delete this.selectedSku;
            if(this.model.menuItemSkuCollection.length === 1) {
                var skuModel = this.model.menuItemSkuCollection.first();
                this.$cost.find('button').html(skuModel.get('price'));
                this.selectedSku = skuModel;
            } else {
                this.model.menuItemSkuCollection.each(function(skuModel){
                    if(skuModel.get('default')) {
                        self.selectedSku = skuModel;
                        self.renderCost();
                    }
                });
                this.$el.append(this.skuSelector.render().$el);
            }
            if(this.model.get('donation')) {
                this.renderDonationPriceSlider();
            } else {
            }
            this.$el.append(this.$currency);
            this.$el.append(this.$cost);
            this.$el.append(this.$buyCol);
            this.setElement(this.$el);
            return this;
        },
        getPriceInputVal: function() {
            if(this.model.get('donation')) {
                if(this.$priceInput[0].valueAsNumber) {
                    return this.$priceInput[0].valueAsNumber;
                } else {
                    return parseFloat(this.$priceInput.val());
                }
            } else {
                return this.selectedSku.get('price');
            }
        },
        events: {
            "click .buy": "buy",
            'change input[name="price"]': "changePrice"
        },
        changePrice: function() {
            console.log(this.getPriceInputVal())
            this.selectedSku.set('price', this.getPriceInputVal(), {silent: true}); // name your price 
        },
        buy: function(){
            if(!this.selectedSku) {
                return false;
            } else {
                this.changePrice(); // make sure its updated
                console.log(this.selectedSku.attributes)
                this.trigger('buySku', this.selectedSku);
            }
        }
    });
    window.nl2br = function(str) {
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + "<br />");
    };
    window.br2nl = function(str) {
        return str.replace(/<br\s*\/?>/mg,"\n");
    };
    var MenuItemView = Backbone.View.extend({
        tagName: "div",
        className: "menuItem fullView container",
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            
            if(!self.options.hasOwnProperty('skipCart')) {
                self.options.skipCart = true;
            }
            
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.$image = $('<img>');
            this.$desc = $('<p class="desc"></p>');
            this.$e = $('<div class="adminTools"><div class="btn-group btn-group-justified actions">\
            <div class="btn-group">\
                <button type="button" class="btn btn-primary btn-lg editItem">Edit Item</button>\
            </div>\
    </div>\
</div>');
            this.$carousel = $('<div class="carousel"></div>');
            this.imageCarouselView = this.model.getImageCarouselView({
                el: this.$carousel
            });
            
            this.purchaseView = this.model.getPurchaseView();
            this.purchaseView.on('buySku', function(skuModel) {
                window.ordersCollection.addMenuItemSku(self.model, skuModel, function(orderItemSkuModel) {
                    if(self.options.skipCart) {
                        // app.nav.router.navigate('order/'+orderItemSkuModel.collection.options.order.getNavigatePath('place'), {trigger: true});
                        account.view.nav.router.navigate('order/'+orderItemSkuModel.collection.options.order.getNavigatePath('place'), {trigger: true});
                    } else {
                        
                    }
                });
            });
        },
        render: function() {
            // this.$el.append(this.model.menuItemImageCollection.getView().render().$el);
            // this.$el.append(this.imageCarouselView.render().$el);
            this.$el.append(this.$carousel);
            this.imageCarouselView.render();
            if(this.model.menuItemImageCollection.length > 0) {
                this.$carousel.show();
            } else {
                this.$carousel.hide();
            }
            // this.imageCarouselView.initCarousel();
            this.$el.append(this.$desc);
            // if (this.model.has("title")) {
            //     $e.append("<h2>" + this.model.get("title") + "</h2>");
            // }
            if(this.model.has("desc")) {
                this.$desc.html(window.nl2br(this.model.get("desc")));
            }
            // if (this.model.has("el")) {
            //     $e.append(this.model.get("el"));
            // }
            this.$el.append(this.purchaseView.render().$el);
            // $e.append('<div class="orderbtn"><button class="order">Add to Order</button></div>');
            // $e.append(this.model.menuItemReviewCollection.getView().render().$el);
            // $e.append('<div class="btn"><button class="postReview blue">Post a Review</button></div>');
            // if (account.userIsAdmin()) {
            //     this.$e.append(this.model.menuItemSkuCollection.getView().render().$el);
            // }
            if(account.isAdmin()) {
                this.$el.append(this.$e);
            }
            // this.model.menuItemReviewCollection.load();
            this.setElement(this.$el);
            return this;
        },
        events: {
            click: "select",
            "click .editItem": "editItem",
            // "click button.order": "order",
            "click button.postReview": "postReview",
            "touchstart input": "touchstartstopprop"
        },
        editItem: function() {
            this.model.collection.trigger('editModel', this.model);
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        order: function() {
            console.log(menu);
            console.log(this.options.list.options.menu);
            // var sku = this.$el.find("option:selected").val();
            // var itemSku = this.model.menuItemSkuCollection.get(sku);
            // this.options.list.options.menu.orderPending.addMenuItemSkuToOrder(this.model, itemSku);
            // TODO variations
            window.ordersPendingCollection.addMenuItemSku(this.model, itemSku);
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
                var shareView = self.model.getShareView({
                    review: menuItemReview
                });
                var $mlightbox = utils.appendLightBox(shareView.render().$el);
            });
            return false;
        },
        select: function() {
            if(this.model.has("navigate")) {
                nav.router.navigate(this.model.get("navigate"), true);
            } else {
                if(this.options.list) {
                    this.options.list.trigger("selected", this);
                }
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
            this.menuItemForm = new FormView({
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
            if($et.parents('.actions').length) {} else {
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
            self.houseFormView.on('keyUp', function(inputs) {
                var query = inputs.name;
                self.menuItemsList.searchView.query(query);
            });
            self.houseFormView.on('saved', function(doc) {
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
        events: {},
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
    var FormView = Backbone.View.extend({
        tag: "div",
        className: "menu-item-form",
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
                    placeholder: "menu item name",
                    className: "form-control"
                },
                "desc": {
                    validateType: 'string',
                    tagName: 'textarea',
                    placeholder: "details",
                    className: "form-control"
                },
            }
            var formDonationOpts = {
                collection: this.model.collection,
                model: this.model,
                submit: 'Save',
                cancel: 'Cancel',
                delete: false
            };
            
            var rewardListSelectView = window.rewardsCollection.getNewSelectList({titleField: 'name'});
            formDonationOpts.fields = {
                "reward": {
                    label: "Grant Reward",
                    fieldView: rewardListSelectView, //TodoListSelectListView,
                    className: "form-control",
                },
                "donation": {
                    label: "Donation of any amount",
                    validateType: 'boolean',
                    className: ""
                }
            }
            
            self.houseFormView = formOpts.collection.getNewFormView(formOpts);
            self.houseFormView.on('saved', function(doc) {
                self.trigger('saved', doc);
            });
            self.houseFormView.on('cancelled', function(doc) {
                self.trigger('saved', doc);
            });
            self.houseFormView.on('deleted', function(doc) {
                self.trigger('saved', doc);
            });

            self.donationFormView = formOpts.collection.getNewFormView(formDonationOpts);
            self.donationFormView.on('saved', function(doc) {
                self.trigger('saved', doc);
            });
            self.donationFormView.on('cancelled', function(doc) {
                self.trigger('saved', doc);
            });

            self.$navTabs = $('<ul class="nav nav-tabs">\
    <li class="active"><a href="#' + self.cid + '-basic" data-toggle="tab">Basic Info</a></li>\
    <li><a href="#' + self.cid + '-images" data-toggle="tab">Image</a></li>\
    <li><a href="#' + self.cid + '-skus" data-toggle="tab">Price</a></li>\
</ul>');
            self.$tabContent = $('<div class="tab-content">\
    <div class="tab-pane active basicInfo" id="' + self.cid + '-basic"></div>\
    <div class="tab-pane images" id="' + self.cid + '-images"><div class="images-list"></div><button class="upload btn btn-primary btn-block">Upload Image</button></div>\
    <div class="tab-pane skus row" id="' + self.cid + '-skus"><div class="skus-form col-md-12">\
        <label>Product Skus</label><div class="skus-form-list"></div><div class="new-sku-form"></div>\
    </div><div class="donation-form col-md-6"></div><div class="membership-form col-md-6"></div></div>\
</div>');
            self.$membership = $('<div class="membership"><label>Grant Membership</label><div class="membershipGroups"></div><button class="addMembership btn btn-primary">Add Group</button></div>');

            this.itemImagesView = this.model.menuItemImageCollection.getView({
                // layout: 'row',
                selection: false,
                mason: false,
                loadOnRenderPage: false,
            });
            
            this.itemSkusView = this.model.menuItemSkuCollection.getView({
                // layout: 'row',
                selection: false,
                mason: false,
                loadOnRenderPage: false,
            });

            self.uploadImageFrame = new window.FilesBackbone.UploadFrame({
                collection: window.filesCollection,
                type: 'image',
                metadata: {
                    groups: ['public']
                }
            });
            self.uploadImageFrame.on('uploaded', function(data) {
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(data.image) {
                    self.model.addImage(data.image);
                }
            });
        },
        renderSkuForm: function() {
            var self = this;
            var skuModel = this.model.menuItemSkuCollection.getNewModel();
            
            window.menuItemsCollection.getUniqueSkuId(function(skuId) {
                skuModel.set('_id', skuId, {silent: true});
                skuModel.set('rank', self.model.menuItemSkuCollection.length + 1, {silent: true});
                var newSkuFormOpts = {
                    collection: self.model.menuItemSkuCollection,
                    model: skuModel,
                    submit: 'Add Sku Price',
                    cancel: false,
                    delete: false,
                    formClassName: 'form-inline'
                };
                newSkuFormOpts.fields = {
                    "_id": {
                        // validateType: 'string',
                        autocomplete: "off",
                        placeholder: "sku ex. 123",
                        className: "form-control",
                        required: true
                        // validateFunc: function(dirtyVal) {
                        //     console.log(dirtyVal);
                            
                        //     if(!dirtyVal) {
                        //         // dirtyVal = window.menuItemsCollection.getUniqueSkuId();
                                
                        //     }
                        // }
                    },
                    "name": {
                        validateType: 'string',
                        autocomplete: "off",
                        placeholder: 'name',
                        className: "form-control"
                    },
                    "price": {
                        validateType: 'float',
                        // tagName: 'input', // tagType number
                        placeholder: '2.99 (in dollars)',
                        className: "form-control",
                        required: true
                    },
                }
                
                if(self.skuFormView) {
                    self.skuFormView.remove();
                }
                self.skuFormView = newSkuFormOpts.collection.getNewFormView(newSkuFormOpts);
                self.skuFormView.on('saved', function(doc) {
                    // self.trigger('saved', doc);
                    self.renderSkus();
                    self.renderSkuForm(); // reset form
                });
                
                self.$tabContent.find('.new-sku-form').append(self.skuFormView.render().$el);
                self.skuFormView.focus('name');
            });
        },
        render: function() {
            var self = this;
            self.$tabContent.find('.basicInfo').append(self.houseFormView.render().$el);
            self.$tabContent.find('.donation-form').append(self.donationFormView.render().$el);
            self.$tabContent.find('.membership-form').append(self.$membership);
            self.$tabContent.find('.images-list').append(self.itemImagesView.render().$el);
            self.$tabContent.find('.images').append(self.uploadImageFrame.render().$el.hide());
            
            self.renderSkus();
            self.renderSkuForm();
            self.renderMembership();
            
            this.$el.append(self.$navTabs);
            this.$el.append(self.$tabContent);

            this.setElement(this.$el);
            return this;
        },
        renderSkus: function() {
            var self = this;
            self.$tabContent.find('.skus-form-list').append(self.itemSkusView.render().$el);
        },
        renderMembership: function() {
            var self = this;
            self.$membership.find('.membershipGroups').html('');
            if(this.model.has('membership')) {
                var membership = this.model.get('membership');
                if(membership.length > 0) {
                    for(i in membership) {
                        var memberGroup = membership[i];
                        var $memberGroup = $('<div class="group" data-name="'+memberGroup+'"><span class="name">'+memberGroup+'</span> <button class="remove btn btn-link glyphicon glyphicon-trash"></button></div>');
                        self.$membership.find('.membershipGroups').append($memberGroup);
                    }
                }
            }
        },
        events: {
            "click .upload": "uploadImage",
            "click .addMembership": "addMembership",
            "click .remove": "removeMembership",
        },
        removeMembership: function(e) {
            var self = this;
            var $et = $(e.currentTarget);
            var groupName = $et.parent('.group').attr('data-name');
            this.model.pull({"membership": groupName}, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.render();
            });
        },
        addMembership: function() {
            var self = this;
            var groupName = prompt("Enter group name");
            if(!this.model.get("membership")) {
                this.model.set({'membership': [groupName]}, {silent: true});
            } else {
                this.model.push({"membership": groupName}, {silent: true});
            }
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.renderMembership();
            });
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
                Collection: MenuItemsCollection,
                Model: MenuItem,
                Form: FormView,
                Picker: PickerView
            };
        });
    }
})();