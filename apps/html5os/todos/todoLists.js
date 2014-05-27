(function() {
    
    var Model = Backbone.House.Model.extend({
        collectionName: "todoLists",
        initialize: function(attr, options) {
            this.TableRowView = RowView;
            this.RowView = RowView;
            this.AvatarView = RowView;
            this.FullView = RowView;
            this.FormView = FormView;
            options = options || {};
            options.ownerFieldName = 'owner';
            this.statusNames = { 0: "todo", 1: "done" };
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: function() {
          return {
            done:  0
          };
        },
        getStatus: function() {
            return this.statusNames[this.get("done")];
        },
        slugStr: function(str) {
            return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
        },
        getNavigatePathEdit: function() {
            var p = 'list/id/'+this.id;
            if(this.get('slug')) {
                p = 'list/'+this.get('slug')+'/edit';
            } else {
                p = 'list/id/'+this.id+'/edit';
            }
            return p;
        },
        getNavigatePath: function() {
            var p = 'list/id/'+this.id;
            if(this.get('slug')) {
                p = 'list/'+this.get('slug');
            } else {
                var self = this;
                var titleSlug = this.slugStr(this.get('name'));
                p = 'list/'+titleSlug;
                this.set({"slug": titleSlug},{silent: true});
                var saveModel = this.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                });
            }
            return p;
        }
    });
    
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'todoLists',
        url: '/api/todoLists',
        getOrFetchSlug: function(slug, callback) {
            this.getOrFetchByField('slug', slug, callback);
        },
    });
    
    // var ListView = Backbone.View.extend({
    //     layout: 'row',
    //     initialize: function() {
    //         var self = this;
    //         self.loading = false;
    //         this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> lists</div>');
    //         var $ul = this.$ul = $('<div class="todoLists list-group"></div>');
    //         this.collection.on('add', function(doc) {
    //             var view;
    //             if(self.layout === 'row') {
    //                 console.log(self);
    //                 view = doc.getRow({list: self});
    //             }
    //             self.appendRow(view);
    //             self.renderPager();
    //             doc.on('remove', function(){
    //                 view.$el.remove();
    //                 return false;
    //             });
    //         });
    //         this.collection.on('remove', function(doc, col, options) {
    //             self.renderPager();
    //         });
    //         this.collection.on('count', function() {
    //             self.renderPager();
    //         });
    //         this.collection.on('reset', function(){
    //             self.render();
    //         });
    //     },
    //     filter: function(f) {
    //         var self = this;
    //         if(f && typeof f == 'function') {
    //             this.currentFilter = f;
    //             this.collection.filter(function(model) {
    //               if(f(model)) {
    //                   self.getDocLayoutView(model).$el.show();
    //                   return true;
    //               }
    //               self.getDocLayoutView(model).$el.hide();
    //               return false;
    //             });
    //         } else {
    //             // show all
    //             self.$ul.children().show();
    //             self.currentFilter = false;
    //         }
    //     },
    //     events: {
    //       "click .list-pager": "loadMore",
    //     },
    //     loadMore: function() {
    //         var self = this;
    //         this.collection.getNextPage(function(){
    //             self.loading = false;
    //         });
    //     },
    //     getDocLayoutView: function(doc) {
    //         var view;
    //         var self = this;
    //         if(this.layout === 'row') {
    //             view = doc.getRow({list: self});
    //         } else if(this.layout === 'avatar') {
    //             view = doc.getAvatar({list: self});
    //         }
    //         return view;
    //     },
    //     render: function() {
    //         var self = this;
    //         this.$el.html('');
    //         this.$el.append(this.$ul);
    //         this.$ul.html('');
    //         //this.collection.sort({silent:true});
    //         this.collection.each(function(doc){
    //             var view = self.getDocLayoutView(doc);
    //             self.appendRow(view);
    //         });
    //         this.$el.append(this.$pager);
    //         this.renderPager();
    //         this.trigger('resize');
    //         this.setElement(this.$el);
    //         return this;
    //     },
    //     renderPager: function() {
    //         var len = this.collection.length;
    //         var c = this.collection.count > len ? this.collection.count : len;
    //         this.$pager.find('.list-length').html(len);
    //         this.$pager.find('.list-count').html(c);
    //     },
    //     appendRow: function(row) {
    //         var rank = new Date(row.model.get('rank'));
    //         rank = rank.getTime();
    //         var rowEl = row.render().$el;
    //         if(this.currentFilter && !this.currentFilter(row.model)) {
    //             rowEl.hide();
    //         }
    //         rowEl.attr('data-sort-rank', rank);
    //         var d = false;
    //         var $lis = this.$ul.children();
    //         var last = $lis.last();
    //         var lastRank = parseInt(last.attr('data-sort-rank'), 10);
    //         if(rank > lastRank) {
    //             $lis.each(function(i,e){
    //                 if(d) return;
    //                 var r = parseInt($(e).attr('data-sort-rank'), 10);
    //                 if(rank > r) {
    //                     $(e).before(rowEl);
    //                     d = true;
    //                 }
    //             });
    //         }
    //         if(!d) {
    //             this.$ul.append(rowEl);
    //         }
    //     }
    // });
    
    var SelectListView = Backbone.View.extend({
        tagName: "select",
        className: "todoListSelect",
        initialize: function() {
            var self = this;
            this.$el.attr('name', 'todoList');
        },
        events: {
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append('<option value="" title="not part of a list">-no list-</option>');
            //this.collection.sort({silent:true});
            todoListsCollection.each(function(doc){
                self.$el.append('<option value="'+doc.id+'">'+doc.get('name')+'</option>');
            });
            if(this.elVal) {
                this.$el.val(this.elVal);
            }
            this.setElement(this.$el);
            return this;
        },
        val: function(v) {
            if(v || v === '') {
                this.elVal = v.id;
                this.$el.val(v.id);
            } else {
                var todo_list_id = this.$el.val();
                if(todo_list_id) {
                    var o = {
                        id: todo_list_id
                    }
                    var todo_list = todoListsCollection.get(todo_list_id);
                    if(todo_list) {
                        if(todo_list.has('name')) {
                            o.name = todo_list.get('name');
                        }
                        if(todo_list.has('slug')) {
                            o.slug = todo_list.get('slug');
                        }
                    }
                    return o;
                } else {
                    return false;
                }
            }
        }
    });
    
    var ActionFeedView = Backbone.View.extend({
        tagName: "span",
        className: "feed",
        render: function() {
            if(!this.model.has('feed')) {
                this.$el.html('<button class="publish">publish to feed</button>');
            } else {
                var feed = this.model.get('feed');
                this.$el.html('published at <a href="/feed/item/'+feed.id+'" target="_new">'+feed.at+'</a><button class="unpublish">remove from feed</button>');
            }
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click .publish": "publish",
          "click .unpublish": "unpublish",
        },
        publish: function() {
            var self = this;
            console.log(this.model);
            this.model.set({"feed": 0},{silent: true});
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.render();
            });
            return false;
        },
        unpublish: function() {
            var self = this;
            console.log(this.model);
            this.model.unset("feed", {silent: true});
            var saveModel = this.model.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.render();
            });
            return false;
        }
    });

    var RowView = Backbone.View.extend({
        tagName: "a",
        className: "list-group-item",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            // console.log(this.list);
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            // this.actions = new ActionsView({model: this.model});
            // this.$name = $('<span class="name"></span>');
            // this.$color = $('<span class="color"></span>');
            // this.$nameInput = $('<input type="text" name="name" class="form-control" />');
            // this.$colorInput = $('<input type="color" id="list-color" name="color" />'); ///  <label for="list-color">list color</label>
            // this.$progress = $();
            
            this.$header = $('<h4 class="list-group-item-heading row">\n\
                <span class="name"></span>\n\
                <span class="progress"><span class="doneCount"></span> / <span class="todosCount"></span></span>\n\
                <span class="listColor">&nbsp;</span>\n\
            </h4>');
            this.$text = $('<p class="list-group-item-text row">\n\
            </p>');
            
            var opts = {
                model: this.model, 
                actionOptions: {
                    fav: {fieldName: 'fav'},
                    // tags: {fieldName: 'tags'},
                    groups: {fieldName: 'groups'},
                    detail: true,
                    share: true,
                    collectionFriendlyName: 'list'
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
            this.actionsView.on('goToTagName', function(tagName){
                self.model.collection.view.tagsView.tagSelectView.selectTagByName(tagName);
            });
        },
        render: function() {
            var self = this;
            
            if(this.model.has('color')) {
                this.$header.find('.listColor').css('background-color', this.model.get('color'));
                // this.$el.css('border-left-color', this.model.get('color'));
                // this.$colorInput.val(this.model.get('color'));
            }
            if(this.model.get('name')) {
                this.$header.find('.name').html('<a href="'+this.model.getNavigatePath()+'">'+this.model.get('name')+'</a>');
                // this.$nameInput.val(this.model.get('name'));
            }
            if(this.model.has('doneCount')) {
                this.$header.find('.progress').find('.doneCount').text(this.model.get('doneCount'));
            }
            if(this.model.has('todosCount')) {
                this.$header.find('.progress').find('.todosCount').text(this.model.get('todosCount'));
            }
            
            this.$el.append(this.$header);
            this.$el.append(this.$text);
            this.$header.append(this.actionsView.render().$el);
            // this.$header.find('.left').append(this.$colorInput);
            // this.$el.append(this.$color);
            // this.$header.find('.center').append(this.$name);
            // this.$header.find('.center').append(this.$nameInput);
            //this.$el.append(this.$progress);
            // this.$header.find('.right').append(this.actions.render().$el);
            
            this.$el.attr('data-id', this.model.id);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select",
          "click .name": "selectName",
        //   "blur input[name=name]": "saveName",
        //   "keypress input[name=name]": "saveOnEnter",
        //   "change input[name=\"color\"]": "debounceChangeColor"
        },
        select: function(e) {
            var self = this;
            var $et = $(e.target);
            if($et.parents('.actions').length) {
            } else {
                this.$el.toggleClass("selected").toggleClass("active"); //.siblings().removeClass("active");
                this.$el.attr("selected", true);
                if(this.hasOwnProperty('list')) {
                    this.list.trigger('select', this);
                }
                this.trigger('select');
            }
        },
        selectName: function(e) {
            if(this.hasOwnProperty('list')) {
                console.log(this.list)
                this.list.trigger('selectName', this);
            }
            this.trigger('selectName');
            return false;
        },
        saveName: function() {
            var self = this;
            var t = this.$nameInput.val();
            if(t && t != this.model.get('name')) {
                this.model.set({'name': this.$nameInput.val()}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.model.trigger('change', self.model);
                    });
                }
            }
        },
        saveOnEnter: function(e) {
            if (e.keyCode == 13) {
                this.saveName();
            }
        },
        debounceChangeColor: _.debounce(function(e){
            this.changeColor(e);
        }, 500),
        changeColor: function(e) {
            var self = this;
            var $et = $(e.target);
            var color = $et.val();
            this.model.set({"color": color}, {silent: true});
            var s = this.model.save(null, {silent: false, wait: true});
            if(s) {
                s.done(function(s, typeStr, respStr) {
                    self.model.trigger('change', self.model);
                });
                s.fail(function(s, typeStr, respStr) {
                    if(s.status === 403) {
                        alert('You must sign in to do that!');
                    }
                });
            }
        },
        remove: function() {
          this.$el.remove();
        }
    });
    
    window.nl2br = function(str) {
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + "<br />");
    };
    
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
                this.$options.find('option[value="public"]').attr('selected','selected');
            } else {
                this.$el.val('private');
                this.$options.find('option[value="private"]').attr('selected','selected');
            }
            this.setElement(this.$el);
            return this;
        },
        val: function() {
            var groups = [];
            if(this.$el.val() == 'public') {
                groups = ['public'];
            }
            return groups;
        },
        events: {
        },
    });
    
    // var FormView = Backbone.View.extend({
    //     tagName: "div",
    //     className: "form",
    //     initialize: function() {
    //         var self = this;
    //         if(this.model && this.model.id) {
    //             this.$el.attr('data-id', this.model.id);
    //         } else {
    //             if(!this.model) {
    //                 this.model = new Model({}, {
    //                     collection: this.collection
    //                 });
    //             } else {
    //             }
    //         }
            
    //         this.$form = $('<form class="todoList"><div class="input-group"><input type="text" name="name" placeholder="New list name..." autocomplete="off" class="form-control" /><span class="input-group-btn"><input type="submit" value="Save" class="btn btn-default" /></span></div></form>');
    //         this.$inputName = this.$form.find('input');
    //     },
    //     render: function() {
    //         var self = this;
    //         if(this.$el.find('form').length === 0) {
    //             this.$el.append(this.$form);
    //         }
    //         if(this.model) {
    //             if(this.model.has('name')) {
    //                 this.$inputName.val(this.model.get('name'));
    //             }
    //         }
    //         this.setElement(this.$el);
    //         return this;
    //     },
    //     events: {
    //         "submit form": "submit"
    //     },
    //     submit: function() {
    //         var self = this;
    //         var setDoc = {};
    //         var name = this.$inputName.val();
    //         if(name !== '' && name !== this.model.get('name')) {
    //             setDoc.name = name;
    //         }
    //         console.log('setDoc')
    //         console.log(setDoc)
    //         this.model.set(setDoc, {silent: true});
    //         var saveModel = this.model.save(null, {
    //             silent: false ,
    //             wait: true
    //         });
    //         if(saveModel) {
    //             saveModel.done(function() {
    //                 self.trigger("saved", self.model);
    //                 self.collection.add(self.model);
    //             });
    //         } else {
    //             self.trigger("saved", self.model);
    //         }
    //         return false;
    //     },
    //     focus: function() {
    //         this.$inputName.focus();
    //     },
    //     remove: function() {
    //         this.$el.remove();
    //     }
    // });
    
    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "todo-form",
        initialize: function() {
            // console.log(this.options);
            // console.log(this.model);
            var self = this;
            // if(this.model && this.model.id) {
            //     this.$el.attr('data-id', this.model.id);
            // } else {
            //     if(!this.model) {
            //         this.model = new Model({}, {
            //             collection: this.collection
            //         });
            //     } else {
            //     }
            // }
            
            var formOpts = {
                collection: window.todosCollection,
                model: this.model,
                submit: 'Save',
                cancel: 'Cancel',
                delete: true
            };
            // formOpts.beforeSubmit = function(form){
            //     if(self.filteredByTodoList) {
            //         var todoList = self.filteredByTodoList;
            //         var setDoc = {};
            //         setDoc.list = {
            //             id: todoList.id,
            //             name: todoList.get('name')
            //         }
            //         form.model.set(setDoc, {silent: true});
            //     }
            // };
            formOpts.fields = {
                "name": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "next todo item",
                    className: "form-control"
                },
                "color": {
                    validateType: 'color',
                    label: "Color"
                    // tagName: 'textarea',
                    // placeholder: "details",
                    // className: "form-control"
                },
                // "dueAt": {
                //     validateType: 'date',
                //     // tagName: 'textarea',
                //     // placeholder: "details",
                //     className: "form-control",
                //     label: "Due Date"
                // }
            }
            self.todosFormView = window.todosCollection.getNewFormView(formOpts);
            self.todosFormView.on('saved', function(todo){
                self.trigger('saved', todo);
            });
            self.todosFormView.on('cancelled', function(todo){
                self.trigger('saved', todo);
            });
            self.todosFormView.on('deleted', function(todo){
                self.trigger('saved', todo);
            });
        },
        render: function() {
            var self = this;
            
            this.$el.append(self.todosFormView.render().$el);
            
            this.setElement(this.$el);
            return this;
        },
        events: {
            // "submit form": "submit"
        },
        // submit: function() {
        //     var self = this;
        // },
        // clear: function() {
        //     this.$inputTitle.val('');
        // },
        focus: function() {
            this.todosFormView.focus('name');
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    if(define) {
        define(function () {
            return {
                Collection: Collection,
                Model: Model,
                List: ListView,
                Row: RowView,
                Form: FormView
            }
        });
    }
})();