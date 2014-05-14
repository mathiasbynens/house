(function() {
    var MenuItemReview = Backbone.House.Model.extend({
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
    var MenuItemReviewCollection = Backbone.House.Collection.extend({
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
        comparator: function(a) {
            return a.get("at");
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
    if (define) {
        define(function() {
            return {
                Collection: MenuItemReviewCollection,
                Model: MenuItemReview,
                Form: MenuItemReviewForm
            };
        });
    }
})();