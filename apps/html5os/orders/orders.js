(function() {
    var Model = Backbone.House.Model.extend({
        initialize: function(attr, opts) {
            var self = this;
            var colOpts = {
                order: this
            };
            if (attr.hasOwnProperty("itemSkus")) {
                this.orderItemSkuCollection = new OrderItemSkuCollection(attr.itemSkus, colOpts);
            } else {
                this.orderItemSkuCollection = new OrderItemSkuCollection([], colOpts);
            }
            this.orderItemSkuCollection.on('add', function(){
                // alert('added itemSku')
                self.trigger('change');
            });
            this.orderItemSkuCollection.on('remove', function(){
                self.trigger('change');
            });
            this.addViewType(OrderMiniView, 'mini');
            this.addViewType(OrderView, 'order');
            this.addViewType(BillView, 'bill');
            this.addViewType(PaymentMethodSelect, 'paymentMethodSelect');
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        getView: function(options) {
            return this.getOrderView();
        },
        getNewView: function(options) {
            return this.getNewOrderView();
        }
    });
    var OrderItemSku = Backbone.House.Model.extend({
        // idAttribute: "item_id",
        initialize: function(attr, opts) {
            var self = this;
            console.log(attr);
            // if (attr.hasOwnProperty("item_id") && attr.hasOwnProperty("sku")) {
            //     this.id = attr.item_id + "/" + attr.sku;
            // }
            this.addViewType(OrderItemSkuBillView, 'bill');
            this.addViewType(OrderItemSkuView, 'avatar');
            
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        // url: function() {
        //     var base = getValue(this, "urlRoot") || getValue(this.collection, "url") || urlError();
        //     if (this.isNew()) return base;
        //     return base + (base.charAt(base.length - 1) == "/" ? "" : "/") + this.id;
        // },
        getSubTotal: function() {
            var price = this.get('sku.price');
            var qty = this.get('qty') || 1;
            return price * qty;
        },
        getView: function(options) {
            return this.getAvatarView(options);
        },
        getNewView: function(options) {
            return this.getNewAvatarView(options);
        }
    });
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'orders',
        // collectionFriendlyName: 'groups',
        sortField: 'at-',
        pageSize: 0,
        // filterPending: function(pendingExists) {
        //     if (pendingExists) {
        //         this.filter = {
        //             status: pendingExists
        //         };
        //     } else {
        //         this.filter = {
        //             status: {
        //                 $exists: false
        //             }
        //         };
        //     }
        // },
        getPendingListView: function() {
            if(!this.pendingListView) {
                var filterFunc = function(model, filterObj) {
                    var filterId = filterObj.filter;
                    if(filterId === 'none') {
                        return true;
                    } else if(filterId === 'pending') {
                        if(!model.has('status') || model.get('status') === 0) {
                            return true;
                        } else {
                            return false;
                        }
                    } else {
                        return true;
                    }
                }
                this.pendingListView = this.getView({
                    selection: false, mason: false,
                    loadOnRenderPage: false,
                    renderOnLoad: false,
                    filters: {
                        'pending': {
                            txt: 'Pending',
                            glyphicon: 'unchecked',
                            filter: filterFunc,
                            load: {
                                "status": 0
                            }
                        },
                    }
                });
                this.pendingListView.filterView.filterBy('pending');
            }
            return this.pendingListView;
        },
        makePendingOrder: function(callback) {
            this.saveNewModel({status: 0}, callback);
        },
        addMenuItemSku: function(menuItem, menuItemSku, callback) {
            var self = this;
            // alert('addMenuItemSku')
            
            if (this.length === 0) {
                this.makePendingOrder(function() {
                    self.addMenuItemSku(menuItem, menuItemSku, callback);
                });
                return;
            }
            this.pendingOrder = this.first();
            console.log(this.pendingOrder);
            // console.log(arguments);
            if (this.pendingOrder) {
                this.pendingOrder.orderItemSkuCollection.addItem(menuItem, menuItemSku, 1, function(model){
                    if(callback) {
                        callback(model);
                    }
                });
            } else {
                console.log("err");
                // console.log(this.orderCollection);
            }
        }
    });
    var OrderItemSkuCollection = Backbone.House.Collection.extend({
        model: OrderItemSku,
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        url: function() {
            return "/api/orders/" + this.options.order.get("id") + "/itemSkus";
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
        addItem: function(menuItem, itemSku, qty, callback) {
            if(typeof qty === 'function') {
                callback = qty;
                qty = 1;
            }
            var self = this;
            if(!qty) {
                qty = 1;
            }
            var newO = {
                qty: qty
            };
            newO.item = {
                id: menuItem.id
            }
            if(menuItem.has('name')) {
                newO.item.name = menuItem.get('name');
            }
            if (itemSku) {
                newO.sku = {
                    id: itemSku.id
                }
                
                if(itemSku.has("name")) {
                    newO.sku.name = itemSku.get("name");
                }
                if (itemSku.has("price")) {
                    newO.sku.price = itemSku.get("price");
                }
                if(itemSku.has("duration")) {
                    newO.sku.duration = itemSku.get("duration");
                }
                if (itemSku.has("repeat")) {
                    newO.sku.repeat = itemSku.get("repeat");
                }
            }
            console.log(newO)
            this.saveNewModel(newO, function(model){
                console.log('saved new model')
                console.log(arguments);
                if(callback) {
                    callback(model);
                }
            });
        },
        getSubTotal: function() {
            var total = 0;
            this.each(function(model){
                // total = total + model.get('sku.price');
                total = total + model.getSubTotal();
            });
            return total.toFixed(2);
        },
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
    
    var OrderMiniView = Backbone.View.extend({
        tag: "div",
        className: "order-mini",
        initialize: function() {
            var self = this;
            this.model.bind("change", function(){
                self.render();
            }, this);
            this.model.bind("destroy", this.remove, this);
            this.$container = $('<div class="container"></div>');
            this.$orderItems = $('<div class="orderItems col-xs-8"><button class="btn btn-link disabled">Your Cart: <span class="itemCount"></span> items</button></div>');
            this.$placeOrder = $('<div class="placeOrder col-xs-4"><button class="btn btn-primary btn-block"><span class="glyphicon glyphicon-shopping-cart"></span> Place Order</button></div>');
            this.$container.append(this.$orderItems);
            this.$container.append(this.$placeOrder);
        },
        render: function() {
            var self = this;
            
            console.log(this.model.attributes)
            if(this.model.orderItemSkuCollection && this.model.orderItemSkuCollection.length > 0) {
                this.$orderItems.find('.itemCount').html(this.model.orderItemSkuCollection.length);
            }
            // if(this.model.has('itemSkus')) {
            //     var itemSkus = this.model.get('itemSkus');
            //     this.$orderItems.find('.itemCount').html(itemSkus.length);
            // }
            
            this.$el.append(this.$container);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click": "select"
        },
        select: function() {
            app.nav.router.navigate('order/'+this.model.getNavigatePath('place'), {trigger: true});
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
        initialize: function() {
            var self = this;
            // this.$totals = $('<div class="totals"></div>');
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
        },
        render: function() {
            var self = this;
            this.$ul = $("<ul></ul>");
            this.$actions = $('<ul class="actions"></ul>');
            this.$el.html("");
            this.collection.each(function(m, i, c) {
                
                self.appendModel(m);
            });
            this.$el.append(this.$ul);
            // this.$el.append(this.$actions);
            // this.renderTotals();
            // this.$el.append(this.$totals);
            this.setElement(this.$el);
            return this;
        },
        events: {
            // "click .itemSkuCount": "toggleItems"
        },
        appendModel: function(m) {
            var self = this;
            this.$el.show();
            var $el = m.getBillView({
                list: this
            }).render().$el;
            this.$ul.append($el);
        },
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
        className: "orderItemSku row",
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$title = $('<div class="title col-md-6"></div>');
            this.$price = $('<div class="price col-md-2"><button class="btn btn-link disabled"><span class="currency">$</span> <span class="cost"></span></button></div>');
            this.$qty = $('<div class="qty col-md-2"><button title="Click to edit quantity" class="btn btn-link"><span>x</span> <span class="quantitiy"></span></button></div>');
            this.$actions = $('<div class="actions col-md-2"></div>');
            this.$actions.append('<button class="remove btn btn-link"><span class="remove glyphicon glyphicon-trash"> </span></button>');
        },
        render: function() {
            // if (this.model.has("item_title")) {
            //     this.$el.append('<span class="itemTitle">' + this.model.get("item_title") + "</span>");
            // }
            // if (this.model.has("sku_name")) {
            //     this.$el.append(' <span class="skuName">' + this.model.get("sku_name") + "</span>");
            // }
            // if (this.model.has("price")) {
            //     this.$el.append('<span class="price">$ ' + this.model.get("price") + "</span>");
            // }
            if (this.model.has("item.name")) {
                if (this.model.has("sku.name")) {
                    this.$title.html(this.model.get('item.name') + ' ' + this.model.get('sku.name'));
                } else {
                    this.$title.html(this.model.get('item.name'));
                }
            } else if (this.model.has("sku.name")) {
                this.$title.html(this.model.get('sku.name'));
            }
            if (this.model.has("qty")) {
                this.$qty.find('.quantitiy').html(this.model.get('qty'));
            }
            
            this.$price.find('.cost').html(this.model.get('sku.price'));
            
            this.$el.append(this.$title);
            this.$el.append(this.$price);
            this.$el.append(this.$qty);
            this.$el.append(this.$actions);
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
            click: "select",
            "click .remove": "destroy",
            "click .qty button": "editQty",
            "touchstart input": "touchstartstopprop"
        },
        editQty: function() {
            var self = this;
            var qty = prompt("Enter quantity amount ex. 1, 5, 10.", this.model.get('qty'));
            if(qty === 0 || qty === '0') {
                this.model.destroy();
            } else if(qty && qty !== this.model.get('qty')) {
                this.model.set({
                    qty: qty
                }, {
                    silent: true
                });
                var saveModel = this.model.save(null, {silent: false, wait: true});
                if (saveModel) {
                    saveModel.done(function() {
                        self.render();
                        console.log(self.options.list.collection)
                        self.options.list.collection.trigger('change');
                    });
                }
            }
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
            this.$el.remove();
        }
    });
    var OrderItemSkuView = Backbone.View.extend({
        tagName: "li",
        className: "orderItemSku row",
        initialize: function() {
            var self = this;
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
            this.$title = $('<div class="title col-md-5"></div>');
            this.$price = $('<div class="price col-md-2"><span class="currency">$</span> <span class="cost"></span></div>');
            this.$qty = $('<div class="qty col-md-2"></div>');
            this.$actions = $('<div class="actions col-md-1"></div>');
            this.$actions.append('<button class="remove glyphicon glyphicon-trash"> </button>');
        },
        render: function() {
            // if (this.model.has("item_title")) {
            //     this.$el.append('<span class="itemTitle">' + this.model.get("item_title") + "</span>");
            // }
            // if (this.model.has("sku_name")) {
            //     this.$el.append(' <span class="skuName">' + this.model.get("sku_name") + "</span>");
            // }
            // if (this.model.has("price")) {
            //     this.$el.append('<span class="price">$ ' + this.model.get("price") + "</span>");
            // }
            if (this.model.has("item.name")) {
                if (this.model.has("sku.name")) {
                    this.$title.html(this.model.get('item.name') + ' ' + this.model.get('sku.name'));
                } else {
                    this.$title.html(this.model.get('item.name'));
                }
            } else if (this.model.has("sku.name")) {
                this.$title.html(this.model.get('sku.name'));
            }
            if (this.model.has("qty")) {
                this.$qty.html(this.model.get('qty'));
            }
            
            this.$price.find('.cost').html(this.model.get('sku.price'));
            
            this.$el.append(this.$title);
            this.$el.append(this.$price);
            this.$el.append(this.$qty);
            this.$el.append(this.$actions);
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
            click: "select",
            "click .remove": "destroy",
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
            this.$el.remove();
        }
    });
    
    var PaymentMethodSelect = Backbone.View.extend({
        tagName: "div",
        className: "placeOrder",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.defaultPaymentMethods = {
                "cash": true,
                "credit": true,
                "points": true,
                "bitcoin": false
            }
            this.paymentMethodsSupported = _.defaults(this.options.methods || {}, this.defaultPaymentMethods);
            
            if(this.paymentMethodsSupported.cash) {
                this.$cash = $('<div class="payment-cash"><button class="btn btn-lg btn-success">Pay Cash</button></div>');
            }
            if(this.paymentMethodsSupported.credit) {
                this.$credit = $('<div class="payment-credit"><button class="btn btn-lg btn-success">Pay Credit</button></div>');
            }
            if(this.paymentMethodsSupported.bitcoin) {
                this.$bitcoin = $('<div class="payment-bitcoin"></div>');
            }
            if(this.paymentMethodsSupported.points) {
                this.$points = $('<div class="payment-points"></div>');
            }
        },
        render: function() {
            if(this.$cash) {
                this.$el.append(this.$cash);
            }
            if(this.$credit) {
                this.$el.append(this.$credit);
            }
            if(this.$bitcoin) {
                this.$el.append(this.$bitcoin);
            }
            if(this.$points) {
                this.$el.append(this.$points);
            }
            this.setElement(this.$el);
            return this;
        }
    });
    
    var BillView = Backbone.View.extend({
        tagName: "div",
        className: "placeOrder",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.model.bind('change', this.render, this);
            // this.model.orderItemSkuCollection.bind('change', this.renderGoods, this);
            // this.model.orderItemSkuCollection.bind('remove', this.renderGoods, this);
            this.model.orderItemSkuCollection.bind("change", this.render, this);
            this.paymentMethodSelect = this.model.getPaymentMethodSelectView();
            this.$billOfGoods = $('<div class="bill-of-goods"></div>');
            this.$billTotal = $('<div class="bill-total">Total $ <span class="grand-total-price"></span></div>');
            this.$paymentMethod = $('<div class="payment-methods"></div>');
        },
        renderGoods: function() {
            this.$billTotal.find('.grand-total-price').html(this.model.orderItemSkuCollection.getSubTotal());
            this.$billOfGoods.append(this.model.orderItemSkuCollection.getFullView().render().$el);
        },
        render: function() {
            // alert('render')
            this.$el.append(this.$billOfGoods);
            this.$el.append(this.$billTotal);
            this.$el.append(this.$paymentMethod);
            
            this.renderGoods();
            this.$paymentMethod.append(this.paymentMethodSelect.render().$el);
            
            // console.log(this.options.order);
            // $e.find(".items").append(this.model.orderItemSkuCollection.getFullView().render().$el);
            // this.$el.html($e);
            this.setElement(this.$el);
            return this;
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
                silent: true
            });
            var saveModel = this.options.order.save(null, {silent: false, wait: true});
            if (saveModel) {
                saveModel.done(function() {
                    alert("Thank you!  Your order has been placed.");
                    app.router.navigate.navigate("patron/" + menu.auth.getView().userModel.get("name"), true);
                });
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    if (define) {
        define(function() {
            return {
                Collection: Collection,
                Model: Model,
                Bill: BillView,
            };
        });
    }
})();