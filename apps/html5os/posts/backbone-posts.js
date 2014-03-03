(function() {
    
    var Model = Backbone.House.Model.extend({
        collectionName: "posts",
        initialize: function(attr, options) {
            this.TableRowView = TableRowView;
            this.RowView = RowView;
            this.AvatarView = AvatarView;
            this.FullView = FullView;
            options = options || {};
            options.ownerFieldName = 'owner';
            
            if(attr.tags) {
                for(var t in attr.tags) {
                    if(attr.tags[t].id) {
                        if(tagsCollection && !tagsCollection.get(attr.tags[t].id)) {
                            tagsCollection.add(attr.tags[t]);
                        }
                    }
                }
            }
            
            Backbone.House.Model.prototype.initialize.apply(this, arguments);
        },
        slugStr: function(str) {
            return str.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
        },
        setSlug: function(slug) {
            this.set('slug', this.slugStr(slug));
        },
        getNavigatePath: function() {
            if(this.has('slug')) {
                return this.get('slug');
            } else {
                return 'id/'+this.id;
            }
        }
    });
    
    var Collection = Backbone.House.Collection.extend({
        model: Model,
        collectionName: 'posts',
        url: '/api/posts',
        sortField: 'at-',
        getOrFetchSlug: function(slug, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({slug:slug}));
            if(doc) {
                callback(doc);
            } else {
                var options = { "slug": slug };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = _.first(self.where({slug:slug}));
                            callback(doc);
                        } else {
                            callback(false);
                        }
                    },
                    error: function(collection, response){
                        callback(false);
                    }
                });
            }
        },
        getOrFetchSeq: function(seq, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({seq:seq}));
            if(doc) {
                callback(doc);
            } else {
                var options = { "seq": seq };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = _.first(self.where({seq:seq}));
                            callback(doc);
                        } else {
                            callback(false);
                        }
                    },
                    error: function(collection, response){
                        callback(false);
                    }
                });
            }
        },
        getSelectView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("selectView")) {
                options.collection = this;
                this.selectView = new SelectListView(options);
                this.selectView.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.selectView;
        },
    });
    
    // var ListView = Backbone.View.extend({
    //     layout: 'row',
    //     initialize: function() {
    //         var self = this;
    //         self.loading = false;
    //         this.$pager = $('<div class="list-pager container text-center">showing <span class="list-length"></span> of <span class="list-count"></span> posts</div>');
    //         var $ul = this.$ul = $('<div class="postList"></div>');
    //         this.collection.on('add', function(doc) {
    //             var view;
    //             if(self.layout === 'row') {
    //                 view = doc.getRow({list: self});
    //             } else if(self.layout === 'avatar') {
    //                 view = doc.getAvatar({list: self});
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
            
    //         $(window).scroll(function(){
    //             if(self.$el.is(":visible")) {
    //               if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()){
    //                 self.loading = true;
    //                 self.loadMore();
    //               }
    //             }
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
    //         var rank = new Date(row.model.get('at'));
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
        className: "selectPost",
        initialize: function() {
            var self = this;
        },
        events: {
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append('<option></option>');
            //this.collection.sort({silent:true});
            postsCollection.each(function(doc){
                self.$el.append('<option value="'+doc.id+'">'+doc.get('title')+'</option>');
            });
            this.setElement(this.$el);
            return this;
        },
        val: function(v) {
            if(v) {
                this.$el.val(v.id);
            } else {
                var post_id = this.$el.val();
                if(post_id) {
                    var post = postsCollection.get(post_id);
                    var p = {
                        id: post_id
                    }
                    if(post.has('title')) {
                        p.title = post.get('title');
                    }
                    if(post.has('slug')) {
                        p.slug = post.get('slug');
                    }
                    if(post.has('seq')) {
                        p.seq = post.get('seq');
                    }
                    if(post.has('youtube') && post.get('youtube').id) {
                        p.youtube = post.get('youtube');
                    }
                    return p;
                } else {
                    return false;
                }
            }
        }
    });
    
    var ActionsView = Backbone.View.extend({
        tagName: "span",
        className: "actions",
        render: function() {
            var self = this;
            this.$el.html('');
            //self.$el.append(this.tagsView.render().$el);
            //self.$el.append(this.groupsView.render().$el);
            self.$el.append(this.editView.render().$el);
            // self.$el.append(this.deleteView.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.actions = [];
            //this.groupsView = new GroupsView({id: this.id, model: this.model});
            //this.tagsView = new TagsView({id: this.id, model: this.model});
            // this.deleteView = new ActionDeleteView({id: this.id, model: this.model});
            this.editView = new ActionEditView({id: this.id, model: this.model});
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

    var ActionDeleteView = Backbone.View.extend({
        tagName: "span",
        className: "delete",
        render: function() {
            this.$el.html('<button class="btn btn-danger glyphicon glyphicon-trash"> </button>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click button": "select",
        },
        select: function() {
            var self = this;
            if(confirm("Are you sure that you want to delete this post?")) {
                this.model.destroy({success: function(model, response) {
                  window.history.back(-1);
                }, 
                errorr: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            }
            return false;
        }
    });
    
    var ActionEditView = Backbone.View.extend({
        tagName: "span",
        className: "edit",
        render: function() {
            this.$el.html('<button class="btn btn-primary glyphicon glyphicon-edit"> Edit</button>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click button": "select",
        },
        select: function() {
            var self = this;
            
             this.model.collection.trigger('editModel', this.model);
            
            return false;
        }
    });
    
    var TagsView = Backbone.View.extend({
        tagName: "span",
        className: "tags",
        render: function() {
            this.$el.html('');
            var tags = this.model.get("tags");
            if(tags) {
                for(var i in tags) {
                    var tagName = tags[i];
                    if(!_.isString(tagName)) {
                        var $btn = $('<button class="tag">'+tagName+'</button>');
                        $btn.attr('data-tag', JSON.stringify(tagName));
                        this.$el.append($btn);
                    } else {
                        this.$el.append('<button class="tag">'+tagName+'</button>');
                    }
                }
            }
            this.$el.append('<button class="newTag">+ tag</button>');
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click .newTag": "newTag",
          "click .tag": "removeTag"
        },
        removeTag: function(e) {
            var self = this;
            if(confirm("Are you sure that you want to remove this tag?")) {
                var tags = this.model.get("tags");
                var $tag = $(e.target);
                var tagName = '';
                if($tag.attr('data-tag')) {
                    tagName = JSON.parse($tag.attr('data-tag'));
                } else {
                    tagName = e.target.innerHTML;
                }
                this.model.pull({"tags": tagName}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        newTag: function() {
            var self = this;
            var tagName = prompt("Enter tags, separated, by commas.");
            if(tagName) {
                tagName = tagName.split(',');
                for(var i in tagName) {
                    var tag = tagName[i];
                    tagName[i] = tag.trim(); // trim extra white space
                }
                if(tagName) {
                    if(!this.model.has("tags")) {
                        this.model.set({'tags': tagName}, {silent: true});
                        var saveModel = this.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        saveModel.done(function() {
                            console.log('tags saved');
                        });
                    } else {
                        this.model.pushAll({"tags": tagName}, {silent: true});
                        var saveModel = this.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        saveModel.done(function() {
                            self.render();
                        });
                    }
                }
            }
        }
    });

    var GroupsView = Backbone.View.extend({
        tagName: "span",
        className: "groups",
        initialize: function() {
        },
        render: function() {
            this.$el.html('');
            var groups = this.model.get("groups");
            if(groups) {
                for(var i in groups) {
                    var groupName = groups[i];
                    this.$el.append('<button class="group">'+groupName+'</button>');
                }
                if(groups.indexOf('public') === -1) {
                    this.$el.append('<button class="publicGroup">+ public</button>');
                }
                if(groups && groups.length > 0) {
                    this.$el.append('<button class="privateGroup">+ private</button>');
                }
            }
            this.$el.append('<button class="newGroup">+ group</button>');
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click .newGroup": "newGroup",
          "click .group": "removeGroup",
          "click .publicGroup": "publicGroup",
          "click .privateGroup": "privateGroup"
        },
        privateGroup: function() {
            var self = this;
            if(confirm("Are you sure that you want to make this private?")) {
                this.model.set({"groups": []}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        publicGroup: function() {
            var self = this;
            if(confirm("Are you sure that you want to make this public?")) {
                this.model.push({"groups": "public"}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        removeGroup: function(e) {
            var self = this;
            if(confirm("Are you sure that you want to remove this group?")) {
                var groups = this.model.get("groups");
                var name = e.target.innerHTML;
                this.model.pull({"groups": name}, {silent: true});
                var saveModel = this.model.save(null, {
                    silent: false,
                    wait: true
                });
                saveModel.done(function() {
                    self.render();
                });
            }
        },
        newGroup: function() {
            var self = this;
            var groupName = prompt("Enter groups, separated, by commas.");
            if(groupName) {
                groupName = groupName.split(',');
                
                for(var i in groupName) {
                    var g = groupName[i];
                    groupName[i] = g.trim(); // trim extra white space
                }
                if(groupName) {
                    if(!this.model.get("groups")) {
                        this.model.set({'groups': groupName}, {silent: true});
                    } else {
                        this.model.pushAll({"groups": groupName}, {silent: true});
                    }
                    var saveModel = this.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
        }
    });


    var RowView = Backbone.View.extend({
        tagName: "div",
        className: "post row",
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            //this.actions = new ActionsView({id: this.id, model: this.model});
            this.tagListView = this.model.getTagsList();
            this.tagListView.on('selectedTagName', function(tagName) {
                if(self.list) {
                    self.list.trigger('goToTagName', tagName);
                }
            });
        },
        render: function() {
            var self = this;
            this.$el.html('');
            var $byline = $('<div class="entry-meta col-md-8 col-md-offset-2"></div>');
            var $permalink = $('<a href="'+this.model.getNavigatePath()+'" title="Permalink" rel="bookmark"><time class="entry-date" datetime="2013-09-17T09:36:07+00:00"></time></a>');
            var $at = $('<span class="date"><span class="glyphicon glyphicon-time"></span> </span>');
            $at.append($permalink);
            $byline.append($at);
            
            
            if(this.model.get('avatar')) {
                var avatarImage = this.model.get('avatar');
                var $avatarImg = $('<img class="avatar" src="/api/files/'+encodeURIComponent(avatarImage.filename)+'" />');
                this.$el.append($avatarImg);
            }
            
            if(this.model.has('title')) {
                this.$el.append('<div class="entry-header col-md-8 col-md-offset-2"><h1 class="entry-title"><a href="'+this.model.getNavigatePath()+'">'+this.model.get('title')+'</a></h1></div>');
                $permalink.attr('title', 'Permalink to '+this.model.get('title'));
            }
            if(this.model.has('at')) {
                if(window.clock) {
                    var m = clock.moment(this.model.get('at'));
                    $permalink.find('time').attr('datetime', m.format("YYYY-MM-DDTHH:mm:ssZZ"));
                    $at.attr('title', m.format('LLLL'));
                    $permalink.find('time').html(m.calendar());
                } else {
                    $permalink.find('time').html(this.model.get('at'));
                }
            }
            
            $byline.append(this.tagListView.render().$el);
            // if(this.model.has('tags')) {
                
            //     var $tags = $('<span class="tags-links"><span class="glyphicon glyphicon-tag"></span> </span>');
            //     var tags = this.model.get('tags');
            //     for(var t in tags) {
            //         var tag = tags[t];
            //         console.log(tag)
            //         if(typeof tag === 'string') {
            //             $tags.append('<a href="tag/'+tag+'" data-tag="'+tag+'" rel="tag">'+tag+'</a>');
            //         } else {
            //             if(tag.color) {
            //                 $tags.find('.glyphicon-tag').css('color', tag.color);
            //             }
            //             $tags.append('<a href="tag/'+tag.name+'" data-tag="'+tag.name+'" rel="tag">'+tag.name+'</a>');
            //         }
            //         if(tags.length > 1 && t < tags.length-1) {
            //             $tags.append(', ');
            //         }
            //     }
            //     $byline.append($tags);
            // }
            if(this.model.has('owner')) {
                $byline.append('<span class="author vcard"><span class="glyphicon glyphicon-user"></span> <a class="url fn n" href="by/'+this.model.get('owner').name+'" title="View all posts by '+this.model.get('owner').name+'" rel="author">'+this.model.get('owner').name+'</a></span>');
                this.model.getOwner(function(owner){
                    self.author = owner;
                    if(owner) {
                    }
                });
            }
            
            if(this.model.has('msg')) {
                var $msg = $('<div class="msg col-md-8 col-md-offset-2"></div>');
                var msgStr = this.model.get('msg');
                var msgStrTxt = nl2br($('<span>'+br2nl(msgStr)+'</span>').text());
                var trimLen = 555;
                if(msgStrTxt.length > trimLen) {
                    msgStr = msgStrTxt.substr(0, trimLen);
                    msgStr += '... <a href="#" class="readMore">Read more</a>'; // strip html
                }
                $msg.html(msgStr);
                this.$el.append($msg);
            }
            
            if(this.model.has('youtube')) {
                var yt = this.model.get('youtube');
                if(yt.id) {
                    var ytid = yt.id;
                    //this.$el.append('<span class="youtube col-md-8 col-md-offset-2"><img class="thumbnail" src="//i1.ytimg.com/vi/'+ytid+'/hqdefault.jpg"></span>');
                    $msg.prepend('<img class="thumbnail" src="//i1.ytimg.com/vi/'+ytid+'/hqdefault.jpg">');
                }
            }
            
            this.$el.append($byline);
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .readMore": "clickReadMore",
          "click": "select",
          "click .entry-title a": "goToDetail",
          "click .date a": "goToDetail",
          "click a.readMore": "goToDetail",
          "click img.thumbnail": "goToDetail",
          "click .avatar": "goToDetail",
          "click .author a": "clickAuthor",
          "click .tags-links a": "clickTag"
        },
        goToDetail: function() {
            this.model.collection.trigger('goToNavigatePath', this.model);
            return false;
        },
        clickReadMore: function(e) {
            this.select();
            return false;
        },
        clickAuthor: function(e) {
            if(this.author) {
                if(this.hasOwnProperty('list')) {
                    this.list.trigger('goToAuthor', this.author);
                }
                this.trigger('goToAuthor', this.author);
            }
            return false;
        },
        clickTag: function(e) {
            var $et = $(e.target);
            if($et.attr('data-tag')) {
                this.list.trigger('goToTag', $et.attr('data-tag'));
            }
            return false;
        },
        select: function(e) {
            // var deselectSiblings = function(el) {
            //     el.siblings().removeClass('selected');
            //     el.siblings().removeAttr('selected');
            // }
            // deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            if(this.hasOwnProperty('list')) {
                this.list.selectedPost = this;
                this.list.trigger('select', this);
            }
            this.trigger('select');
            this.trigger('resize');
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var TableRowView = Backbone.View.extend({
        tagName: "tr",
        className: "post",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            //this.actions = new ActionsView({id: this.id, model: this.model});
            
            this.$tdIcon = $('<td class="icon"></td>');
            this.$tdTitle = $('<td class="title"></td>');
            this.$tdAt = $('<td class="at"></td>');
            this.$tdActions = $('<td class="actions"></td>');
            
            var opts = {
                className: 'actions',
                model: this.model, 
                actionOptions: {
                    fav: {fieldName: 'fav'},
                    tags: {fieldName: 'tags'},
                    groups: {fieldName: 'groups'},
                    detail: false
                }
            }
            this.modelActions = new utils.ModelActionsView(opts);
        },
        render: function() {
            var self = this;
            this.$el.append(this.$tdIcon);
            this.$el.append(this.$tdTitle);
            this.$el.append(this.$tdAt);
            this.$el.append(this.$tdActions);
            this.$tdActions.html(this.modelActions.render().$el);
            var $permalink = $('<a href="'+this.model.getNavigatePath()+'" title="Permalink" rel="bookmark"><time class="entry-date" datetime="2013-09-17T09:36:07+00:00"></time></a>');
            this.$tdAt.html($permalink);
            
            if(this.model.get('avatar')) {
                var avatarImage = this.model.get('avatar');
                var $avatarImg = $('<img class="avatar" src="/api/files/'+encodeURIComponent(avatarImage.filename)+'" />');
                this.$tdIcon.html($avatarImg);
            }
            
            if(this.model.has('title')) {
                this.$tdTitle.html('<div class=""><h1 class="entry-title"><a href="'+this.model.getNavigatePath()+'">'+this.model.get('title')+'</a></h1></div>');
                $permalink.attr('title', 'Permalink to '+this.model.get('title'));
            }
            if(this.model.has('at')) {
                if(window.clock) {
                    var m = clock.moment(this.model.get('at'));
                    $permalink.find('time').attr('datetime', m.format("YYYY-MM-DDTHH:mm:ssZZ"));
                    this.$tdAt.attr('title', m.format('LLLL'));
                    $permalink.find('time').html(m.calendar());
                } else {
                    $permalink.find('time').html(this.model.get('at'));
                }
            }
            // if(this.model.has('tags')) {
            //     var $tags = $('<span class="tags-links"><span class="glyphicon glyphicon-tag"></span> </span>');
            //     var tags = this.model.get('tags');
            //     for(var t in tags) {
            //         var tag = tags[t];
            //         $tags.append('<a href="tag/'+tag+'" data-tag="'+tag+'" rel="tag">'+tag+'</a>');
            //         if(tags.length > 1 && t < tags.length-1) {
            //             $tags.append(', ');
            //         }
            //     }
            //     $byline.append($tags);
            // }
            // if(this.model.has('owner')) {
            //     $byline.append('<span class="author vcard"><span class="glyphicon glyphicon-user"></span> <a class="url fn n" href="by/'+this.model.get('owner').name+'" title="View all posts by '+this.model.get('owner').name+'" rel="author">'+this.model.get('owner').name+'</a></span>');
            //     this.model.getOwner(function(owner){
            //         self.author = owner;
            //         if(owner) {
            //         }
            //     });
            // }
            
            // if(this.model.has('msg')) {
            //     var $msg = $('<div class="msg col-md-8 col-md-offset-2"></div>');
            //     var msgStr = this.model.get('msg');
            //     var msgStrTxt = nl2br($('<span>'+br2nl(msgStr)+'</span>').text());
            //     var trimLen = 555;
            //     if(msgStrTxt.length > trimLen) {
            //         msgStr = msgStrTxt.substr(0, trimLen);
            //         msgStr += '... <a href="#" class="readMore">Read more</a>'; // strip html
            //     }
            //     $msg.html(msgStr);
            //     this.$el.append($msg);
            // }
            
            if(this.model.has('youtube')) {
                var yt = this.model.get('youtube');
                if(yt.id) {
                    var ytid = yt.id;
                    //this.$el.append('<span class="youtube col-md-8 col-md-offset-2"><img class="thumbnail" src="//i1.ytimg.com/vi/'+ytid+'/hqdefault.jpg"></span>');
                    this.$tdIcon.html('<img src="//i1.ytimg.com/vi/'+ytid+'/hqdefault.jpg">');
                }
            }
            
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .readMore": "clickReadMore",
          "click .entry-title a": "goToDetail",
          "click .at a": "goToDetail",
          "click .icon": "goToDetail",
          "click .author a": "clickAuthor",
          "click .tags-links a": "clickTag",
          "click": "select",
        },
        goToDetail: function() {
            this.model.collection.trigger('goToNavigatePath', this.model);
            return false;
        },
        clickReadMore: function(e) {
            this.select();
            return false;
        },
        clickAuthor: function(e) {
            if(this.author) {
                if(this.hasOwnProperty('list')) {
                    this.list.trigger('goToAuthor', this.author);
                }
                this.trigger('goToAuthor', this.author);
            }
            return false;
        },
        clickTitle: function(e) {
            e.preventDefault();
        },
        clickTag: function(e) {
            var $et = $(e.target);
            if($et.attr('data-tag')) {
                this.trigger('goToTag', $et.attr('data-tag'));
            }
            return false;
        },
        select: function(e) {
            this.$el.toggleClass("selected");
            this.$el.attr("selected", true);
            if(this.hasOwnProperty('list')) {
                this.list.selectedPost = this;
                this.list.trigger('select', this);
            }
            this.trigger('select');
            this.trigger('resize');
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var FullView = Backbone.View.extend({
        tagName: "div",
        className: "fullView container",
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            
            this.$avatarImg = $('<img class="avatar" src>');
            this.$msg = $('<div class="msg col-md-8 col-md-offset-2"></div>');
            this.$entryMeta = $('<div class="entry-meta col-md-8 col-md-offset-2"></div>');
            this.$at = $('<span class="date glyphicon glyphicon-time"></span>');
            this.$author = $('<span class="author vcard glyphicon glyphicon-user"></span>');
            this.$tags = $('<span class="listOfTags"></span>');
            this.$actions = $('<span class="actions"></span>');
            this.$youtube = $('<span class="youtube col-md-8 col-md-offset-2"></span>');
            this.$tweet = $('<div class="tweet col-md-8 col-md-offset-2"></div>');
            
            if(this.$el.find('.headerMedia').length) {
                this.$headerMedia = this.$el.find('.headerMedia');
                if(this.$headerMedia.find('img').length) {
                    this.$avatarImg = this.$headerMedia.find('img');
                }
            } else {
                this.$headerMedia = $('<div class="headerMedia"></div>');
            }
            if(this.$el.find('.entry-header').length) {
                this.$entryHeader = this.$el.find('.entry-header');
            } else {
                this.$entryHeader = $('<div class="entry-header col-md-8 col-md-offset-2"><h1 class="entry-title"></h1></div>');
            }
            if(this.$el.find('.msg').length) {
                this.$msg = this.$el.find('.msg');
            }
            if(this.$el.find('.entry-meta').length) {
                this.$entryMeta = this.$el.find('.entry-meta');
                if(this.$entryMeta.find('.date').length) {
                    this.$at = this.$entryMeta.find('.date');
                }
                if(this.$entryMeta.find('.author').length) {
                    this.$author = this.$entryMeta.find('.author');
                }
                if(this.$entryMeta.find('.listOfTags').length) {
                    this.$tags = this.$entryMeta.find('.listOfTags');
                }
            }
            if(this.$el.find('.youtube').length) {
                this.$youtube = this.$el.find('.youtube');
            }
            if(this.$el.find('.tweet').length) {
                this.$tweet = this.$el.find('.tweet');
            }
            if(this.$el.find('.actions').length) {
                this.$actions = this.$el.find('.actions');
            }
            this.tagListView = this.model.getTagsList({el: this.$tags});
            this.tagListView.on('selectedTagName', function(tagName) {
                if(self.list) {
                    self.list.trigger('goToTagName', tagName);
                }
            });
            
            this.actions = new ActionsView({id: this.id, model: this.model, el: this.$actions});
        },
        render: function() {
            var self = this;
            this.setElement(this.$el);
            // this.$el.html('');
            if(this.model.get('avatar')) {
                var avatarImage = this.model.get('avatar');
                // console.log(this.$avatarImg.attr('src'))
                if(this.$avatarImg.attr('src').indexOf('/api/files/'+encodeURIComponent(avatarImage.filename)) === -1) {
                    this.$avatarImg.attr('src', '/api/files/'+encodeURIComponent(avatarImage.filename));
                    this.$headerMedia.append(this.$avatarImg);
                }
                this.$el.append(this.$headerMedia);
            } else {
                console.log('remove headerMedia')
                console.log(this.$headerMedia);
                // this.$headerMedia.remove();
                this.$el.find('.headerMedia').remove();
            }
            this.$el.append(this.$entryHeader);
            var $permalink = $('<a href="'+this.model.getNavigatePath()+'" title="Permalink" rel="bookmark"><time class="entry-date" datetime="2013-09-17T09:36:07+00:00"></time></a>');
            this.$at.html($permalink);
            this.$entryMeta.append(this.$at);
            this.$entryMeta.append(this.$author);
            this.$entryMeta.append(this.tagListView.render().$el);
            if(this.model.has('title')) {
                // this.$el.append('<div class="entry-header col-md-8 col-md-offset-2"><h1 class="entry-title"><a href="'+this.model.getNavigatePath()+'">'+this.model.get('title')+'</a></h1></div>');
                this.$entryHeader.find('.entry-title').html('<a href="'+this.model.getNavigatePath()+'">'+this.model.get('title')+'</a>');
                $permalink.attr('title', 'Permalink to '+this.model.get('title'));
            }
            if(this.model.has('at')) {
                if(window.clock) {
                    var m = clock.moment(this.model.get('at'));
                    $permalink.find('time').attr('datetime', m.format("YYYY-MM-DDTHH:mm:ssZZ"));
                    this.$at.attr('title', m.format('LLLL'));
                    $permalink.find('time').html(m.calendar());
                } else {
                    $permalink.find('time').html(this.model.get('at'));
                }
            }
            if(this.model.has('owner')) {
                var htmlStr = '<a class="url fn n" href="by/'+this.model.get('owner').name+'" title="View all posts by '+this.model.get('owner').name+'" rel="author">'+this.model.get('owner').name+'</a>';
                if(this.$author.html() !== htmlStr) {
                    this.$author.html('<a class="url fn n" href="by/'+this.model.get('owner').name+'" title="View all posts by '+this.model.get('owner').name+'" rel="author">'+this.model.get('owner').name+'</a>');
                }
                // this.model.getOwner(function(owner){
                //     self.author = owner;
                //     if(owner) {
                //     }
                // });
            }
            
            var isJsCacher = function() {
                return (!navigator || (navigator.userAgent && navigator.userAgent.indexOf('HouseJs HTML Cacher') !== -1));
            }
            var wistia = self.model.get('wistia');
            if(wistia && wistia.id) {
                self.$el.append('<div class="wistia_video" id="wistia_video_'+wistia.id+'"></div>');
                if(!isJsCacher()) {
                    require(['//fast.wistia.net/static/E-v1.js'], function() {
                        var wistiaOpts = {
                          playerColor: "000000",
                          fullscreenButton: true,
                          container: 'wistia_video_'+wistia.id
                        };
                        
                        if(window.account && account.has('name')) {
                            wistiaOpts.trackEmail = account.get('name');
                        }
                        self.wistiaEmbed = Wistia.embed(wistia.id, wistiaOpts);
                    });
                }
            } else if(this.model.has('youtube') && this.model.get('youtube') && this.model.get('youtube').id) {
                var yt = this.model.get('youtube');
                if(yt.id) {
                    var ytid = yt.id;
                    var ytStr = '<div id="ytapiplayer-'+ytid+'"><iframe width="760" height="430" src="//www.youtube.com/embed/'+ytid+'?rel=0" frameborder="0" allowfullscreen></iframe></div>';
                    if(this.$youtube.html() !== ytStr) {
                        this.$youtube.html(ytStr);
                    }
                    this.$el.append(this.$youtube);
                }
                //this.$el.find('.youtube').fitVids();
            } else {
                // console.log(this.$youtube.html())
                // this.$youtube.remove();
                this.$el.find('.youtube').remove();
            }
            if(this.model.has('msg')) {
                var msgStr = this.model.get('msg');
                if(this.$msg.html() !== msgStr) {
                    this.$msg.html(msgStr);
                }
                this.$el.append(this.$msg);
            }
            
            this.$el.append(this.$entryMeta);
            
            var tweet = this.model.get('tweet');
            if(tweet && tweet.id) {
                this.tweet = new TweetView({tweetId: tweet.id, el: this.$tweet, className: 'tweet col-md-8 col-md-offset-2'});
                this.$el.append(this.tweet.render().$el);
            } else {
                this.$el.find('.tweet').remove();
            }
            if(window.account && (account.isAdmin() || account.isOwner(this.model.get('owner').id))) {
                this.$el.append(this.actions.render().$el);
            }
            this.trigger('resize');
            
            return this;
        },
        renderActions: function() {
            this.actions.render();
        },
        show: function() {
            this.$el.show();
        },
        events: {
            "click .author a": "clickAuthor",
            "click .tags-links a": "clickTag",
            "click img[data-active-src]": "activateImg",
            "mouseover img[data-active-src]": "activateImg",
            // "mouseout img[data-active-src]": "deactivateImg",
        },
        activateImg: function(e) {
            var $e = $(e.currentTarget);
            $e.attr('data-deactive-src', $e.attr('src'));
            $e.attr('src', $e.attr('data-active-src'));
            $e.removeAttr('data-active-src');
        },
        deactivateImg: function(e) {
            var $e = $(e.currentTarget);
            $e.attr('data-active-src', $e.attr('src'));
            $e.attr('src', $e.attr('data-deactive-src'));
            $e.removeAttr('data-deactive-src');
        },
        clickAuthor: function(e) {
            if(this.author) {
                if(this.hasOwnProperty('list')) {
                    this.list.trigger('goToAuthor', this.author);
                }
                this.trigger('goToAuthor', this.author);
            }
            return false;
        },
        clickTag: function(e) {
            var $et = $(e.target);
            if($et.attr('data-tag')) {
                this.trigger('goToTag', $et.attr('data-tag'));
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    window.nl2br = function(str) {
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + "<br />");
    };
    window.br2nl = function(str) {
        return str.replace(/<br\s*\/?>/mg,"\n");
    }
    
    var AvatarView = Backbone.View.extend({
        tagName: "span",
        className: "avatar",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        render: function() {
            this.$el.html('');
            var $byline = $('<span class="byline"></span>');
            
            if(this.model.has('title')) {
                this.$el.append('<a target="_blank" href="/posts/'+this.model.getNavigatePath()+'" class="title">'+this.model.get('title')+'</a>');
            }
            if(this.model.get('avatar')) {
                var avatarImage = this.model.get('avatar');
                var $avatarImg = $('<img class="avatar" src="/api/files/'+encodeURIComponent(avatarImage.filename)+'" />');
                this.$el.append($avatarImg);
            }
            
            if(this.model.has('at')) {
                var $at = $('<span class="at"></span>');
                if(window.clock) {
                    $at.attr('title', clock.moment(this.model.get('at')).format('LLLL'));
                    $at.html(clock.moment(this.model.get('at')).calendar());
                } else {
                    $at.html(this.model.get('at'));
                }
                $byline.append($at);
            }
            if(this.model.has('owner')) {
                $byline.append(this.model.get('owner').name);
            }
            if(this.model.has('msg')) {
                var $msg = $('<span class="msg"></span>');
                $msg.html(this.model.get('msg'));
                this.$el.append($msg);
            }
            this.$el.append($byline);
            this.$el.attr('data-id', this.model.get("_id"));
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select"
        },
        select: function(e) {
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            
            deselectSiblings(this.$el);
            this.$el.addClass("selected");
            this.$el.attr("selected", true);
            
            if(this.hasOwnProperty('list')) {
                this.list.trigger('select', this);
            }
                
            this.trigger('select');
            this.trigger('resize');
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var SelectGroupsView = Backbone.View.extend({
        tagName: "div",
        className: "groups col-lg-4",
        initialize: function() {
            //this.$options = $('<option value="public">public</option><option value="private">private</option>');
            this.$options =  $('<div class="btn-group">\n\
              <button type="button" class="privacy btn btn-default"><span class="glyphicon glyphicon-lock">Privacy</span></button>\n\
              <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">\n\
                <span class="caret"></span>\n\
              </button>\n\
              <ul class="dropdown-menu" role="menu">\n\
                <li><a href="#" class="private glyphicon glyphicon-lock">Private</a></li>\n\
                <li><a href="#" class="public glyphicon glyphicon-globe">Public</a></li>\n\
                <li class="divider"></li>\n\
                <li><a href="#" class="addGroup">Other Group</a></li>\n\
              </ul>\n\
            </div>');
            if(this.model && this.model.has('groups')) {
                this.value = this.model.get('groups');
            }
        },
        renderPrivate: function() {
            var $span = this.$el.find('.privacy.btn span');
            $span.html('Private');
            $span.removeClass('glyphicon-globe');
            $span.addClass('glyphicon-lock');
        },
        renderPublic: function() {
            var $span = this.$el.find('.privacy.btn span');
            $span.html('Public');
            $span.removeClass('glyphicon-lock');
            $span.addClass('glyphicon-globe');
        },
        render: function() {
            var self = this;
            this.$el.append(this.$options);
            if(this.model && this.model.has('groups') && this.model.get('groups').indexOf('public') !== -1) {
                this.renderPublic();
            } else if(!this.model.has('groups') || this.model.get('groups').length == 0) {
                this.renderPrivate();
            } else {
                var $span = this.$el.find('.privacy.btn span');
                $span.removeClass('glyphicon-lock');
                $span.removeClass('glyphicon-globe');
                $span.html(this.model.get('groups'));
            }
            this.setElement(this.$el);
            return this;
        },
        val: function() {
            return this.value;
        },
        events: {
            "click a.public": "clickPublic",
            "click a.private": "clickPrivate",
            "click a.addGroup": "addGroup"
        },
        addGroup: function(e) {
            var g = prompt("Enter group name.");
            if(g) {
                this.value = [];
                this.value.push(g);
                var $span = this.$el.find('.privacy.btn span');
                $span.html(g);
                $span.removeClass('glyphicon-lock');
                $span.removeClass('glyphicon-globe');
            }
            e.preventDefault();
        },
        clickPublic: function(e) {
            this.value = ['public'];
            this.renderPublic();
            e.preventDefault();
        },
        clickPrivate: function(e) {
            this.value = [];
            this.renderPrivate();
            e.preventDefault();
        }
    });
    
    var TagsInputView = Backbone.View.extend({
        tagName: "div",
        className: "tags form-group",
        initialize: function() {
        },
        render: function() {
            this.$el.html('');
            var tags = this.model.get("tags");
            this.$el.append('<button class="newTag btn glyphicon glyphicon-tags">Tag</button>');
            if(tags) {
                for(var i in tags) {
                    var tagName = tags[i];
                    if(!_.isString(tagName)) {
                        var $btn = $('<button class="tag">'+tagName+'</button>');
                        $btn.attr('data-tag', JSON.stringify(tagName));
                        this.$el.append($btn);
                    } else {
                        this.$el.append('<button class="tag btn btn-info glyphicon glyphicon-tag">'+tagName+'</button>');
                    }
                }
            }
            this.setElement(this.$el);
            return this;
        },
        val: function() {
            var tags = [];
            if(this.model.has('tags')) {
                tags = this.model.get("tags");
            }
            return tags;
        },
        events: {
          "click .newTag": "newTag",
          "click .tag": "removeTag"
        },
        removeTag: function(e) {
            var self = this;
            if(confirm("Are you sure that you want to remove this tag?")) {
                var tags = this.model.get("tags");
                var $tag = $(e.target);
                var tagName = '';
                if($tag.attr('data-tag')) {
                    tagName = JSON.parse($tag.attr('data-tag'));
                } else {
                    tagName = e.target.innerHTML;
                }
                this.model.pull({"tags": tagName}, {silent: true});
                
                if(!this.model.isNew()) {
                    var saveModel = this.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
            return false;
        },
        newTag: function() {
            var self = this;
            var tagName = prompt("Enter tags, separated, by commas.");
            if(tagName) {
                tagName = tagName.split(',');
                for(var i in tagName) {
                    var tag = tagName[i];
                    tagName[i] = tag.trim(); // trim extra white space
                }
                if(tagName) {
                    if(!this.model.has("tags")) {
                        this.model.set({'tags': tagName}, {silent: true});
                        if(!this.model.isNew()) {
                            var saveModel = this.model.save(null, {
                                silent: false,
                                wait: true
                            });
                            saveModel.done(function() {
                                self.render();
                                //console.log('tags saved');
                            });
                        } else {
                            self.render();
                        }
                    } else {
                        this.model.pushAll({"tags": tagName}, {silent: true});
                        if(!this.model.isNew()) {
                            var saveModel = this.model.save(null, {
                                silent: false,
                                wait: true
                            });
                            saveModel.done(function() {
                                self.render();
                            });
                        } else {
                            self.render();
                        }
                    }
                }
            }
            return false;
        }
    });
    
    var TweetInputView = Backbone.View.extend({
        tagName: "div",
        className: "tweet form-group",
        initialize: function() {
            this.$label = $('<label class="col-lg-4 control-label">Tweet ID:</label><div class="col-lg-8"></div>');
            this.$input = $('<input name="tweet_id" placeholder="tweet id" class="form-control"/>');
        },
        render: function() {
            var self = this;
            this.$el.append(this.$label);
            this.$el.find('div').append(this.$input);
            this.setElement(this.$el);
            return this;
        },
        val: function(v) {
            if(v) {
                this.$input.val(v);
            } else {
                var oid = this.$input.val();
                var o = {};
                if(this.model.has('tweet')) {
                    o = _.clone(this.model.get('tweet'));
                }
                o.id = oid;
                return o;
            }
        },
        parseForId: function(str) {
            //var matches = str.match(/(\d+)$/);
            var dec = str.match(/^(\d+)$/);
            if(dec && dec.length > 1) {
                return str;
            } else {
                var matches = str.match(/^http(s):\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)$/);
                //console.log(matches)
                if(matches && matches.length > 1) {
                    return matches[matches.length-1];
                } else {
                    return str;
                }
            }
        },
        events: {
            "blur input": "blurInput"
        },
        blurInput: function(e) {
            this.$input.val(this.parseForId(this.$input.val()));
        }
    });
    
    var WistiaMediaView = Backbone.View.extend({
        tagName: "div",
        className: "wistia form-group",
        initialize: function() {
            var labelTxt = this.options.label || 'Wistia ID';
            this.$label = $('<label class="col-lg-4 control-label">'+labelTxt+':</label><div class="col-lg-8"></div>');
            this.$input = $('<input name="wistia_id" placeholder="wistia id" class="form-control" />');
        },
        render: function() {
            var self = this;
            this.$el.append(this.$label);
            this.$el.find('div').append(this.$input);
            this.setElement(this.$el);
            return this;
        },
        val: function(v) {
            if(v) {
                this.$input.val(v);
            } else {
                var y = {id: this.$input.val()};
                return y;
            }
        },
        events: {
            
        },
    });
    
    var YoutubeView = Backbone.View.extend({
        tagName: "div",
        className: "youtube form-group",
        initialize: function() {
            this.$label = $('<label class="col-lg-4 control-label">YouTube ID:</label><div class="col-lg-8"></div>');
            this.$input = $('<input name="youtube_id" placeholder="youtube id" class="form-control"/>');
        },
        render: function() {
            var self = this;
            this.$el.append(this.$label);
            this.$el.find('div').append(this.$input);
            this.setElement(this.$el);
            return this;
        },
        parseForId: function(str) {
            var matches = str.match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
            console.log(matches)
            if(matches && matches.length > 1) {
                return matches[5];
            } else {
                return str;
            }
        },
        val: function(v) {
            if(v) {
                this.$input.val(v);
            } else {
                var ytid = this.$input.val();
                var y = {};
                if(this.model.has('youtube')) {
                    _.clone(this.model.get('youtube'));
                }
                y.id = ytid;
                return y;
            }
        },
        events: {
            "blur input": "blurInput"
        },
        blurInput: function(e) {
            this.$input.val(this.parseForId(this.$input.val()));
        }
    });
    
    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "form form-horizontal",
        initialize: function() {
            var self = this;
            this.$owner = $('');
            if(this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
                this.$owner = $('<span>'+this.model.get('owner').name+'</span>');
            } else {
                this.$owner = $('<span></span>');
                if(!this.model) {
                    this.model = new Model({}, {
                        collection: this.collection
                    });
                }
            }
            var opts = {
                className: 'actions col-md-4 col-md-offset-8',
                model: this.model, 
                actionOptions: {
                    fav: {fieldName: 'fav'},
                    tags: {fieldName: 'tags'},
                    groups: {fieldName: 'groups'},
                }
            }
            opts.actionOptions.more = {
                "attachImage": {
                    title: "Header Image",
                    glyphicon: 'picture',
                    action: function(model) {
                        self.attachImage();
                        return false;
                    }
                },
                "attachAudio": {
                    title: "Embed Audio",
                    glyphicon: 'music',
                    action: function(model) {
                        self.attachAudio();
                        return false;
                    }
                },
                "attachVideo": {
                    title: "Embed Video",
                    glyphicon: 'film',
                    action: function(model) {
                        self.attachVideo();
                        return false;
                    }
                },
                "attachYoutube": {
                    title: "Embed YouTube",
                    glyphicon: 'film',
                    action: function(model) {
                        self.attachYoutube();
                        return false;
                    }
                },
                "attachTweet": {
                    title: "Embed Tweet",
                    glyphicon: 'comment',
                    action: function(model) {
                        self.attachTweet();
                        return false;
                    }
                }
            }
            this.modelActions = new utils.ModelActionsView(opts);
            this.modelActions.on('goToTagName', function(tagName){
                app.listView.tagsView.tagSelectView.selectTagByName(tagName);
            });
            self.uploadAvatarFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'image', metadata:{groups: ['public']}});
            self.uploadAvatarFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(data.image) {
                    if(!self.model.isNew()) {
                        var setDoc = {
                            avatar: data.image
                        }
                        self.model.set(setDoc, {silent: true});
                        var saveModel = self.model.save(null, {
                            silent: false,
                            wait: true
                        });
                        if(saveModel) {
                            saveModel.done(function() {
                                self.trigger("newImage", self.model);
                                self.render();
                            });
                        }
                    } else {
                        
                    }
                }
            });
            self.uploadMediaAudioFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'audio', metadata:{groups: ['public']}});
            self.uploadMediaAudioFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(!self.model.isNew()) {
                    var setDoc = {
                        audio: data.file
                    }
                    self.model.set(setDoc, {silent: true});
                    var saveModel = self.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.trigger("newAudio", self.model);
                            self.render();
                        });
                    }
                } else {
                    
                }
            });
            self.uploadMediaVideoFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'video', metadata:{groups: ['public']}});
            self.uploadMediaVideoFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(!self.model.isNew()) {
                    var setDoc = {
                        video: data.file
                    }
                    self.model.set(setDoc, {silent: true});
                    var saveModel = self.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.trigger("newVideo", self.model);
                            self.render();
                        });
                    }
                } else {
                    
                }
            });
            this.$ace = $('<div id="ace-editor"></div>');
            this.$affix = $('<div class="affixTools"></div>');
            this.wsyi_id = 'wysihtml5-'+this.cid;
            this.$inputTitle = $('<input type="text" name="title" placeholder="Title of your post" autocomplete="off" class="form-control entry-title" />');
            this.$msgToolbar = $('<div class="wysihtml5-toolbar" id="'+this.wsyi_id+'-toolbar"><header><ul class="commands">\
                  <li data-wysihtml5-command="bold" title="Make text bold (CTRL + B)" class="command"><span class="glyphicon glyphicon-bold"></span></li>\
                  <li data-wysihtml5-command="italic" title="Make text italic (CTRL + I)" class="command"><span class="glyphicon glyphicon-italic"></span></li>\
                  <li data-wysihtml5-command="formatBlock" data-wysihtml5-command-value="blockquote" title="Insert blockquote" class="command"><b>&ldquo;</b></span></li>\
                  <li data-wysihtml5-command="insertUnorderedList" title="Insert a bulleted list" class="command"><span class="glyphicon glyphicon-th-list"></span></li>\
                  <li data-wysihtml5-command="insertOrderedList" title="Insert a numbered list" class="command"><span class="glyphicon glyphicon-list"></span></li>\
                  <li data-wysihtml5-command="createLink" title="Insert a link" class="command"><span class="glyphicon glyphicon-link"></span></li>\
                  <li data-wysihtml5-command="insertImage" title="Insert an image" class="command"><span class="glyphicon glyphicon-picture"></span></li>\
                  <li data-wysihtml5-command="formatBlock" data-wysihtml5-command-value="h1" title="Insert headline 1" class="command"><span class="glyphicon glyphicon-header"></span></li>\
                  <li data-wysihtml5-command="formatBlock" data-wysihtml5-command-value="h2" title="Insert headline 2" class="command"><b>H2</b></span></li>\
                  <li data-wysihtml5-command="insertSpeech" title="Insert speech" class="command"><span class="glyphicon glyphicon-record"></span></li>\
                  <li data-wysihtml5-action="change_view" title="Show HTML" class="action"><span class="glyphicon glyphicon-wrench"></span></li>\
                  <li data-wysihtml5-action="cleanup_html" title="Cleanup HTML" class="cleanup" title="Cleanup Code"><span class="glyphicon glyphicon-text-width"></span></li>\
                  </ul></header>\
              <div data-wysihtml5-dialog="publishedAt" style="display: none;" class="input-group"></div>\
              <div data-wysihtml5-dialog="createLink" style="display: none;" class="input-group"><span class="input-group-btn"><label class="control-label">URL:</label></span><input class="form-control" data-wysihtml5-dialog-field="href" value="http://"><span class="input-group-btn"><a data-wysihtml5-dialog-action="save" class="btn btn-primary">OK</a>&nbsp;<a data-wysihtml5-dialog-action="cancel" class="btn btn-default">Cancel</a></span></div>\
              <div data-wysihtml5-dialog="insertImage" style="display: none;">\
                <span class="input-group">\
                <label class="control-label">Image:</label><input data-wysihtml5-dialog-field="src" value="http://" class="form-control">\
                <a data-wysihtml5-dialog-action="save" class="btn btn-primary">OK</a>&nbsp;<a data-wysihtml5-dialog-action="cancel" class="btn btn-default">Cancel</a></div></span></div>');
            this.$inputMsg = $('<textarea id="'+this.wsyi_id+'-textarea" name="msg" placeholder="Your message..." cols="100"></textarea>');
            this.$inputSlug = $('<input type="text" name="slug" placeholder="post-title" class="form-control" />');
            this.$slugShare = $('<div class="slugShare form-group"></div>');
            this.$slugShare.html('<label class="glyphicon glyphicon-link control-label">/posts/</label><div class=""></div>'); //window.location.origin+
            this.$slugShare.find('div').append(this.$inputSlug);
            
            this.$inputSeq = $('<input title="Post number" type="text" name="seq" placeholder="post number" class="form-control" />');
            this.$seqShare = $('<div class="seqUrl"></div>');
            // this.$seqShare.html('<label class="seqShare glyphicon glyphicon-link col-lg-4 control-label">/posts/seq/</label><div class="col-lg-8"></div>');
            this.$seqShare.html(''); // <label class="seqShare">#</label>
            this.$seqShare.append(this.$inputSeq);
            
            this.$inputAtDate = $('<input name="at-date" type="date" class="form-control" />');
            this.$inputAtTime = $('<input name="at-time" type="time" class="form-control" />');
            
            this.atPublished = $('<span class="published">\n\
            <div class="at form-group"> <div class="atDate col-md-7"></div><div class="atTime col-md-4"></div></div></span>');
            // this.atPublished.find('.owner').append(this.$owner);
            this.$msgToolbar.find('[data-wysihtml5-dialog="publishedAt"]').append(this.$inputAtDate).append(this.$inputAtTime).append('<span class="input-group-btn"><a data-wysihtml5-dialog-action="save" class="btn btn-primary">OK</a></span>');
            
            // this.inputTagsView = new TagsInputView({model: this.model});
            this.youtubeView = new YoutubeView({model: this.model});
            this.wistiaView = new WistiaMediaView({model: this.model, label: 'Wistia Video ID'});
            this.wistiaAudioView = new WistiaMediaView({model: this.model, label: 'Wistia Audio ID'});
            this.tweetInputView = new TweetInputView({model: this.model});
            // this.inputGroupsView = new SelectGroupsView({model: this.model});
            // this.feedView = new ActionFeedView({model: this.model});
            // this.deleteView = new ActionDeleteView({model: this.model});
            
            this.$form = $('<form class="post container"><div class="col-md-8 col-md-offset-2 fieldset"></div><div sytle="display:none;" class="controls col-md-8 col-md-offset-2"></div></form>');
            
            this.$fieldset = this.$form.find('.fieldset');
            this.$fieldset.append('<span class="avatar"><span class="embed"></span></span>');
            this.$fieldset.append('<span class="audio"><span class="embed"></span></span>');
            this.$fieldset.append('<span class="video"><span class="embed"></span></span>');
            this.$fieldset.append(this.$inputTitle);
            this.$fieldset.append(this.$affix);
            this.$publishButton = $('<div class="btn-group publish">\n\
      <button type="button" class="btn btn-link btn-sm save">Save Draft</button>\n\
      <button type="button" class="btn btn-link btn-sm dropdown-toggle" data-toggle="dropdown">\n\
        <span class="glyphicon glyphicon-lock"></span>\n\
        <span class="sr-only">Toggle Dropdown</span>\n\
      </button>\n\
      <ul class="dropdown-menu pull-right" role="menu">\n\
        <li class="active"><a href="#" class="private"><span class="glyphicon glyphicon-check"></span> Private Draft</a></li>\n\
        <li><a href="#" class="public"><span class="glyphicon glyphicon-globe"></span> Publish Publicly</a></li>\n\
      </ul>\n\
    </div>');
            // this.$fieldset.append('<div class="form-group "><div class=""><input type="submit" value="Publish" class="form-control btn btn-primary" /></div></div>');
            this.$affix.append(this.$publishButton);
            if(!this.model.isNew()) {
                this.$slugShare.hide();
            }
            this.$affix.append(this.$slugShare);
            this.$affix.append(this.$seqShare);
            this.$affix.append('<span class="atBtn glyphicon glyphicon-time btn btn-link"> </span>');
            this.$affix.append('<div class="by" title="Post author"><span class="glyphicon glyphicon-user"></span> <span class="owner"></span></div>');
            this.$owner = this.$affix.find('.by .owner');
            this.$affix.append(this.$msgToolbar);
            this.$fieldset.append(this.$inputMsg);
            this.$fieldset.append(this.$ace);
            
            this.$controls = this.$form.find('.controls');
            // this.$controls.prepend(this.inputGroupsView.render().$el);
            // this.$controls.append('<hr />');
            // this.$controls.append(this.inputTagsView.render().$el);
            // this.$controls.append(this.atPublished);
            // this.$controls.append(this.youtubeView.render().$el);
            // this.$controls.append(this.wistiaView.render().$el);
            // this.$controls.append(this.wistiaAudioView.render().$el);
            // this.$controls.append(this.tweetInputView.render().$el);
            // this.$controls.append('<hr />');
            
            this.$controls.append(this.uploadAvatarFrame.render().$el.hide());
            this.$controls.append(this.uploadMediaAudioFrame.render().$el.hide());
            this.$controls.append(this.uploadMediaVideoFrame.render().$el.hide());
            
            // this.$controls.append('<hr />');
            // this.$controls.append(this.feedView.render().$el);
            if(!this.model.isNew()) {
                // this.$controls.append(this.deleteView.render().$el);
            }
        },
        render: function() {
            var self = this;
            if(!this.model.isNew()) {
                this.$el.prepend(this.modelActions.render().$el);
            }
            if(this.$el.find('form').length === 0) {
                //console.log('append form');
                this.$el.append(this.$form);
            }
            if(this.model) {
                if(this.model.has('title')) {
                    this.$inputTitle.val(this.model.get('title'));
                }
                if(this.model.has('seq')) {
                    this.$inputSeq.val(this.model.get('seq'));
                } else if(this.model.isNew()) {
                    var ii = parseInt(this.model.collection.count) + 1;
                    this.$inputSeq.val(ii);
                }
                if(this.model.has('msg')) {
                    this.$inputMsg.val(this.model.get('msg'));
                }
                if(this.model.has('slug')) {
                    this.$inputSlug.val(this.model.get('slug'));
                }
                if(this.model.has('youtube')) {
                    var youtube = this.model.get('youtube');
                    this.youtubeView.val(youtube.id);
                }
                if(this.model.has('wistia')) {
                    var wistia = this.model.get('wistia');
                    this.wistiaView.val(wistia.id);
                }
                if(this.model.has('wistiaAudio')) {
                    var wistiaAudio = this.model.get('wistiaAudio');
                    this.wistiaAudioView.val(wistiaAudio.id);
                }
                if(this.model.has('tweet')) {
                    var tweet = this.model.get('tweet');
                    this.tweetInputView.val(tweet.id);
                }
                
                if(this.model.get('avatar')) {
                    var avatarImage = this.model.get('avatar');
                    var $avatarImg = $('<img src="/api/files/'+encodeURIComponent(avatarImage.filename)+'" />');
                    this.$form.find('.avatar .detachImage').remove();
                    this.$form.find('.avatar').append('<button class="detachImage btn btn-link" class="form-control">Detach Image</button>');
                    this.$form.find('.avatar .embed').html($avatarImg);
                } else {
                    this.$form.find('.avatar .detachImage').remove();
                    this.$form.find('.avatar .embed').html('');
                }
                if(this.model.get('audio')) {
                    var media = this.model.get('audio');
                    var $mediaEmbed = $('<audio controls preload="none" src="/api/files/'+encodeURIComponent(media.filename)+'" />');
                    this.$form.find('.audio').append('<button class="detachAudio btn btn-link" class="form-control">Detach Audio</button>');
                    this.$form.find('.audio .embed').html($mediaEmbed);
                } else {
                    this.$form.find('.audio .detachAudio').remove();
                    this.$form.find('.audio .embed').html('');
                }
                if(this.model.get('video')) {
                    var media = this.model.get('video');
                    var $mediaEmbed = $('<video controls preload="none" src="/api/files/'+encodeURIComponent(media.filename)+'" />');
                    this.$form.find('.video').append('<button class="detachVideo btn btn-link" class="form-control">Detach Video</button>');
                    this.$form.find('.video .embed').html($mediaEmbed);
                } else {
                    this.$form.find('.video .detachVideo').remove();
                    this.$form.find('.video .embed').html('');
                }
                
                
                if(this.model.has('groups') && this.model.get('groups').indexOf('public') !== -1) {
                    this.renderPublishPublic(this.$publishButton.find('.public'));
                } else {
                    this.renderPublishPrivate(this.$publishButton.find('.private'));
                }
                
                if(this.model.has('groups')) {
                    // this.inputGroupsView.val(this.model.get('groups'));
                }
                if(this.model.has('at')) {
                    var m = moment(this.model.get('at'));
                    this.$inputAtTime.val(m.format('HH:mm'));
                    this.$inputAtDate.val(m.format('YYYY-MM-DD'));
                }
                if(this.model.has('owner')) {
                    this.model.getOwner(function(owner){
                        if(owner) {
                            if(window.account && (account.isAdmin() || !account.isOwner(owner.id))) {
                                self.$owner.html('<a href="#" title="Take Ownership" class="takeOwner"></a>');
                                self.$owner.find('a').html(owner.getNewAvatarNameView().render().$el);
                            } else {
                                self.$owner.html(owner.getNewAvatarNameView().render().$el);
                            }
                        }
                    });
                } else {
                    // logged in user
                    self.$owner.html(account.view.userModel.getNewAvatarNameView().render().$el);
                }
            }
            this.setElement(this.$el);
            return this;
        },
        wysiEditor: function() {
            var self = this;
            var stylesheets = [];
            $('link[rel="stylesheet"]').each(function(i,e){
                console.log(e);
                stylesheets.push($(e).attr('href'));
            });
            
            // TODO calculate this better
            var topPos = self.$form.find('.avatar').outerHeight(true) + 127;
            // Affix the toolbar
            this.$affix.affix({
                offset: {
                    top: topPos
                    , bottom: function () {
                        return (this.bottom = self.$el.find('.controls').outerHeight(true)+88)
                    }
                }
              });
            this.$affix.on('affix.bs.affix', function () {
                self.$el.addClass('affixToolbar').removeClass('affixToolbarTop').removeClass('affixToolbarBottom');
            });
            this.$affix.on('affix-top.bs.affix', function () {
                self.$el.addClass('affixToolbarTop').removeClass('affixToolbar').removeClass('affixToolbarBottom');
            });
            this.$affix.on('affix-bottom.bs.affix', function () {
                self.$el.addClass('affixToolbarBottom').removeClass('affixToolbarTop').removeClass('affixToolbar');
            });
            
            // set h/w of textarea
            // $('#'+this.wsyi_id+'-textarea').css('height', $('#'+this.wsyi_id+'-textarea').outerHeight());
            // $('#'+this.wsyi_id+'-textarea').css('width', $('#'+this.wsyi_id+'-textarea').outerWidth());
            // $('#'+this.wsyi_id+'-textarea').css('height', $('#'+this.wsyi_id+'-textarea').outerHeight());
            $('#'+this.wsyi_id+'-textarea').css('width', $('#'+this.wsyi_id+'-textarea').outerWidth());
            var str = $('#'+this.wsyi_id+'-textarea')[0].value;
            var cols = $('#'+this.wsyi_id+'-textarea')[0].cols;
            var linecount = 0;
            var lines = str.split("\n");
            for(var i in lines) {
                l = lines[i];
              linecount += Math.ceil( l.length / cols ); // take into account long lines
            }
            $('#'+this.wsyi_id+'-textarea')[0].rows = linecount + 1;
            var lineHeight = $('#'+this.wsyi_id+'-textarea').css('line-height');
            lineHeight = lineHeight.substr(0, lineHeight.length - 2) - 4;
            if(linecount < 60) {
                linecount = 60;
            }
            var h = linecount*lineHeight;
            $('#'+this.wsyi_id+'-textarea').css('height', h+'px');
            
            require([ "/posts/wysihtml-parser_rules.js" ], function() {
                require([ "/posts/wysihtml5-0.4.0pre.min.js" ], function() {
                    self.editor = new wysihtml5.Editor(self.wsyi_id+"-textarea", { // id of textarea element
                      toolbar:      self.wsyi_id+"-toolbar", // id of toolbar element
                      stylesheets: stylesheets, // ['/pages/css/bootstrap.min.css', '/pages/index.css'],
                      parserRules:  wysihtml5ParserRules // defined in parser rules set 
                    });
                    self.editor.aceVisible = false;
                    // console.log(self.editor.ace);
                    self.editor.on("change", function(){
                        // console.log(arguments)
                    });
                    self.editor.on("external_change_view", function(view){
                        if(view === "textarea") {
                            require(['/fs/js-beautify/beautify-html.js'], function(html_beautify){
                            window.html_beautify = html_beautify.html_beautify;
                            require([ "/fs/ace/ace.js" ], function() {
                                self.editor.aceVisible = true;
                                self.$ace.show();
                                self.$msgToolbar.find('.cleanup').show();
                                if(!self.hasOwnProperty('aceEditor')) {
                                    self.$ace.css({zIndex:11111,opacity:1,background:"white"});
                                    self.$ace.offset(self.$inputMsg.offset()).width(self.$inputMsg.outerWidth()).height(self.$inputMsg.outerHeight());
                                    self.$ace.html("");
                                    self.aceEditor = ace.edit("ace-editor");
                                    self.aceEditor.setTheme("ace/theme/chrome");
                                    self.aceEditor.getSession().setMode("ace/mode/html");
                                }
                                self.aceEditor.setValue(self.editor.textarea.getValue());
                                self.aceEditor.clearSelection();
                            });
                            });
                        } else {
                            self.editor.aceVisible = false;
                            self.$msgToolbar.find('.cleanup').hide();
                            self.editor.textarea.setValue(self.aceEditor.getValue());
                            self.aceEditor.setValue("");
                            self.$ace.hide();
                        }    
                    });
                    $('.wysihtml5-sandbox').contents().find('body').on("keydown",function() {
                        if(self.model.get('msg') !== self.editor.textarea.getValue()) {
                            // dirty and needs saving
                            self.markAsDirty();
                        } else {
                            self.markAsDirty(false);
                        }
                    });
                    self.wysiImagePicker = new WysiImagePicker({el: self.$msgToolbar.find('[data-wysihtml5-dialog="insertImage"]')[0], editor: self.editor});
                    self.wysiImagePicker.render();
                });
            });
            //$(this.editor.composer.iframe.contentDocument).find('head').append($('head style').clone());
        },
        markAsDirty: function(isDirty) {
            if(isDirty === false) {
                this.$el.removeClass('dirty');
                this.$publishButton.find('.save').addClass('btn-link').removeClass('btn-primary');
            } else {
                this.$el.addClass('dirty');
                this.$publishButton.find('.save').addClass('btn-primary').removeClass('btn-link');
            }
        },
        events: {
            "submit form": "submit",
            "click .publish .save": "submit",
            "click .publish .dropdown-toggle": "clickPublishDropdown",
            "click .publish .dropdown-menu a": "clickPublishDropdownItem",
            "click .slugShare": "clickShare",
            "click .cleanup": "cleanup",
            'keyup input[name="title"]': "throttleTitle",
            'focus input[name="title"]': "focusTitle",
            'blur input[name="title"]': "blurTitle",
            'blur input[name="slug"]': 'blurSlug',
            // 'change textarea[name="msg"]': "msgChange",
            // "click .attachImage": "attachImage",
            // "click .attachAudio": "attachAudio",
            // "click .attachVideo": "attachVideo",
            "click .detachImage": "detachImage",
            "click .detachAudio": "detachAudio",
            "click .detachVideo": "detachVideo",
            'click [data-wysihtml5-command="insertImage"]': "insertImageHtml",
            'click [data-wysihtml5-dialog="publishedAt"] [data-wysihtml5-dialog-action="save"]': "toggleAtInput",
            "click .atBtn": "toggleAtInput",
            "click .takeOwner": "clickTakeOwner"
        },
        clickTakeOwner: function(e) {
            var self = this;
            if(confirm("Are you sure that you want to take ownership of this post?")) {
                // {id: account.get('user'), name: account.get('name')}
                self.model.set({owner: null}, {silent: true});
                var saveModel = self.model.save(null, {
                    silent: false ,
                    wait: true
                });
                if(saveModel) {
                    saveModel.done(function() {
                        self.render();
                    });
                }
            }
            return false;
        },
        // msgChange: function(e) {
        //     console.log($(e.currentTarget));
        // },
        toggleAtInput: function(e) {
            this.$el.find('[data-wysihtml5-dialog="publishedAt"]').toggle();
        },
        clickShare: function(e) {
            this.$slugShare.show();
            this.$slugShare.find('input').focus();
        },
        clickPublishDropdown: function(e) {
            $(e.currentTarget).dropdown('toggle');
            return false;
        },
        renderPublishPublic: function($et) {
            $et.parent('li').addClass('active').siblings().removeClass('active');
            this.$publishButton.find('.dropdown-menu .glyphicon').removeClass('glyphicon-check');
            $et.find('.glyphicon').addClass('glyphicon-check').removeClass('glyphicon-globe');
            this.$publishButton.find('.private .glyphicon').addClass('glyphicon-lock');
            this.$publishButton.find('.save').html('Publish');
            this.$publishButton.find('.dropdown-toggle .glyphicon').addClass('glyphicon-globe').removeClass('glyphicon-lock');
            this.$publishButton.addClass('public').removeClass('private');
        },
        renderPublishPrivate: function($et) {
            $et.parent('li').addClass('active').siblings().removeClass('active');
            this.$publishButton.find('.dropdown-menu .glyphicon').removeClass('glyphicon-check');
            $et.find('.glyphicon').addClass('glyphicon-check').removeClass('glyphicon-lock');
            this.$publishButton.find('.public .glyphicon').addClass('glyphicon-globe');
            this.$publishButton.find('.save').html('Save Draft');
            this.$publishButton.find('.dropdown-toggle .glyphicon').addClass('glyphicon-lock').removeClass('glyphicon-globe');
            this.$publishButton.addClass('private').removeClass('public');
        },
        clickPublishDropdownItem: function(e) {
            var $et = $(e.currentTarget);
            if($et.hasClass('public')) {
                this.renderPublishPublic($et);
            } else {
                this.renderPublishPrivate($et);
            }
            this.$publishButton.find('.dropdown-toggle').dropdown('toggle');
            return false;
        },
        insertImageHtml: function() {
            this.wysiImagePicker.uploadFrame.pickFiles();
        },
        cleanup: function() {
            var self = this;
            var v = this.aceEditor.getValue();
            var cleanVal = '';
            var p = this.aceEditor.getCursorPositionScreen();
            var firstRow = this.aceEditor.getFirstVisibleRow();
            cleanVal = html_beautify(v);
            this.aceEditor.setValue(cleanVal, -1);
            this.aceEditor.gotoLine(firstRow);
            this.aceEditor.moveCursorToPosition(p);
            return false;
        },
        attachImage: function() {
            this.uploadAvatarFrame.pickFiles();
            this.uploadAvatarFrame.$el.show();
            return false;
        },
        attachAudio: function() {
            this.uploadMediaAudioFrame.pickFiles();
            this.uploadMediaAudioFrame.$el.show();
            return false;
        },
        attachVideo: function() {
            this.uploadMediaVideoFrame.pickFiles();
            this.uploadMediaVideoFrame.$el.show();
            return false;
        },
        attachYoutube: function() {
            utils.appendLightBox(this.youtubeView.render().$el, 'Embed a YouTube Video', ' ');
            // var mod = utils.getNewModalContent({title: doc.get('filename'), body: doc.getFullView().render().$el, className: 'modal-content container'});
        },
        attachTweet: function() {
            utils.appendLightBox(this.tweetInputView.render().$el, 'Embed a Tweet', ' ');
        },
        detachImage: function() {
            var self = this;
            var setDoc = {
                avatar: null
            }
            self.model.set(setDoc, {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.render();
                });
            }
            return false;
        },
        detachAudio: function() {
            var self = this;
            var setDoc = {
                audio: null
            }
            self.model.set(setDoc, {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.render();
                });
            }
            return false;
        },
        detachVideo: function() {
            var self = this;
            var setDoc = {
                video: null
            }
            self.model.set(setDoc, {silent: true});
            var saveModel = self.model.save(null, {
                silent: false,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.render();
                });
            }
            return false;
        },
        focusTitle: function() {
            this.$slugShare.show();
            var titleStr = this.$inputTitle.val().trim();
            if(titleStr != '') {
                // autosave
            }
        },
        blurTitle: function() {
            var self = this;
            setTimeout(function(){
                if(!self.$slugShare.find('input').is(":focus")) {
                    self.$slugShare.hide();
                }
            },100); // enough time to catch the click to the slug input
            var titleStr = this.$inputTitle.val().trim();
            if(titleStr != '') {
                // autosave
            }
        },
        blurSlug: function() {
            this.$slugShare.hide();
        },
        throttleTitle: _.debounce(function(){
            this.refreshTitle.call(this, arguments);
        }, 50),
        refreshTitle: function(e) {
            var titleStr = this.$inputTitle.val().trim();
            if(titleStr !== this.model.get('title')) {
                this.markAsDirty();
            } else {
                this.markAsDirty(false);
            }
            this.trigger('title', titleStr);
            //this.model.set('title', titleStr);
            if(!this.model.has('slug') || this.model.isNew()) {
                //this.model.setSlug(titleStr);
                 this.$inputSlug.val(this.model.slugStr(titleStr));
            }
            //this.render();
            //this.focus();
        },
        submit: function() {
            console.log('submit')
            var self = this;
            var setDoc = {};
            if(self.editor.aceVisible) {
                self.editor.textarea.setValue(self.aceEditor.getValue());
            }
            var title = this.$inputTitle.val();
            var seq = this.$inputSeq.val();
            var msg = this.$inputMsg.val();
            var slug = this.$inputSlug.val();
            // var tags = this.inputTagsView.val();
            var groups = this.$publishButton.hasClass('public') ? ['public'] : null;
            var youtube = this.youtubeView.val();
            var wistia = this.wistiaView.val();
            var wistiaAudio = this.wistiaAudioView.val();
            var tweet = this.tweetInputView.val();
            
            var atDate = this.$inputAtDate.val();
            var atTime = this.$inputAtTime.val();
            
            if(atDate && atTime) {
                console.log(atDate)
                console.log(atTime)
                var formDate = moment(atDate+' '+atTime, "YYYY-MM-DD HH:mm");
                var at = new Date(this.model.get('at'));
                if(formDate && at.getTime() !== formDate.toDate().getTime()) {
                    setDoc.at = formDate.toDate();
                }
            }
            if(title !== '' && title !== this.model.get('title')) {
                setDoc.title = title;
            }
            if(seq !== '' && seq !== this.model.get('seq')) {
                setDoc.seq = parseInt(seq, 10);
            }
            if(msg !== '' && msg !== this.model.get('msg')) {
                setDoc.msg = msg;
            }
            if(slug !== '' && slug !== this.model.get('slug')) {
                setDoc.slug = slug;
            }
            // if(tags && tags.length > 0 && tags !== this.model.get('tags')) {
            //     setDoc.tags = tags;
            // }
            if(groups !== this.model.get('groups')) {
                setDoc.groups = groups;
            }
            if(wistia && (!this.model.get('wistia') || !_.isEqual(wistia.id, this.model.get('wistia').id))) {
                setDoc.wistia = wistia;
            }
            if(wistiaAudio && (!this.model.get('wistiaAudio') || !_.isEqual(wistiaAudio.id, this.model.get('wistiaAudio').id))) {
                setDoc.wistiaAudio = wistiaAudio;
            }
            if(youtube && !_.isEqual(youtube, this.model.get('youtube'))) {
                setDoc.youtube = youtube;
            }
            if(tweet && !_.isEqual(tweet, this.model.get('tweet'))) {
                setDoc.tweet = tweet;
            }
            // console.log('setDoc')
            // console.log(setDoc)
            this.model.set(setDoc, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false ,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.collection.add(self.model);
                    self.trigger("saved", self.model);
                });
            } else {
                self.trigger("saved", self.model);
            }
            return false;
        },
        focusMsg: function() {
            this.$inputMsg.focus();
        },
        focus: function() {
            this.$inputTitle.focus();
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var WysiImagePicker = Backbone.View.extend({
        initialize: function(options) {
            var editor = options.editor || false;
            var self = this;
            this.$html = $('<span class="input-group"><span class="input-group-btn"><label class="control-label">Image:</label></span><input data-wysihtml5-dialog-field="src" value="http://" class="form-control"><span class="input-group-btn"><label class="control-label">Caption: </label></span><input name="alt" placeholder="caption" class="form-control"><span class="input-group-btn"><label class="justify"><input type="radio" name="klass" value="original"> <span class="glyphicon glyphicon-align-center"></span> </label><label class="justify"><input type="radio" name="klass" value="pull-left"> <span class="glyphicon glyphicon-align-left"></span> </label><label class="justify"><input type="radio" name="klass" value="pull-right"> <span class="glyphicon glyphicon-align-right"></span> </label> <button class="save btn btn-primary" class="btn btn-primary">OK</button>&nbsp;<a data-wysihtml5-dialog-action="cancel" class="btn btn-default">Cancel</a></span></span>');
            self.$inputUrl = this.$html.find('input[data-wysihtml5-dialog-field="src"]');
            self.uploadFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'image', metadata:{groups: ['public']}});
            self.uploadFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(data.image) {
                    var windowOrigin = window.origin || '';
                    if(!windowOrigin) {
                        windowOrigin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
                    }
                    var url = windowOrigin+'/api/files/'+data.image.filename; //window.location.origin+
                    if(data.image.mimeType.indexOf('image/gif') !== -1 || data.image.filename.substr(-4) === '.gif') {
                        if(data.image.sizes && data.image.sizes.full) {
                            var fullUrl = windowOrigin+'/api/files/'+data.image.sizes.full.filename;
                        }
                        self.$inputUrl.val(url);
                        self.options.editor.composer.commands.exec("insertHTML", '<img data-active-src="'+url+'" src="'+fullUrl+'" alt="" />');
                    } else {
                        if(data.image.sizes && data.image.sizes.full) {
                            url = windowOrigin+'/api/files/'+data.image.sizes.full.filename;
                        }
                        self.$inputUrl.val(url);
                        self.options.editor.composer.commands.exec("insertHTML", '<img src="'+url+'" alt="" />');
                    }
                    self.$el.hide();
                }
            });
        },
        events: {
            'click button.save': "save"
        },
        save: function(){
            var klass = this.$html.find('input[name="klass"]:checked').val();
            var alt = this.$html.find('input[name="alt"]').val();
            var url = this.$inputUrl.val();
            if(url.indexOf(window.location.origin) == 0) {
                url = url.substr(window.location.origin.length);
            }
            if(this.options.editor) {
                //this.options.editor.composer.commands.exec("insertImage", { src: url, alt: alt, class: klass });
                this.options.editor.composer.commands.exec("insertHTML", '<img src="'+url+'" alt="'+alt+'" class="'+klass+'" />');
            }
            this.$el.hide();
            return false;
        },
        render: function() {
            this.$el.html(this.$html)
            this.$el.append(this.uploadFrame.render().$el);
            this.setElement(this.$el);
            return this;
        }
    });
    
    
    
    var TweetView = Backbone.View.extend({
        tagName: "div",
        className: "tweet",
        initialize: function(options) {
            var self = this;
            if(options) {
                if(options.list) {
                    this.list = options.list;
                }
                if(options.tweetId) {
                    this.tweetId = options.tweetId || '133640144317198338';
                }
            }
            require(['//platform.twitter.com/widgets.js'], function() {
                $.getJSON('https://api.twitter.com/1/statuses/oembed.json?id='+self.tweetId+'&align=center&omit_script=true&callback=?', function(data) {
                    //console.log(data);
                    data.html = data.html.replace('blockquote ', 'blockquote data-cards="hidden"');
                    self.data = data;
                    self.initialized = true;
                    self.trigger('initialized');
                });
            });
            //this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            var self = this;
            this.$el.html('');
            if(this.initialized) {
                self.$el.append(self.data.html);
            } else {
                this.on('initialized', function(){
                    self.render();
                });
                return this;
            }
            if(navigator.userAgent.indexOf('HouseJs HTML Cacher') === -1) {
                twttr.widgets.load();
            }
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select"
        },
        select: function(e) {
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
                Avatar: AvatarView,
                Full: FullView,
                Form: FormView
            }
        });
    }
})();