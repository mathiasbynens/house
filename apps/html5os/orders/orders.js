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
            this.on('change', function(){
                self.renderViews();
            });
            
            this.on('change:itemSkus', function(){
                // this.orderItemSkuCollection.length
                _.each(self.attributes.itemSkus, function(itemSku){
                    var model = self.orderItemSkuCollection.get(itemSku.id);
                    if (!model) {
                        var model = self.orderItemSkuCollection.getNewModel(itemSku);
                        self.orderItemSkuCollection.add(model);
                    } else {
                        // console.log('update model with doc')
                        model.set(itemSku, {
                            silent: true
                        });
                        var changed = model.changedAttributes();
                        for(var c in changed) {
                            model.trigger('change:'+c);
                        }
                        model.trigger('change');
                        model.changed = {}
                    }
                });
            });
            this.orderItemSkuCollection.on('add', function(){
                // alert('added itemSku')
                self.trigger('change');
            });
            this.orderItemSkuCollection.on('remove', function(){
                self.trigger('change');
            });
            this.addViewType(OrderMiniView, 'mini');
            this.addViewType(OrderView, 'order');
            this.addViewType(OrderTableRowView, 'tableRow');
            this.addViewType(OrderView, 'avatar');
            this.addViewType(BillView, 'bill');
            this.addViewType(FullView, 'full');
            this.addViewType(PaymentMethodSelect, 'paymentMethodSelect');
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        url: function() {
            if(window.config && window.config.secureApiUrl) {
                if(this.id) {
                    return window.config.secureApiUrl+'/orders/'+this.id;
                } else {
                    return window.config.secureApiUrl+'/orders';
                }
            } else if(window.config && window.config.site && window.config.site && window.config.site.api && window.config.site.api.secure_url) {
                if(this.id) {
                    return window.config.site.api.secure_url+"/orders/"+this.id;
                }
                return window.config.site.api.secure_url+'/orders';
            } else {
                var hostPath = window.location.hostname;
                if(window.location.port) {
                    hostPath = hostPath + ':' + window.location.port;
                }
                if(this.id) {
                    return "https://"+hostPath+"/api/orders/"+this.id;
                } else {
                    return "https://"+hostPath+"/api/orders";
                }
            }
        },
        getView: function(options) {
            return this.getOrderView();
        },
        getNewView: function(options) {
            return this.getNewOrderView();
        },
        getStatusStr: function() {
            var statusCode = this.get('status');
            if(statusCode === -1) {
                return 'cancelled';
            } else if(statusCode === 0) {
                return 'pending';
            } else if(statusCode === 10) {
                return 'placed';
            } else if(statusCode === 25) {
                return 'declined';
            } else if(statusCode === 30) {
                return 'paid'; // aka processing
            } else if(statusCode === 40) {
                return 'refunded';
            } else if(statusCode === 50) {
                return 'processed';
            } else if(statusCode === 100) {
                return 'complete';
            }
        },
        setUser: function(user, callback) {
            if(!user && account.isUser()) {
                user = {
                    id: account.get('user'),
                    name: account.get('name'),
                }
            }
            this.set({user: user}, {silent: true});
            var saveModel = this.save(null, {silent: false, wait: true});
            if (saveModel) {
                saveModel.done(function() {
                    if(callback) {
                        callback();
                    }
                });
            } else {
                if(callback) {
                    callback();
                }
            }
        },
        saveStatus: function(statusCode, status, callback) {
            console.log(arguments)
            var setObj = status || {};
            setObj.status = statusCode;
            this.set(setObj, {silent: true});
            var saveModel = this.save(null, {silent: false, wait: true});
            if (saveModel) {
                saveModel.done(function() {
                    console.log('status saved')
                    console.log(callback)
                    if(callback) {
                        callback();
                    }
                });
            } else {
                if(callback) {
                    callback();
                }
            }
        },
        getGrandTotal: function() {
            // TODO calc tax & ship and handling
            var itemSubtotal = this.orderItemSkuCollection.getSubTotal();
            return itemSubtotal;
        },
        getItem: function(itemId, callback) {
            window.menuItemsCollection.getOrFetch(itemId, callback);
        },
        isMembership: function(callback) { // includes membership
            var self = this;
            var hasMembershipItemSku = false;
            var itemIds = [];
            
            var procNextItem = function(completeCallback) {
                var itemId = itemIds.pop();
                self.getItem(itemId, function(itemModel){
                    console.log(itemModel)
                    if(itemModel) {
                        if(itemModel.get('membership') && itemModel.get('membership').length > 0) {
                            hasMembershipItemSku = true;
                        }
                    }
                    if(itemIds.length > 0) {
                        procNextItem(completeCallback);
                    } else {
                        if(completeCallback) {
                            completeCallback();
                        }
                    }
                });
            }
            this.orderItemSkuCollection.each(function(itemSkuModel){
                // console.log(itemSkuModel)
                itemIds.push(itemSkuModel.get('item.id'));
            });
            
            procNextItem(function(){
                callback(hasMembershipItemSku);
            });
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
        sortField: 'at-',
        pageSize: 0,
        getPendingListView: function() {
            if(!this.pendingListView) {
                this.pendingListView = this.getView({
                    selection: false, mason: false,
                    loadOnRenderPage: false,
                    renderOnLoad: false,
                    filters: {
                        'pending': {
                            txt: 'Pending',
                            glyphicon: 'unchecked',
                            filter: function(model, filterObj) {
                                return ((!model.has('status') || model.get('status') === 0) && (account.get('user') == model.get('user.id') || account.id == model.get('session_id')));
                            },
                            load: {
                                "status": 0,
                                "user.id": account.get('user')
                            }
                        },
                    }
                });
                this.pendingListView.filterView.filterBy('pending');
            }
            return this.pendingListView;
        },
        getCardList: function() {
            if(!this.cardListView) {
                this.cardListView = this.getView({
                    selection: false,
                    mason: false,
                    // layout: 'table',
                    className: 'houseCollection table-responsive',
                    // headerEl: $('#navbar-header-form'),
                    // search: {
                    //     'fieldName': 'filename'
                    // },
                    // users: {
                    //     'fieldName': 'user.id'
                    // },
                    filters: {
                        'cards': {
                            txt: 'Credit Cards',
                            glyphicon: 'credit-card',
                            filter: function(model, filterObj) {
                                return model.get('customer.cards');
                            },
                            load: {
                                "customer.cards": {$exists: true}
                            },
                            default: true
                        },
                    }
                });
                this.cardListView.filterView.filterBy('cards');
            }
            return this.cardListView;
        },
        getFullListView: function() {
            if(!this.fullListView) {
                this.fullListView = this.getView({
                    selection: true,
                    mason: false,
                    layout: 'table',
                    className: 'houseCollection table-responsive',
                    // headerEl: $('#navbar-header-form'),
                    // search: {
                    //     'fieldName': 'filename'
                    // },
                    users: {
                        'fieldName': 'user.id'
                    },
                    // loadOnRenderPage: false,
                    // renderOnLoad: false,
                    filters: {
                        'cancelled': {
                            txt: 'Cancelled',
                            glyphicon: 'unchecked',
                            filter: function(model, filterObj) {
                                return model.get('status') === -1;
                            },
                            load: {
                                "status": -1
                            }
                        },
                        'pending': {
                            txt: 'Pending',
                            glyphicon: 'time',
                            filter: function(model, filterObj) {
                                return (!model.has('status') || model.get('status') === 0);
                            },
                            load: {
                                "status": 0
                            }
                        },
                        'placed': {
                            txt: 'Placed',
                            glyphicon: 'checked',
                            filter: function(model, filterObj) {
                                return model.get('status') === 10;
                            },
                            load: {
                                "status": 10
                            }
                        },
                        'declined': {
                            txt: 'Declined',
                            glyphicon: 'dollar',
                            filter: function(model, filterObj) {
                                return model.get('status') === 25;
                            },
                            load: {
                                "status": 25
                            }
                        },
                        'paid': { // aka processing
                            txt: 'Paid',
                            glyphicon: 'dollar',
                            filter: function(model, filterObj) {
                                return model.get('status') === 30;
                            },
                            load: {
                                "status": 30
                            }
                        },
                        'refunded': {
                            txt: 'Refunded',
                            glyphicon: 'unchecked',
                            filter: function(model, filterObj) {
                                return model.get('status') === 40;
                            },
                            load: {
                                "status": 40
                            }
                        },
                        'processed': {
                            txt: 'Processed',
                            glyphicon: 'unchecked',
                            filter: function(model, filterObj) {
                                return model.get('status') === 50;
                            },
                            load: {
                                "status": 50
                            }
                        },
                        'complete': {
                            txt: 'Complete',
                            glyphicon: 'unchecked',
                            filter: function(model, filterObj) {
                                return model.get('status') === 100;
                            },
                            load: {
                                "status": 100
                            }
                        },
                    }
                });
                // this.fullListView.filterView.filterBy('pending');
            }
            return this.fullListView;
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
            
            var pendingOrders = window.ordersCollection.where({status: 0});
            this.pendingOrder = _.first(pendingOrders);
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
                this.makePendingOrder(function() {
                    self.addMenuItemSku(menuItem, menuItemSku, callback);
                });
                return;
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
        getQtyTotal: function() {
            var total = 0;
            this.each(function(model){
                // total = total + model.get('sku.price');
                var qty = model.get('qty') || 1;
                total = total + qty;
            });
            return total;
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
    var OrderTableRowView = Backbone.View.extend({
        tagName: "tr",
        className: "order",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            // this.$td = $('<td class=""></td>');
            this.$tdCustomer = $('<td class="customer"></td>');
            this.$tdStatus = $('<td class="status"></td>');
            this.$tdPayment = $('<td class="paymentMethod"></td>');
            this.$tdTotalQty = $('<td class="totalQty" title="Quanitity"></td>'); // number of items
            this.$tdTotalPrice = $('<td class="totalPrice"></td>');
            this.$tdCta = $('<td class="cta"></td>');
            this.$tdAt = $('<td class="at"></td>');
            this.$tdActions = $('<td class="actions"></td>');
            this.$customerName = $('<span class="customerName"></span>');
            
            this.ctaView = new CallToActionView({model: this.model});
            
            var actionOptions = {
                model: this.model, 
                actionOptions: {
                    // fav: {fieldName: 'fav'},
                    // tags: {fieldName: 'tags'},
                    detail: true,
                    // share: false,
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
            this.actions = new utils.ModelActionsView(actionOptions);
            this.actions.on('goToTagName', function(tagName){
                app.collection.view.tagsView.tagSelectView.selectTagByName(tagName);
            });
            
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        renderStatus: function() {
            this.$tdStatus.html(this.model.getStatusStr());
        },
        renderTotals: function() {
            var qtyTotal = this.model.orderItemSkuCollection.getQtyTotal();
            if(qtyTotal) {
                this.$tdTotalQty.html(qtyTotal);
            }
            var total = this.model.orderItemSkuCollection.getSubTotal();
            if(total) {
                this.$tdTotalPrice.html(total);
            }
        },
        renderCustomer: function() {
            var self = this;
            if(!this.userAvatarView) {
                if(!this.model.has('user')) {
                    if(this.model.has('session_name')) {
                        self.$tdCustomer.append(this.$customerName.html(this.model.get('session_name')));
                    } else {
                        self.$tdCustomer.append(this.$customerName.html('Guest'));
                    }
                } else {
                    this.$customerName.remove();
                    if(!self.userAvatarView) {
                        this.model.getUser(function(userModel){
                            if(!self.userAvatarView) {
                                self.userAvatarView = userModel.getNewAvatarNameView();
                            }
                            self.renderCustomer();
                        });
                    }
                }
            } else {
                self.$tdCustomer.append(self.userAvatarView.render().$el);
            }
        },
        render: function() {
            
            this.renderCustomer();
            this.renderStatus();
            this.renderTotals();
            if(this.model.has('at')) {
                if(window.clock) {
                    this.$tdAt.attr('title', clock.moment(this.model.get('at')).format('LLLL'));
                    this.$tdAt.html(clock.moment(this.model.get('at')).calendar());
                }
            }
            
            if(this.model.has('payment')) {
                var payment = this.model.get('payment');
                if(payment.cash) {
                    this.$tdPayment.html('<span class="glyphicon glyphicon-usd"></span>');
                } else if(payment.credit) {
                    this.$tdPayment.html('<span class="glyphicon glyphicon-credit-card"></span>');
                } else if(payment.points) {
                    this.$tdPayment.html('Points');
                } else if(payment.bitcoin) {
                    this.$tdPayment.html('Bitcoin');
                }
            }
            
            this.$tdCta.append(this.ctaView.render().$el);
            
            this.$tdActions.append(this.actions.render().$el);
            
            this.$el.append(this.$tdCustomer);
            this.$el.append(this.$tdStatus);
            this.$el.append(this.$tdTotalQty);
            this.$el.append(this.$tdPayment);
            this.$el.append(this.$tdTotalPrice);
            this.$el.append(this.$tdCta);
            this.$el.append(this.$tdAt);
            this.$el.append(this.$tdActions);
            // var $e = $('<span class="orderView"></span>');
            console.log(this.model);
            // $e.append(this.model.orderItemSkuCollection.getView().render().$el);
            // this.$el.html($e);
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
            click: "clickSelect",
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
                if(this.$el.hasClass('selected')) {
                    this.deselect();
                } else {
                    this.select();
                }
            }
        },
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
            this.$price = $('<div class="price col-md-2 col-xs-6"><button class="btn btn-link disabled"><span class="currency">$</span> <span class="cost"></span></button></div>');
            this.$qty = $('<div class="qty col-md-2 col-xs-3"><button title="Click to edit quantity" class="btn btn-link"><span>x</span> <span class="quantitiy"></span></button></div>');
            this.$actions = $('<div class="actions col-md-2 col-xs-3"></div>');
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
            qty = parseInt(qty, 10);
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
    
    var CallToActionView = Backbone.View.extend({
        tagName: "div",
        className: "cta",
        initialize: function() {
            var self = this;
            this.$ctaButton = $('<button class="btn btn-info"></button>');
        },
        render: function() {
            this.$ctaButton.html('');
            this.$ctaButton.attr('data-cta', '');
            if(app.canUserCashier()) {
                if(this.model.get('status') === 10) {
                    if(this.model.has('payment.cash')) {
                        this.$ctaButton.html('Tender');
                        this.$ctaButton.attr('data-cta', 'tender');
                        this.$ctaButton.show();
                    }
                } else if(this.model.get('status') === 30) { // paid
                    this.$ctaButton.html('Process');
                    this.$ctaButton.attr('data-cta', 'process');
                    this.$ctaButton.show();
                }
                
                this.$el.append(this.$ctaButton);
            }
            if(this.$ctaButton.html() === '') {
                this.$ctaButton.hide();
            }
            
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .btn": "clickBtn"
        },
        clickBtn: function() {
            var self = this;
            if(this.$ctaButton.attr('data-cta') === 'tender') {
                if(confirm('Confirm '+this.model.getGrandTotal()+' paid in full?')) {
                    var saveObj = {paid: {}};
                    saveObj.paid = {cash: this.model.getGrandTotal()}; // gets cashier user object {name, id} on server
                    self.model.saveStatus(30, saveObj, function(){
                        // self.render();
                    });
                }
            } else if(this.$ctaButton.attr('data-cta') === 'process') {
                if(confirm('Confirm order processed?')) {
                    var saveObj = {processed: true};
                    self.model.saveStatus(50, saveObj, function(){
                        // self.render();
                    });
                }
            }
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var PaymentMethodSelect = Backbone.View.extend({
        tagName: "div",
        className: "placeOrder row",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            this.defaultPaymentMethods = {
                "cash": true,
                "credit": true,
                "points": false,
                "bitcoin": false
            }
            this.paymentMethodsSupported = _.defaults(this.options.methods || {}, this.defaultPaymentMethods);
            
            if(this.paymentMethodsSupported.cash) {
                this.$cash = $('<div class="payment-cash col-xs-6"><button class="btn btn-lg btn-success btn-block">Pay Cash</button></div>');
            }
            if(this.paymentMethodsSupported.credit) {
                this.$credit = $('<div class="payment-credit col-xs-6"><button class="btn btn-lg btn-success btn-block">Pay Credit</button></div>');
            }
            if(this.paymentMethodsSupported.bitcoin) {
                this.$bitcoin = $('<div class="payment-bitcoin"></div>');
            }
            if(this.paymentMethodsSupported.points) {
                this.$points = $('<div class="payment-points"></div>');
            }
        },
        events: {
            "click .payment-cash button": "clickCash",
            "click .payment-credit button": "clickCredit",
        },
        clickCash: function() {
            this.trigger('selected', 'cash');
            return false;
        },
        clickCredit: function() {
            this.trigger('selected', 'credit');
            return false;
        },
        clickPoints: function() {
            this.trigger('selected', 'points');
            return false;
        },
        clickBitcoin: function() {
            this.trigger('selected', 'bitcoin');
            return false;
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
    
    var FullView = Backbone.View.extend({
        tagName: "div",
        className: "order-detail",
        initialize: function() {
            var self = this;
            account.on("refreshUser", function(user) {
                self.render();
            });
            // this.model.bind('change', function(){
            //     // 
            // }, this);
            this.model.bind('change', this.render, this);
            // this.model.orderItemSkuCollection.bind('change', this.renderGoods, this);
            // this.model.orderItemSkuCollection.bind('remove', this.renderGoods, this);
            this.model.orderItemSkuCollection.bind("change", this.render, this);
            this.paymentMethodSelect = this.model.getPaymentMethodSelectView();
            this.paymentMethodSelect.on('selected', function(paymentMethodStr){
                var paymentObj = {payment:{}
                };
                var noteStr = self.getNoteString();
                if(noteStr && noteStr !== null) {
                    paymentObj.note = noteStr;
                }
                if(paymentMethodStr === 'cash') {
                    paymentObj.payment = {cash: true};
                    self.model.saveStatus(10, paymentObj, function(){
                        self.renderPaymentTab();
                        self.tabToPayment();
                    });
                } else if(paymentMethodStr === 'credit') {
                    paymentObj.payment = {credit: true};
                    self.model.saveStatus(10, paymentObj, function(){
                        self.renderPaymentTab();
                        self.tabToPayment();
                    });
                } else if(paymentMethodStr === 'points') {
                    paymentObj.payment = {points: true};
                    self.model.saveStatus(10, paymentObj, function(){
                        self.renderPaymentTab();
                        self.tabToPayment();
                    });
                } else if(paymentMethodStr === 'bitcoin') {
                    paymentObj.payment = {bitcoin: true};
                    self.model.saveStatus(10, paymentObj, function(){
                        self.renderPaymentTab();
                        self.tabToPayment();
                    });
                }
            });
            
            // self.emailAuthView = account.getEmailAuthView({className: 'emailAuth row'});
            
            this.$billOfGoods = $('<div class="bill-of-goods"></div>');
            this.$noteTotalRow = $('<div class="noteTotalRow row"></div>');
            this.$orderNoteTextarea = $('<div class="form-group col-xs-6"><textarea disabled="disabled" name="note" placeholder="Add a note" class="form-control"></textarea></div>')
            this.$billTotal = $('<div class="bill-total col-xs-6">Total USD $ <strong class="grand-total-price"></strong></div>');
            this.$paymentMethod = $('<div class="payment-methods"></div>');
            
            this.$paymentCash = $('<div class="paymentCash"><p>Please pay the cashier and your order will be approved.</p></div>');
            this.$paymentCredit = $('<div class="paymentCredit"><h4>Credit Card</h4><span class="declined text-warning"></span></div>');
            this.$newCreditCard = $('<div class="newCredit"><h5>New Card</h5></div>');
            this.$paymentApproved = $('<div class="paymentApproved"><h4>Thank you!</h4><p>Your order has been approved and is now being processed.</p></div>');
            
            this.$paymentMethods = $('<div class="paymentMethods"></div>');
            
            self.$navTabs = $('<ul class="nav nav-tabs">\
    <li class="active"><a href="#'+self.cid+'-bill" data-toggle="tab">Cart</a></li>\
    <li class="disabled"><a href="#'+self.cid+'-payment" data-toggle="tab">Payment</a></li>\
    <li class="disabled"><a href="#'+self.cid+'-complete" data-toggle="tab">Complete</a></li>\
</ul>');
            self.$tabContent = $('<div class="tab-content">\
    <div class="tab-pane active billTab" id="'+self.cid+'-bill"></div>\
    <div class="tab-pane payment" id="'+self.cid+'-payment"></div>\
    <div class="tab-pane complete" id="'+self.cid+'-complete"></div>\
</div>');
        },
        getNoteString: function() {
            return this.$orderNoteTextarea.find('textarea').val();
        },
        renderGoods: function() {
            this.$billTotal.find('.grand-total-price').html(this.model.orderItemSkuCollection.getSubTotal());
            this.$billOfGoods.append(this.model.orderItemSkuCollection.getFullView().render().$el);
        },
        renderPaymentTab: function() {
            // this.$tabContent.find('.payment').append(this.emailAuthView.render().$el);
            var self = this;
            if(this.model.has("user")) {
                this.model.getUser(function(userModel){
                    console.log(userModel)
                    if(!this.userAvatar) {
                        this.userAvatar = userModel.getNewAvatarNameView();
                    }
                    self.$tabContent.find('.payment').prepend(this.userAvatar.render().$el);
                });
            }
            
            this.$tabContent.find('.payment').append(this.$paymentMethods);
            if(this.model.get('status') >= 30) {
                this.$tabContent.find('.payment').append(this.$paymentApproved);
            } else {
                if(this.model.has('payment.cash')) {
                    
                    if(app.canUserCashier()) {
                        this.$paymentCash.html('<button class="tender btn btn-success">Tender $ <span class="cashDollars"></span></button>');
                        this.$paymentCash.find('.cashDollars').html(this.model.getGrandTotal());
                    }
                    
                    this.$paymentMethods.append(this.$paymentCash);
                    this.$paymentCash.show().siblings().hide();
                // } else if(this.model.has('payment.credit')) {
                } else {
                    this.$paymentMethods.append(this.$paymentCredit);
                    this.$paymentCredit.show().siblings().hide();
                }
                
                if(this.model.get('status') === 25) {
                    // declined
                    if(this.model.has('declined')) {
                        this.$paymentCredit.find('.declined').html(this.model.get('declined'));
                    }
                }
                
            }
        },
        render: function() {
            // alert('render')
            this.$el.append(this.$navTabs);
            this.$el.append(this.$tabContent);
            this.$tabContent.find('.billTab').append(this.$billOfGoods);
            
            if(this.model.has('note')) {
                this.$orderNoteTextarea.find('textarea').val(this.model.get('note'));
            }
            this.$noteTotalRow.append(this.$orderNoteTextarea);
            this.$noteTotalRow.append(this.$billTotal);
            this.$tabContent.find('.billTab').append(this.$noteTotalRow);
            this.$tabContent.find('.billTab').append(this.$paymentMethod);
            
            this.renderPaymentTab();
            
            this.renderGoods();
            this.$paymentMethod.append(this.paymentMethodSelect.render().$el);
            
            this.goToTabFromStatus();
            // console.log(this.options.order);
            // $e.find(".items").append(this.model.orderItemSkuCollection.getFullView().render().$el);
            // this.$el.html($e);
            this.setElement(this.$el);
            return this;
        },
        goToTabFromStatus: function() {
            var self = this;
            var statusCode = this.model.get('status');
            if(this.$el.parent().length === 0) { // not on page yet
                self.$tabContent.find('.active').removeClass('active');
                if(statusCode >= 50) {
                    self.$tabContent.find('.complete').addClass('active');
                } else if(statusCode >= 10) {
                    self.$tabContent.find('.payment').addClass('active');
                } else {
                    self.$tabContent.find('.billTab').addClass('active');
                }
            }
            if(statusCode >= 50) {
                this.tabToComplete();
            } else if(statusCode >= 10) {
                this.tabToPayment();
            } else {
                this.tabToBill();
            }
        },
        tabToBill: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-bill"]');
            $el.parent('li').removeClass('disabled');
            $el.tab('show');
        },
        tabToPayment: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-payment"]');
            $el.parent('li').removeClass('disabled');
            $el.tab('show');
        },
        tabToComplete: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-complete"]');
            $el.parent('li').removeClass('disabled');
            $el.tab('show');
        },
        cashierPaid: function(amount) {
            var self = this;
            var saveObj = {paid: {}};
            saveObj.paid = {cash: amount}; // gets cashier user object {name, id} on server
            self.model.saveStatus(30, saveObj, function(){
                self.renderPaymentTab();
                self.tabToPayment();
            });
        },
        events: {
            "click button.cash": "order",
            "click button.credit": "order",
            "click button.tender": "tenderCashInFull",
            "touchstart input": "touchstartstopprop"
        },
        tenderCashInFull: function() {
            if(confirm('Confirm '+this.model.getGrandTotal()+' paid in full?')) {
                this.cashierPaid(this.model.getGrandTotal());
            }
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        remove: function() {
            this.$el.remove();
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
            this.paymentMethodSelect.on('selected', function(paymentMethodStr){
                var paymentObj = {payment:{}
                };
                var noteStr = self.getNoteString();
                if(noteStr && noteStr !== null) {
                    paymentObj.note = noteStr;
                }
                if(paymentMethodStr === 'cash') {
                    paymentObj.payment = {cash: true};
                    self.model.saveStatus(10, paymentObj, function(){
                        console.log('go to tab payment');
                        // self.renderPaymentTab();
                        self.tabToPayment();
                    });
                } else if(paymentMethodStr === 'credit') {
                    paymentObj.payment = {credit: true};
                    self.model.saveStatus(10, paymentObj, function(){
                        self.renderPaymentTab();
                        self.tabToPayment();
                    });
                } else if(paymentMethodStr === 'points') {
                    paymentObj.payment = {points: true};
                    self.model.saveStatus(10, paymentObj, function(){
                        self.renderPaymentTab();
                        self.tabToPayment();
                    });
                } else if(paymentMethodStr === 'bitcoin') {
                    paymentObj.payment = {bitcoin: true};
                    self.model.saveStatus(10, paymentObj, function(){
                        self.renderPaymentTab();
                        self.tabToPayment();
                    });
                }
            });
            
            self.emailAuthView = account.getEmailAuthView({className: 'emailAuth row'});
            self.emailAuthView.on('saved', function(){
                self.model.setUser();
            });
            
            this.$billOfGoods = $('<div class="bill-of-goods"></div>');
            this.$noteTotalRow = $('<div class="noteTotalRow row"></div>');
            this.$orderNoteTextarea = $('<div class="form-group col-xs-6"><textarea name="note" placeholder="Add a note" class="form-control"></textarea></div>')
            this.$billTotal = $('<div class="bill-total col-xs-6">Total USD $ <strong class="grand-total-price"></strong></div>');
            this.$paymentMethod = $('<div class="payment-methods"></div>');
            
            this.$paymentCash = $('<div class="paymentCash"><p>Please pay the cashier and your order will be approved.</p></div>');
            this.$paymentCredit = $('<div class="paymentCredit"><h4>Credit Card</h4><span class="declined text-danger"></span></div>');
            //<h5>New Card</h5>
            this.$pickCreditCard = $('<div class="pickCredit row">\
</div>');            
            this.$newCreditCard = $('<div class="newCredit row">\
    <div class="form-group col-xs-12"><input class="form-control" autocomplete="false" type="text" name="number" placeholder="Card number" /></div>\
    <div class="form-group col-xs-6"><input class="form-control" autocomplete="false" type="number" name="exp_month" placeholder="Exp. Month" min="1" max="12" /></div>\
    <div class="form-group col-xs-6"><input class="form-control" autocomplete="false" type="number" name="exp_year" placeholder="Exp. Year" min="2014" max="3030" /></div>\
    <div class="form-group col-xs-12"><button class="btn btn-block btn-success submit" data-loading-text="Loading...">Submit</button></div>\
</div>');
            this.$paymentApproved = $('<div class="paymentApproved"><h4>Thank you!</h4><p>Your order has been received and is now being processed.</p></div>');
            
            this.$paymentMethods = $('<div class="paymentMethods"></div>');
            this.$completeTab = $('<div class="completion"></div>');
            
            self.$navTabs = $('<ul class="nav nav-tabs">\
    <li class="active"><a href="#'+self.cid+'-bill" data-toggle="tab">Cart</a></li>\
    <li class="disabled"><a href="#'+self.cid+'-payment" data-toggle="tab">Pay</a></li>\
    <li class="disabled"><a href="#'+self.cid+'-complete" data-toggle="tab">Complete</a></li>\
</ul>');
            self.$tabContent = $('<div class="tab-content">\
    <div class="tab-pane active billTab" id="'+self.cid+'-bill"></div>\
    <div class="tab-pane payment" id="'+self.cid+'-payment"></div>\
    <div class="tab-pane complete" id="'+self.cid+'-complete"></div>\
</div>');
        },
        getNoteString: function() {
            return this.$orderNoteTextarea.find('textarea').val();
        },
        renderGoods: function() {
            this.$billTotal.find('.grand-total-price').html(this.model.orderItemSkuCollection.getSubTotal());
            this.$billOfGoods.append(this.model.orderItemSkuCollection.getFullView().render().$el);
        },
        renderPrevCards: function() {
            var self = this;
            window.cardOrdersCollection = new window.Orders.Collection();
            var cardOrderList = window.cardOrdersCollection.getCardList();
            console.log('cardOrders load')
            cardOrderList.collection.load(null, function(){
                self.$pickCreditCard.html('');
                console.log('cardOrders loaded')
                console.log(cardOrderList.collection)
                if(cardOrderList.collection.length > 0) {
                    self.$newCreditCard.hide();
                    cardOrderList.collection.each(function(orderModel){
                        if(orderModel.has('customer.cards.data')) {
                            var cards = orderModel.get('customer.cards.data');
                            for(var c in cards) {
                                var card = cards[c];
                                var $card = $('<div class="col-md-6 card"></div>');
                                $card.attr('data-id', card.id);
                                $card.attr('data-customer-id', orderModel.get('customer.id'));
                                $card.append('<span class="info"><strong>'+card.type+'</strong> '+card.last4+' exp. '+card.exp_month+'/'+card.exp_year+'</span>');
                                $card.append('<button class="btn btn-link use-card" data-loading-text="Using..">Use</button>');
                                self.$pickCreditCard.append($card);
                            }
                        }
                    });
                    var $addCardBtn = $('<div class="form-group col-md-12"><button class="show-new-card-form btn btn-success btn-block">Add New Card</button></div>');
                    self.$pickCreditCard.append($addCardBtn);
                }
            });
            // this.$pickCreditCard.
        },
        renderPaymentTab: function() {
            console.log('renderPaymentTab')
            var self = this;
            this.$tabContent.find('.payment').append(this.emailAuthView.render().$el);
            this.$tabContent.find('.payment').append(this.$paymentMethods);
            
            this.$paymentMethods.show();
            this.model.isMembership(function(isMembership){
                if(isMembership) {
                    if(!account.isUser()) {
                        self.$paymentMethods.hide();
                    }
                }
            });
            if(this.model.get('status') >= 20) {
                var $el = this.$navTabs.find('a[href="#'+this.cid+'-payment"]');
                $el.parent('li').removeClass('disabled');
            }
            
            if(this.model.get('status') >= 30) {
                this.$tabContent.find('.payment').append(this.$paymentApproved);
                this.$paymentMethods.hide();
            } else {
                if(this.model.has('payment.cash')) {
                    this.$paymentMethods.append(this.$paymentCash);
                    this.$paymentCash.show().siblings().hide();
                // } else if(this.model.has('payment.credit')) {
                } else {
                    
                    this.renderPrevCards();
                    
                    this.$paymentCredit.append(this.$pickCreditCard);
                    this.$paymentCredit.append(this.$newCreditCard);
                    this.$paymentMethods.append(this.$paymentCredit);
                    this.$paymentCredit.show().siblings().hide();
                }
                
                if(this.model.get('status') === 25) {
                    // declined
                    if(this.model.has('declined')) {
                        this.$paymentCredit.find('.declined').html(this.model.get('declined'));
                    }
                }
            }
        },
        renderCompleteTab: function() {
            var self = this;
            if(this.model.get('status') === 100) {
                this.$completeTab.html('Your order is complete.'); // complete
            } else if(this.model.get('status') === 50) { // processed
                this.$completeTab.html('Your order has been processed.');
            } else if(this.model.get('status') === 30) { // paid & processing
                this.$completeTab.html('Your order has been paid and is being processed now.');
            }
            
            if(this.model.get('status') >= 30) {
                var $el = this.$navTabs.find('a[href="#'+this.cid+'-complete"]');
                $el.parent('li').removeClass('disabled');
            }
            
            this.$tabContent.find('.complete').append(this.$completeTab);
        },
        render: function() {
            // alert('render')
            this.$el.append(this.$navTabs);
            this.$el.append(this.$tabContent);
            this.$tabContent.find('.billTab').append(this.$billOfGoods);
            
            if(this.model.has('note')) {
                this.$orderNoteTextarea.find('textarea').val(this.model.get('note'));
            }
            this.$noteTotalRow.append(this.$orderNoteTextarea);
            this.$noteTotalRow.append(this.$billTotal);
            this.$tabContent.find('.billTab').append(this.$noteTotalRow);
            this.$tabContent.find('.billTab').append(this.$paymentMethod);
            
            this.renderPaymentTab();
            this.renderCompleteTab();
            
            this.renderGoods();
            this.$paymentMethod.append(this.paymentMethodSelect.render().$el);
            
            this.goToTabFromStatus();
            // console.log(this.options.order);
            // $e.find(".items").append(this.model.orderItemSkuCollection.getFullView().render().$el);
            // this.$el.html($e);
            this.setElement(this.$el);
            return this;
        },
        goToTabFromStatus: function() {
            console.log('go to tab from status')
            var self = this;
            var statusCode = this.model.get('status');
            console.log(statusCode)
            if(this.$el.parent().length === 0) { // not on page yet
                console.log('not on page')
                self.$tabContent.find('.active').removeClass('active');
                if(statusCode >= 50) {
                    self.$tabContent.find('.complete').addClass('active');
                } else if(statusCode >= 10) {
                    self.$tabContent.find('.payment').addClass('active');
                } else {
                    self.$tabContent.find('.billTab').addClass('active');
                }
            }
            if(statusCode >= 50) {
                this.tabToComplete();
            } else if(statusCode >= 10) {
                this.tabToPayment();
            } else {
                this.tabToBill();
            }
        },
        tabToBill: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-bill"]');
            $el.parent('li').removeClass('disabled');
            $el.tab('show');
        },
        tabToPayment: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-payment"]');
            $el.parent('li').removeClass('disabled');
            $el.tab('show');
        },
        tabToComplete: function() {
            var $el = this.$navTabs.find('a[href="#'+this.cid+'-complete"]');
            $el.parent('li').removeClass('disabled');
            $el.tab('show');
        },
        events: {
            "click button.cash": "order",
            "click button.credit": "order",
            "touchstart input": "touchstartstopprop",
            "click .submit": "submitNewCreditCard",
            "click .show-new-card-form": "showNewCardForm",
            "click .use-card": "useCard"
        },
        useCard: function(e) {
            var self = this;
            var $et = $(e.currentTarget);
            var cardId = $et.parent('.card').attr('data-id');
            var customerId = $et.parent('.card').attr('data-customer-id');
            var paymentObj = {
                payment: {}
            }
            paymentObj.payment.credit = {
                card: cardId,
                customer: customerId
            }
            // todo cvc
            // address
            $et.button('loading');
            self.model.saveStatus(10, paymentObj, function(){
                // console.log('set status with card payment details')
                $et.button('reset');
            });
        },
        showNewCardForm: function() {
            this.$newCreditCard.show();
            this.$newCreditCard.find('input[name="number"]').focus();
        },
        submitNewCreditCard: function() {
            var self = this;
            this.$newCreditCard.find('button').button('loading');
            this.$paymentCredit.find('.declined').html('');
            var ccn = this.$newCreditCard.find('input[name="number"]').val();
            var exp_month = this.$newCreditCard.find('input[name="exp_month"]')[0].valueAsNumber;
            var exp_year = this.$newCreditCard.find('input[name="exp_year"]')[0].valueAsNumber;
            var paymentObj = {
                payment: {}
            }
            paymentObj.payment.credit = {
                number: ccn,
                exp_month: exp_month,
                exp_year: exp_year,
            }
            // todo cvc
            // address
            self.model.saveStatus(10, paymentObj, function(){
                // console.log('set status with card payment details')
                self.$newCreditCard.find('button').button('reset');
            });
            
            return false;
        },
        touchstartstopprop: function(e) {
            e.stopPropagation();
        },
        // order: function() {
        //     var self = this;
        //     if (!menu.user) {
        //         menu.auth.getView().login(function() {
        //             console.log(menu.auth);
        //             menu.auth.getView().getUserModel(function(user) {
        //                 console.log(user);
        //                 menu.bindUser(user);
        //                 self.order();
        //             });
        //         });
        //         return false;
        //     }
        //     this.options.order.set({
        //         status: 10
        //     }, {
        //         silent: true
        //     });
        //     var saveModel = this.options.order.save(null, {silent: false, wait: true});
        //     if (saveModel) {
        //         saveModel.done(function() {
        //             alert("Thank you!  Your order has been placed.");
        //             app.router.navigate.navigate("patron/" + menu.auth.getView().userModel.get("name"), true);
        //         });
        //     }
        //     return false;
        // },
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
                Full: FullView,
            };
        });
    }
})();