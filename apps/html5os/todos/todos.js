(function() {
    
    var Model = Backbone.House.Model.extend({
        collectionName: "todos",
        // url: '/api/todos',
        initialize: function(attr, options) {
            this.TableRowView = RowView;
            this.RowView = RowView;
            this.AvatarView = RowView;
            this.FullView = RowView;
            this.FormView = FormView;
            options = options || {};
            options.ownerFieldName = 'owner';
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
            this.statusNames = { 0: "todo", 1: "done" };
        },
        defaults: function() {
          return {
            done:  0
          };
        },
        getStatus: function() {
            return this.statusNames[this.get("done")];
        },
        toggle: function() {
            var self = this;
            this.set({'done': Math.abs(this.get("done")-1)}, {silent: true});
            var saveModel = this.save(null, {
                silent: false,
                wait: true
            });
            saveModel.done(function() {
                self.renderViews();
            });
        },
        getList: function(callback) {
            if(this.has('list')) {
                var listDoc = this.get('list');
                // console.log(listDoc);
                if(listDoc && listDoc.id) {
                    if(!window.todoListsCollection) {
                        window.todoListsCollection = new Collection();
                    }
                    window.todoListsCollection.getOrFetch(listDoc.id, function(todoList){
                        // console.log(todoList);
                        if(todoList) {
                            callback(todoList)
                        } else {
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            }
        },
    });
    
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'todos',
        url: '/api/todos',
    });

    var RowView = Backbone.View.extend({
        tagName: "a",
        className: "todo list-group-item",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            
            this.$check = $('<a class="check glyphicon" href="#"></a>');
            this.$title = $('<a class="title" href="#"></a>');
            this.$listRef = $('<span class="listRef"></span>');
            
            this.$titleInput = $('<input type="text" name="title" class="form-control" />');
            this.$dueAtInput = $('<span class="due"><span class="dueAt"></span></span>');
            //this.$dueAtTimeInput = $('<input name="dueAt-time" type="time" />');
            
            // if(window.todoListsCollection) {
            //     this.selectTodoListView = todoListsCollection.getSelectView({todo: this.model});
            // }
            this.$header = $('<h4 class="list-group-item-heading row">\n\
    <span class="doneCheck"></span>\n\
    <span class="titleInput"></span>\n\
    <span class="listColor">&nbsp;</span>\n\
    <span class="listInfo"></span>\n\
</h4>');
            this.$text = $('<p class="list-group-item-text row">\n\
    <span class="moreInfo"></span>\n\
</p>');
            
            this.$header.find('.doneCheck').append(this.$check);
            this.$header.find('.titleInput').append(this.$title);
            // this.$header.find('.titleInput').append(this.$titleInput);
            this.$header.append(this.$dueAtInput);
            // this.$text.find('.moreInfo').append(this.$dueAtDateInput);
        },
        render: function() {
            var self = this;
            // this.$el.append(this.$a);
            // console.log('render todo row');
            if(this.model.get('done')) {
                // this.$check.attr('checked', 'checked');
                this.$check.addClass('glyphicon-check').removeClass('glyphicon-unchecked');
            } else {
                // this.$check.removeAttr('checked');
                this.$check.removeClass('glyphicon-check').addClass('glyphicon-unchecked');
            }
            this.$el.append(this.$header);
            this.$el.append(this.$text);
            if(this.model.get('title')) {
                // this.$header.append(this.model.get('title'));
                this.$title.text(this.model.get('title'));
                this.$titleInput.val(this.model.get('title'));
            }
            
            if(this.model.has('dueAt')) {
                var m = moment(this.model.get('dueAt'));
                // this.$dueAtDateInput.val(m.format('YYYY-MM-DD'));
                //this.$dueAtTimeInput.val(m.format('HH:mm'));
                this.$dueAtInput.addClass('label').addClass('label-default');
                // this.$dueAtInput.find('.dueAt').html(m.calendar());
                var diff = m.diff(moment());
                if(diff < 0) {
                    this.$dueAtInput.find('.dueAt').html(m.fromNow());
                } else {
                    this.$dueAtInput.find('.dueAt').html(m.fromNow(true));
                }
                this.$dueAtInput.attr('title', m.format('YYYY-MM-DD'));
                this.$dueAtInput.attr('data-at', m);
                
                if(diff < 0) {
                    this.$dueAtInput.removeClass('label-default').removeClass('label-warning').addClass('label-danger');
                } else if(diff < 2000 * 60 * 60 * 24) {
                    this.$dueAtInput.removeClass('label-default').removeClass('label-danger').addClass('label-warning');
                }
                this.$dueAtInput.show();
            } else {
                this.$dueAtInput.hide();
            }
            
            if(this.model.has('list')) {
                var list = this.model.get('list');
                // console.log(list);
                if(list) {
                    this.$listRef.attr('data-id', list.id);
                    this.$listRef.text(list.name);
                    // this.selectTodoListView.val(this.model.get('list'));
                    this.$header.find('.listInfo').addClass('label label-default');
                    // improve the list data from src
                    this.model.getList(function(list){
                        
                        if(list) {
                            list.on('change', function(){
                                self.render();
                            });
                            
                            var $listA = '<a href="'+list.getNavigatePath()+'">'+list.get('name')+'</a>';
                            self.$listRef.html($listA);
                            
                            if(list.has('color')) {
                                self.$el.find('.listColor').css('background-color', list.get('color'));
                                self.$check.addClass('inverse');
                            } else {
                                self.$check.removeClass('inverse');
                            }
                        } else {
                            
                        }
                    });
                } else {
                    this.$listRef.removeAttr('data-id');
                    this.$listRef.text('');
                    this.$header.find('.listInfo').removeClass('label label-default');
                    // this.selectTodoListView.val('');
                }
            } else {
                this.$listRef.removeAttr('data-id');
                this.$listRef.text('');
                this.$header.find('.listInfo').removeClass('label label-default');
                // this.selectTodoListView.val('');
            }
            
            // this.$el.append(this.$check);
            this.$header.find('.listInfo').html(this.$listRef);
            // this.$text.find('.listInfo').append(this.selectTodoListView.render().$el);
            
            this.$el.attr('data-id', this.model.id);
            this.setElement(this.$el);
            return this;
        },
        expand: function(expand) {
            if(expand === false) {
                this.$el.removeClass('expanded');
            } else {
                this.$el.toggleClass('expanded');
            }
        },
        isSelected: function() {
            return (this.$el.hasClass('selected'));
        },
        events: {
        //   "click input[type=checkbox]" : "toggleDone",
          "click .check" : "toggleDone",
          "click a.title": "clickTitle",
          "click": "select",
          "click .listRef a": "selectTodoList",
        //   "change input[name=dueAt-date]": "changeDueDate",
        //   "change select.todoListSelect": "changeTodoList"
        },
        select: function(e) {
            this.$el.toggleClass("selected").toggleClass("active"); //.siblings().removeClass("active");
            this.$el.attr("selected", true);
            if(this.hasOwnProperty('list')) {
                this.list.trigger('select', this);
            }
            this.trigger('select');
        },
        clickTitle: function(e) {
            if(this.hasOwnProperty('list')) {
                this.list.trigger('clickTodoTitle', this);
            }
            return false;
        },
        selectTodoList: function(e) {
            var self = this;
            this.model.getList(function(list){
                if(self.hasOwnProperty('list')) {
                    self.list.trigger('selectTodoList', list);
                }
                self.trigger('selectTodoList', list);
            });
            return false;
        },
        toggleDone: function(e) {
            this.model.toggle();
            // e.stopPropagation();
            return false;
        },
        changeDueDate: function() {
            var self = this;
            console.log(this.$dueAtDateInput);
            
            var atDate = this.$dueAtDateInput.val();
            var atTime = '00:00';//this.$inputAtTime.val();
            
            if(atDate && atTime) {
                var formDate = moment(atDate+' '+atTime, "YYYY-MM-DD HH:mm");
                var at = new Date(this.model.get('at'));
                if(formDate && at.getTime() !== formDate.toDate().getTime()) {
                    //setDoc.at = formDate.toDate();
                    this.model.set({'dueAt': formDate.toDate()}, {silent: true});
                    var saveModel = this.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.render();
                        });
                    }
                }
            }
        },
        changeTodoList: function(e) {
            var self = this;
            //console.log(this.selectTodoListView.val());
            var list = this.selectTodoListView.val();
            if(list) {
                this.model.set({'list': list}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                }
            } else {
                this.model.unset('list', {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
        },
        remove: function() {
          this.$el.remove();
        }
    });
    
    window.nl2br = function(str) {
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + "<br />");
    };
    
    // var TodoListSelectListView = window.todoListsCollection.get
    
    // Backbone.House.SelectListFieldView.extend({
    //     initialize: function(options) {
    //         var self = this;
    //         this.options.titleField = this.options.titleField || 'title';
    //         this.collection = window.todoListsCollection
    //     },
    //     val: function(v) {
    //         alert(v);
    //         return v;
    //     }
    // });
    
    // var TodoListSelectListView = Backbone.View.extend({
    //     tagName: "select",
    //     className: "select",
    //     initialize: function(options) {
    //         var self = this;
    //         this.options.titleField = this.options.titleField || 'title';
    //     },
    //     events: {
    //     },
    //     render: function() {
    //         var self = this;
    //         this.$el.html('');
    //         this.$el.append('<option></option>');
    //         //this.collection.sort({silent:true});
    //         this.collection.each(function(doc){
    //             self.$el.append('<option value="'+doc.id+'">'+doc.get(self.options.titleField)+'</option>');
    //         });
    //         this.setElement(this.$el);
    //         return this;
    //     },
    //     val: function(v) {
    //         if(v) {
    //             this.$el.val(v.id);
    //         } else {
    //             var doc_id = this.$el.val();
    //             if(doc_id) {
    //                 var doc = this.collection.get(doc_id);
    //                 var p = {
    //                     id: doc_id
    //                 }
    //                 p.title = doc.title;
    //                 if(post.has('slug')) {
    //                     p.slug = post.get('slug');
    //                 }
    //                 if(post.has('seq')) {
    //                     p.seq = post.get('seq');
    //                 }
    //                 if(post.has('youtube') && post.get('youtube').id) {
    //                     p.youtube = post.get('youtube');
    //                 }
    //                 return p;
    //             } else {
    //                 return false;
    //             }
    //         }
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
            
            var todoListSelectView = window.todoListsCollection.getNewSelectList({titleField: 'name'});
            
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
                "title": {
                    validateType: 'string',
                    autocomplete: "off",
                    placeholder: "next todo item",
                    className: "form-control"
                },
                "desc": {
                    validateType: 'string',
                    tagName: 'textarea',
                    placeholder: "details",
                    className: "form-control"
                },
                "dueAt": {
                    validateType: 'date',
                    // tagName: 'textarea',
                    // placeholder: "details",
                    className: "form-control",
                    label: "Due Date"
                },
                "list": {
                    fieldView: todoListSelectView, //TodoListSelectListView,
                    className: "form-control",
                }
            }
            self.todosFormView = window.todosCollection.getFormView(formOpts);
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
        // focus: function() {
        //     this.$inputTitle.focus();
        // },
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