(function() {
    var MenuAppView = Backbone.View.extend({
        tag: "body",
        className: "orders-app",
        initialize: function() {
            var self = this;
            this.$app = $('<div class="app"></div>');
            require(['/files/backbone-files.js'], function(FilesBackbone) {
                window.FilesBackbone = FilesBackbone;
                require(['/menu/menuItems.js'], function(MenuItems) {
                    window.MenuItems = MenuItems;
                    require(['/menu/menuGroups.js'], function(MenuGroups) {
                        window.MenuGroups = MenuGroups;
                        require(['/menu/menuItemReviews.js'], function(MenuItemReviews) {
                            window.MenuItemReviews = MenuItemReviews;
                            require(['/orders/orders.js'], function(Orders) {
                                window.Orders = Orders;
                                window.ordersCollection = new Orders.Collection();
                                window.ordersCollection.on('goToNavigatePath', function(model) {
                                    self.router.navigate(model.getNavigatePath(), {trigger: true});
                                });
                                window.menuGroupsCollection = new MenuGroups.Collection();
                                window.menuGroupsCollection.on('editModel', function(menuGroup) {
                                    self.nav.router.navigate('group/id/' + menuGroup.id + '/edit', {
                                        trigger: true
                                    });
                                });
                                window.menuGroupsCollection.on('addGroupToModel', function(menuGroup) {
                                    self.nav.router.navigate('group/id/' + menuGroup.id + '/addGroup', {
                                        trigger: true
                                    });
                                });
                                window.menuGroupsCollection.on('addItemToModel', function(menuGroup) {
                                    self.nav.router.navigate('group/id/' + menuGroup.id + '/addItem', {
                                        trigger: true
                                    });
                                });
        
                                window.menuItemsCollection = new MenuItems.Collection();
                                window.menuItemsCollection.on('editModel', function(model) {
                                    self.nav.router.navigate('item/id/' + model.id + '/edit', {
                                        trigger: true
                                    });
                                });
                                
                                window.menuItemsCollection.load(null, function() {
                                    window.menuGroupsCollection.load(null, function() {
                                        window.ordersCollection.load(null, function() {
                                            self.initialized = true;
                                            self.trigger('initialized', true);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        },
        renderOrderPending: function() {
            var self = this;
            self.orderPending = self.ordersPendingList.collection.first();
            if(self.orderPending.orderItemSkuCollection) {
                self.orderPending.orderItemSkuCollection.on('add', function() {
                    self.renderOrderPending();
                });
                self.orderPending.orderItemSkuCollection.on('remove', function() {
                    self.renderOrderPending();
                });
            }
            if(self.orderPending) {
                self.orderPendingMiniView = self.orderPending.getMiniView();
                if(self.orderPending.orderItemSkuCollection && self.orderPending.orderItemSkuCollection.length > 0) {
                    self.$el.append(self.orderPendingMiniView.render().$el.show());
                } else {
                    self.$el.append(self.orderPendingMiniView.render().$el.hide());
                }
            } else {
                if(self.orderPendingMiniView) {
                    self.orderPendingMiniView.render().$el.hide();
                }
            }
        },
        render: function() {
            var self = this;
            this.$el.append(this.$app);
            // this.$el.html("");
            // this.$el.append(this.menuGroupList.render(false).$el);
            // this.$el.append(this.menuItemList.render(false).$el);
            // this.$el.append(this.orderPending.render().$el);
            this.setElement(this.$el);
            return this;
        },
        findMenuGroupBySlug: function(slug, callback) {
            window.menuGroupsCollection.getOrFetchByField('slug', slug, callback);
        },
        userIs: function(userId) {
            return(this.user && this.user.id == userId);
        },
        userIsAdmin: function() {
            return(this.user && this.user.has('groups') && this.user.get('groups').indexOf('admin') !== -1);
        },
        isUserCashier: function() {
            return(this.user && this.user.has('groups') && this.user.get('groups').indexOf('cashier') !== -1);
        },
        canUserCashier: function() {
            return (this.userIsAdmin() || this.isUserCashier());
        },
        bindAuth: function(auth) {
            var self = this;
            self.auth = auth;
        },
        bindUser: function(user) {
            var self = this;
            self.user = user;
            self.trigger('refreshUser', user);
        },
        bindNav: function(nav) {
            this.nav = nav;
            nav.list.on('home', function() {
                nav.router.navigate('', {
                    trigger: true
                });
            });
            nav.col.add({
                title: "Search",
                navigate: "search",
                glyphicon: 'search'
            });
            // nav.col.add({title: "Groups", navigate: "groups"}); // , glyphicon: 'list'
            // nav.col.add({title: "Items", navigate: "items"});
            // nav.col.add({title: "New Item", navigate: "items/new", condition: 'isAdmin'});
            // nav.col.add({title: "New Group", navigate: "groups/new", condition: 'isAdmin'});
            this.bindRouter(nav.router);
            if(window.account && (account.isUser() || account.isAdmin())) {}
        },
        findMenuRoot: function(callback) {
            window.menuGroupsCollection.getOrFetchByField('root', true, callback);
        },
        renderMenuGroup: function(menuGroup) {
            var self = this;
            if(!menuGroup.has('root')) {
                self.router.setTitle(menuGroup.get('name'));
            }
            var view = menuGroup.getFullView();
            view.on('selectedGroup', function(group) {
                var path = group.getNavigatePath();
                self.router.navigate('group/' + path, {
                    trigger: true
                });
            });
            view.on('selectedItem', function(model) {
                var path = model.getNavigatePath();
                self.router.navigate('item/' + path, {
                    trigger: true
                });
            });
            var $fullView = view.render().$el;
            self.$app.append($fullView);
            $fullView.show().siblings().hide();
        },
        renderMenuItem: function(model) {
            var self = this;
            self.router.setTitle(model.get('name'));
            var view = model.getFullView();
            // view.on('selectedGroup', function(group){
            //     var path = group.getNavigatePath();
            //     self.router.navigate('group/'+path, {trigger: true});
            // });
            // view.on('selectedItem', function(model){
            //     var path = model.getNavigatePath();
            //     self.router.navigate('item/'+path, {trigger: true});
            // });
            var $fullView = view.render().$el;
            self.$menu.append($fullView);
            view.imageCarouselView.initCarousel();
            $fullView.show().siblings().hide();
        },
        renderOrderList: function() {
            this.orderListView = window.ordersCollection.getFullListView();
            this.$el.append(this.orderListView.render().$el);
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            var doFx = false;

            router.on('reset', function() {
                // $('#header').removeAttr('class');
                // self.$el.removeAttr('data-nav');
                if(self.box) {
                    self.box.off('removed');
                    self.box.hide();
                }
                self.nav.unselect();
            });
            router.on('root', function() {
                router.reset();
                // self.loadCollections(function(){
                router.trigger('loadingProgress', 30);
                router.setTitle('');
                self.nav.selectByNavigate('');
                self.renderOrderList();
                router.trigger('loadingComplete');
                // });
            });

            router.route("menu/:menuPath", "path", function(path) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Menu Path');
                self.nav.selectByNavigate('groups');
                router.trigger('loadingComplete');
            });
            router.route("menu", "path", function(path) {
                router.reset();
                // self.loadCollections(function(){
                router.trigger('loadingProgress', 30);
                router.setTitle('Menu');
                self.nav.selectByNavigate('');
                self.findMenuRoot(function(rootMenuGroup) {
                    console.log(rootMenuGroup)
                    if(rootMenuGroup) {
                        self.renderMenuGroup(rootMenuGroup);
                    }
                    router.trigger('loadingComplete');
                });
            });

            router.route("groups/new", "groupsNew", function() {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('New Group');
                self.nav.selectByNavigate('');

                var formOpts = {
                    collection: window.menuGroupsCollection,
                    submit: false,
                    className: 'house-form menuGroup'
                };
                formOpts.fields = {
                    "name": {
                        validateType: 'string',
                        autocomplete: "off",
                        placeholder: "Group name",
                        className: "form-control"
                    },
                }
                self.newGroupForm = window.menuGroupsCollection.getFormView(formOpts);
                self.newGroupForm.on('saved', function(doc) {
                    console.log(doc)
                    box.remove();
                });

                self.box = utils.appendLightBox(self.newGroupForm.render().$el, ' ', ' ');
                self.box.on('removed', function() {
                    self.router.back();
                });
                self.newGroupForm.focus();

                router.trigger('loadingComplete');
            });

            router.route("id/:id/place", "placeOrder", function(id) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Place Order');
                self.nav.selectByNavigate('orders');

                // window.menuItemsCollection.getOrFetch(id, function(doc) {
                window.ordersCollection.getOrFetch(id, function(doc) {
                    if(doc) {
                        // self.renderMenuItem(doc);
                        self.box = utils.appendLightBox(doc.getBillView().render().$el, 'Place Order', false);
                        self.box.on('removed', function() {
                            self.router.back();
                        });
                    }
                });

                router.trigger('loadingComplete');
            });
            
            router.route("id/:id", "viewOrder", function(id) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Order Detail');
                self.nav.selectByNavigate('orders');

                // window.menuItemsCollection.getOrFetch(id, function(doc) {
                window.ordersCollection.getOrFetch(id, function(doc) {
                    if(doc) {
                        // self.renderMenuItem(doc);
                        self.box = utils.appendLightBox(doc.getFullView().render().$el, 'Order Detail', false);
                        self.box.on('removed', function() {
                            self.router.back();
                        });
                    }
                });

                router.trigger('loadingComplete');
            });

            router.route("item/id/:id", "itemId", function(id) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Item');
                self.nav.selectByNavigate('groups');

                window.menuItemsCollection.getOrFetch(id, function(doc) {
                    if(doc) {
                        self.renderMenuItem(doc);
                    }
                });

                router.trigger('loadingComplete');
            });

            router.route("item/id/:id/edit", "itemIdEdit", function(id) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Edit Menu Item');
                self.nav.selectByNavigate('items');

                window.menuItemsCollection.getOrFetch(id, function(doc) {
                    if(doc) {
                        // console.log(doc)
                        if(self.boxFormView) {
                            self.boxFormView.remove();
                            // delete self.boxFormView;
                        }
                        self.boxFormView = doc.getFormView();
                        self.box = utils.appendLightBox(self.boxFormView.render().$el, 'Edit Menu Item', false);
                        self.boxFormView.on('saved', function() {
                            // self.boxFormView.remove();
                            self.box.remove();
                            // self.router.back();
                        });
                        self.box.on('removed', function() {
                            self.router.back();
                        });
                        self.boxFormView.focus('name');
                    }
                });

                router.trigger('loadingComplete');
            });

            router.route("items/new", "itemsNew", function() {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('New Item');
                self.nav.selectByNavigate('');

                var formOpts = {
                    collection: window.menuItemsCollection,
                    submit: false,
                    className: 'house-form menuItem'
                };
                formOpts.fields = {
                    "title": {
                        validateType: 'string',
                        autocomplete: "off",
                        placeholder: "Item name",
                        className: "form-control"
                    },
                }
                self.newItemForm = window.menuItemsCollection.getFormView(formOpts);
                self.box = utils.appendLightBox(self.newItemForm.render().$el, ' ', ' ');
                self.newItemForm.on('saved', function(doc) {
                    console.log(doc)
                    self.box.remove();
                });

                self.box.on('removed', function() {
                    self.router.back();
                });
                self.newItemForm.focus();

                router.trigger('loadingComplete');
            });

            router.route("group/id/:id", "groupId", function(id) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Group');
                self.nav.selectByNavigate('groups');

                window.menuGroupsCollection.getOrFetch(id, function(doc) {
                    if(doc) {
                        self.renderMenuGroup(doc);
                    }
                });

                router.trigger('loadingComplete');
            });
            router.route("group/id/:id/edit", "groupIdEdit", function(id) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Edit Menu Group');
                self.nav.selectByNavigate('groups');

                window.menuGroupsCollection.getOrFetch(id, function(doc) {
                    if(doc) {
                        console.log(doc)
                        if(self.boxFormView) {
                            self.boxFormView.remove();
                            // delete self.boxFormView;
                        }
                        self.boxFormView = doc.getFormView();
                        self.box = utils.appendLightBox(self.boxFormView.render().$el, 'Edit Menu Group', false);
                        self.boxFormView.on('saved', function() {
                            // self.boxFormView.remove();
                            self.box.remove();
                            // self.router.back();
                        });
                        self.box.on('removed', function() {
                            self.router.back();
                        });
                        self.boxFormView.focus('name');
                    }
                });

                router.trigger('loadingComplete');
            });
            router.route("group/id/:id/addGroup", "groupIdAddGroup", function(id) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Add Sub Group');
                self.nav.selectByNavigate('groups');

                window.menuGroupsCollection.getOrFetch(id, function(doc) {
                    if(doc) {
                        var view = doc.getPickerView();
                        self.box = utils.appendLightBox(view.render().$el, 'Add Sub Menu', false);
                        view.on('picked', function(pickedMenuGroup) {
                            self.box.remove();
                            doc.addGroup(pickedMenuGroup);
                        });
                        view.on('saved', function() {
                            self.box.remove();
                            // self.router.back();
                        });
                        self.box.on('removed', function() {
                            self.router.back();
                        });
                        view.focus();
                    }
                });

                router.trigger('loadingComplete');
            });
            router.route("group/id/:id/addItem", "groupIdAddItem", function(id) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Add Item');
                self.nav.selectByNavigate('groups');

                window.menuGroupsCollection.getOrFetch(id, function(doc) {
                    if(doc) {
                        var view = doc.getItemPickerView();
                        self.box = utils.appendLightBox(view.render().$el, 'Add Item', false);
                        view.on('picked', function(pickedMenuItem) {
                            self.box.remove();
                            doc.addItem(pickedMenuItem);
                        });
                        view.on('saved', function() {
                            self.box.remove();
                            // self.router.back();
                        });
                        self.box.on('removed', function() {
                            self.router.back();
                        });
                    }
                });

                router.trigger('loadingComplete');
            });
            router.route("search", "search", function() {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Search');
                self.nav.selectByNavigate('search');
                router.trigger('loadingComplete');
            });
            router.route("search/:query", "searchQuery", function(query) {
                router.reset();
                router.trigger('loadingProgress', 30);
                router.setTitle('Search for ' + query);
                self.nav.selectByNavigate('search');
                router.trigger('loadingComplete');
            });
        }
    });
    if(define) {
        define(function() {
            return MenuAppView;
        });
    }
})();