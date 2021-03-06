(function() {
    var pageSize = 0;

    var PostsView = Backbone.View.extend({
        tagName: 'body',
        className: 'posts-app',
        initialize: function() {
            var self = this;
            this.$app = $('<div class="app"></div>');
            if(this.$el.find('.app').length) {
                this.$app = this.$el.find('.app');
            }
            self.editForms = {};
            require(['/tags/tags.js'], function(ModelBackbone) {
                window.TagsBackbone = ModelBackbone;
                window.tagsCollection = new ModelBackbone.Collection(); // collection
                require(['/posts/backbone-posts.js'], function(ModelBackbone) {
                    window.PostsBackbone = ModelBackbone;
                    window.postsCollection = new ModelBackbone.Collection(); // collection
                    require(['/files/backbone-files.js'], function(FilesBackbone) {
                        window.FilesBackbone = FilesBackbone;
                        window.filesCollection = new FilesBackbone.Collection(); // collection

                        self.$postList = $('<div class="post-list"></div>');
                        self.$postViewer = $('<div class="post-viewer"><div class="fullView"></div></div>');
                        if(self.$el.find('.post-viewer').length) {
                            self.$postViewer = self.$el.find('.post-viewer');
                        }
                        window.postsCollection.pageSize = pageSize;
                        // self.listView = new ModelBackbone.List({el: self.$postList, collection: window.postsCollection});
                        var filterFunc = function(model, filterObj) {
                            // console.log(model);
                            // console.log(filterObj);
                            var filterId = filterObj.filter;
                            if(filterId === 'drafts') {
                                var r = model.has('groups') ? model.get('groups').length === 0 : true;
                                // console.log(r)
                                return r;
                            }
                        }
                        self.subscribeEmailView = account.getEmailSubscribeView();
                        var listOpts = {
                            className: 'houseCollection posts table-responsive',
                            headerEl: $('#navbar-header-form'),
                            search: {
                                'fieldName': 'title'
                            },
                            filters: {
                                'drafts': {
                                    txt: 'Drafts',
                                    glyphicon: 'edit',
                                    filter: filterFunc,
                                    load: {
                                        "groups": null
                                    }
                                },
                            },
                            tags: {
                                'fieldName': 'tags'
                            },
                            sorts: [{
                                name: 'Published At',
                                field: 'at',
                                type: 'date',
                                glyphicon: 'time',
                                default: -1
                            }, ],
                            layouts: {
                                "table": {
                                    title: 'Table',
                                    glyphicon: 'th-list',
                                },
                                "row": {
                                    title: 'Summary',
                                    glyphicon: 'th-large',
                                    default: true
                                }
                            },
                            selection: false
                        }
                        self.listView = postsCollection.getView(listOpts);
                        self.listView.on('select', function(row) {
                            // self.router.navigate(row.model.getNavigatePath(), {trigger: true});
                        });
                        self.listView.on('goToAuthor', function(user) {
                            self.router.navigate('by/' + user.get('name'), {
                                trigger: true
                            });
                        });
                        self.listView.on('goToTagName', function(tagName) {
                            self.router.navigate('tag/' + tagName, {
                                trigger: true
                            });
                        });

                        window.postsCollection.on('goToNavigatePath', function(model) {
                            self.router.navigate(model.getNavigatePath(), {
                                trigger: true
                            });
                        });
                        window.postsCollection.on('editModel', function(model) {
                            self.router.navigate(model.getNavigatePath() + '/edit', {
                                trigger: true
                            });
                        });

                        if(window.account) {
                            window.account.profile.on('loggedIn', function(loginView) {
                                self.loadCollections();
                                self.render();
                            });
                        }
                        self.initialized = true;
                        self.trigger('initialized');
                    });
                });
            });

            /*require(['../desktop/jquery.idle-timer.js'], function() {
                var idleTimer = $(document).idleTimer(4200);
                $(document).bind("idle.idleTimer", function(e){
                    $('body').addClass('idle');
                });
                $(document).bind("active.idleTimer", function(){
                    $('body').removeClass('idle');
                });
            });*/
        },
        loadCollections: function(callback) {
            var self = this;
            window.tagsCollection.load(null, function() {
                window.postsCollection.load(null, function() {
                    if(!self.initialized) {
                        self.initialized = true;
                        self.trigger('initialized');
                    }
                    if(callback) {
                        callback();
                    }
                });
            });
        },
        render: function() {
            var self = this;
            // this.$el.html('');
            if(!this.initialized) {
                this.on('initialized', function() {
                    self.render();
                });
                return this;
            }
            
            if(account.get('email')) {
                $('.subscribeEmail').remove();
            } else {
                console.log(this.subscribeEmailView)
                if(this.subscribeEmailView) {
                    if($('.subscribeEmail').length > 0) {
                        this.subscribeEmailView.setElement($('.subscribeEmail')[0]);
                    }
                    $('#siteNav').after(this.subscribeEmailView.render().$el);
                    this.subscribeEmailView.on('saved', function(){
                        alert('Thank you for subscribing!');
                        self.subscribeEmailView.remove();
                    });
                } else {
                    $('.subscribeEmail').remove();
                }
            }
            // this.$app.append(self.listView.render().$el);
            this.$app.append(this.$postViewer);
            this.$el.append(this.$app);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        carouselDoc: function(doc) {
            var self = this;
            $('head [property="fb:page_id"]').remove();
            var baseHref = $('head base[href]').attr('href');
            var hostName = window.location.host || window.location.hostname;
            var hostOrigin = window.location.protocol + '//' + hostName;
            var baseUrl = hostOrigin + baseHref;
            // var baseUrl = baseHref;
            // if(baseHref.indexOf('http') !== 0) {
            //     baseUrl = window.location.protocol+'//'+hostName+baseHref;
            // }
            var apiFilePath = hostOrigin + '/api/files/';
            var hadImg = false;
            
            var setImageTag = function(thumb) {
                $('head [property="og:image"]').attr('content', thumb);
                $('head [name="twitter:image"]').attr('content', thumb);
                hadImg = true;
            }

            $('head meta[property="og:url"]').attr('content', baseUrl + doc.getNavigatePath());
            $('head [rel="canonical"]').attr('href', baseUrl + doc.getNavigatePath());
            $('head [name="twitter:url"]').attr('content', baseUrl + doc.getNavigatePath());
            $('head [name="twitter:domain"]').attr('content', hostName);

            $('head [property="og:type"]').attr('content', 'article');
            $('head [name="twitter:card"]').attr('content', 'photo');
            if(doc.has('title')) {
                self.router.setTitle(doc.get('title'));
                $('head [property="og:title"]').attr('content', doc.get('title'));
                $('head [name="twitter:title"]').attr('content', doc.get('title'));
            }
            if(doc.has('msg')) {
                var msgText = doc.get('msg');
                msgText = $('<span>' + msgText + '</span>').text();
                if(msgText.length > 300) {
                    msgText = msgText.substr(0, 295);
                    var si = msgText.lastIndexOf(' ');
                    msgText = msgText.substr(0, si) + '...';
                }
                $('head [property="og:description"]').attr('content', msgText);
                $('head meta[name="twitter:description"]').attr('content', msgText.substr(0, 130));
            }
            if(doc.has('audio')) {
                var media = doc.get('audio');
                $('head [property="og:audio"]').remove();
                var $ogVideo = $('<meta property="og:audio" content="' + apiFilePath + encodeURIComponent(media.filename) + '">');
                //$('head').append($ogVideo); // tmp commented out
                //$('head [property="og:type"]').attr('content', 'audio');
            }
            if(doc.has('youtube')) {
                var youtube = doc.get('youtube');
                if(youtube.id) {
                    var ythumb = 'http://i.ytimg.com/vi/' + youtube.id + '/hqdefault.jpg';
                    // console.log('update og tag');
                    setImageTag(ythumb);

                    $('head [property="og:video"]').remove();
                    var $ogVideo = $('<meta property="og:video" content="http://www.youtube.com/v/' + youtube.id + '">');
                    //$('head').append($ogVideo);
                }
                //$('head [property="og:type"]').attr('content', 'video');
            }
            if(doc.has('avatar')) {
                var image = doc.get('avatar');
                var ogImage = apiFilePath + encodeURIComponent(image.filename);
                // console.log('update og:image with post avatar');
                setImageTag(ogImage);
            }

            if(doc.get('wistia')) {
                var w = doc.get('wistia');
                if(w.thumbnail && w.thumbnail.url) {
                    var ogImage = w.thumbnail.url;
                    var queryPos = ogImage.indexOf('?');
                    if(queryPos !== -1) {
                        ogImage = ogImage.substr(0, queryPos); // strip query
                    }
                    setImageTag(ogImage);
                }
            }
            
            if(!hadImg) {
                // search the post body for yt embed
                if(doc.has('msg')) {
                    var msgText = doc.get('msg');
                    //     src="//www.youtube.com/embed/rVhfkQTc0qo" 
                    var reg = RegExp(/ src="\/\/www\.youtube\.com\/embed\/(.*)" /);
                    var matches = reg.exec(msgText);
                    if(matches && matches.length > 1) {
                        var ytid = matches[1];
                        var ythumb = 'http://i.ytimg.com/vi/' + ytid + '/hqdefault.jpg';
                        setImageTag(ythumb);
                    }
                }
            }

            if(window.config && config.fb) {
                if(config.fb.page_id) {
                    $('head meta[property="fb:page_id"]').remove();
                    $('head').append('<meta property="fb:page_id" content="' + config.fb.page_id + '" />');
                }
                if(config.fb.app_id) {
                    $('head meta[property="fb:app_id"]').remove();
                    $('head').append('<meta property="fb:app_id" content="' + config.fb.app_id + '" />');
                }
                if(config.fb.admins) {
                    $('head meta[property="fb:admins"]').remove();
                    var adminsArr = config.fb.admins.split(',');
                    for(var i in adminsArr) {
                        var admin_id = adminsArr[i].trim();
                        $('head').append('<meta property="fb:admins" content="' + admin_id + '" />');
                    }
                }
            }
            if(!$('head meta[property="fb:app_id"]').attr('content')) {
                $('head meta[property="fb:app_id"]').remove();
            }
            // console.log(self.$postViewer.find('.fullView'))
            var $el = doc.getFullView({
                list: self.listView,
                el: self.$postViewer.find('.fullView')
            }).render().$el;
            // self.$postViewer.append($el);
            // $el.siblings().remove();
            $('body')[0].scrollTop = 0;
        },
        editDoc: function(doc) {
            var self = this;
            var $form;
            window.onbeforeunload = function() {
                return "Are you sure that you want to leave?";
            }
            if(!doc) {
                if(!self.newForm) {
                    var newPostModel = window.postsCollection.getNewModel();
                    self.newForm = newPostModel.getFormView();
                    self.newForm.on("saved", function(doc) {
                        self.router.navigate(doc.getNavigatePath(), {
                            replace: true,
                            trigger: true
                        });

                        // clear newform
                        self.newForm.remove();
                        delete self.newForm;
                    });
                    self.newForm.on("title", function(title) {
                        self.router.setTitle(title);
                    });
                    $form = self.newForm.render().$el;
                    $form.show();
                    self.$app.append($form);
                    self.newForm.wysiEditor();
                } else {
                    $form = self.newForm.render().$el;
                    $form.show();
                }
                $form.siblings().hide();
                self.newForm.focus();
            } else {
                if(!self.editForms.hasOwnProperty(doc.id)) {
                    self.editForms[doc.id] = doc.getFormView();
                    if(doc.has('title')) {
                        self.router.setTitle(doc.get('title'));
                    }
                    self.editForms[doc.id].on("saved", function(doc) {
                        self.router.navigate(doc.getNavigatePath(), {
                            replace: true,
                            trigger: true
                        });
                    });
                    self.editForms[doc.id].on("title", function(title) {
                        self.router.setTitle(title);
                    });
                    $form = self.editForms[doc.id].render().$el;
                    $form.show();
                    self.$app.append($form);
                    self.editForms[doc.id].wysiEditor();
                } else {
                    $form = self.editForms[doc.id].render().$el;
                    $form.show();
                }
                $form.siblings().hide();
                self.editForms[doc.id].focusMsg();
            }
        },
        findPostById: function(id, callback) {
            window.postsCollection.getOrFetch(id, callback);
        },
        findPostBySlug: function(slug, callback) {
            window.postsCollection.getOrFetchSlug(slug, callback);
        },
        findPostBySeq: function(seq, callback) {
            window.postsCollection.getOrFetchSeq(seq, callback);
        },
        userIs: function(userId) {
            return(this.user && this.user.id == userId);
        },
        userIsAdmin: function() {
            return(this.user && this.user.has('groups') && this.user.get('groups').indexOf('admin') !== -1);
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
            // nav.list.on('home', function(){
            //     nav.router.navigate('', {trigger: true});
            // });
            this.bindRouter(nav.router);
            // nav.col.add({title:"Posts", navigate:""});
            nav.col.add({
                title: "Drafts",
                navigate: "drafts",
                glyphicon: "edit",
                renderCondition: "isAdmin"
            });
            nav.col.add({
                title: "New post",
                navigate: "new",
                glyphicon: "pencil",
                renderCondition: "isAdmin"
            });
            nav.col.add({
                id: 'rss',
                title: 'Subscribe via RSS',
                a: '<img src="/news/rss.ico" height="16" width="16" class="rss">',
                href: "/api/posts?_format=rss"
            });
        },
        bindRouter: function(router) {
            var self = this;
            self.router = router;
            router.on('title', function(title) {
                var $e = $('.pageTitle');
                $e.attr('href', window.location);
                $e.html(title);
            });
            router.on('reset', function() {
                window.onbeforeunload = null;
                $('body').attr('class', '');
                self.nav.unselect();
            });
            router.on('root', function() {
                // router.reset();
                self.loadCollections();
                self.listView.resetViewControls();
                self.$app.append(self.listView.render().$el);
                self.listView.filter();
                self.listView.$el.show().siblings().hide();
                $('#navbar-header-form').show();

                if(self.listView.selectedPost) {
                    // console.log(self.listView.selectedPost.$el);
                    // $('body').scrollTo(self.listView.selectedPost.$el);
                    $('html, body').stop().animate({ 
                        scrollTop: self.listView.selectedPost.$el.offset().top
                    }, 300);
                } else {
                    $('body')[0].scrollTop = 0;
                }
                router.setTitle('Posts');

                self.nav.selectByNavigate('');
                router.trigger('loadingComplete');
            });
            router.route(':slug/edit', 'editSlug', function(slug) {
                router.reset();
                $('#navbar-header-form').hide();
                $('#header').addClass('hideTitle');
                self.findPostBySlug(slug, function(doc) {
                    if(doc) {
                        self.editDoc(doc);
                    } else {
                        if(self.userIsAdmin()) {
                            router.navigate('new', {
                                replace: true,
                                trigger: true
                            });
                        } else {
                            router.navigate('', {
                                replace: true,
                                trigger: true
                            });
                        }
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route(':slug', 'postSlug', function(slug) {
                router.reset();
                $('#navbar-header-form').hide();
                self.$postViewer.siblings().hide();
                self.$postViewer.show();
                self.findPostBySlug(slug, function(doc) {
                    if(doc) {
                        self.carouselDoc(doc);
                    } else {
                        if(self.userIsAdmin()) {
                            router.navigate('new', {
                                replace: true,
                                trigger: true
                            });
                        } else {
                            router.navigate('', {
                                replace: true,
                                trigger: true
                            });
                        }
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('seq/:num', 'seqNum', function(num) {
                router.reset();
                num = parseInt(num, 10);
                self.findPostBySeq(num, function(doc) {
                    if(doc) {
                        router.navigate('posts/' + doc.getNavigatePath(), {
                            replace: true,
                            trigger: true
                        });
                    } else {
                        router.navigate('posts/', {
                            replace: true,
                            trigger: true
                        });
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('by/:userName', 'userPosts', function(name) {
                router.reset();
                router.setTitle('Posts by ' + name);
                self.nav.selectByNavigate('');

                usersCollection.getOrFetchName(name, function(user) {
                    if(user) {
                        console.log(user);
                        self.listView.filter(function(model) {
                            if(user.id !== model.get('owner').id) return false;
                            return true;
                        }, {
                            owner: user.id
                        }, {});
                        self.listView.$el.siblings().hide();
                        self.listView.$el.show();
                        router.trigger('loadingComplete');
                    }
                });
            });
            router.route('tag/:tagName', 'tagPosts', function(tagName) {
                router.reset();
                router.setTitle('Posts tagged ' + tagName);
                self.nav.selectByNavigate('');
                $('body')[0].scrollTop = 0;
                if(self.listView.tagsView && self.listView.tagsView.tagSelectView) {
                    self.listView.tagsView.tagSelectView.selectTagByName(tagName);
                }
                // TODO trigger for callback 

                // self.listView.filter(function(model) {
                //     if(model.has('tags') && model.get('tags').indexOf(tagName) !== -1) {
                //         return true;
                //     } else {
                //         return false;
                //     }
                // });
                self.listView.$el.siblings().hide();
                self.listView.$el.show();
                router.trigger('loadingComplete');
            });
            router.route('id/:id/edit', 'editPost', function(id) {
                router.reset();
                $('#header').addClass('hideTitle');
                self.findPostById(id, function(doc) {
                    if(doc) {
                        self.editDoc(doc);
                    } else {
                        if(self.userIsAdmin()) {
                            router.navigate('new', {
                                replace: true,
                                trigger: true
                            });
                        } else {
                            router.navigate('', {
                                replace: true,
                                trigger: true
                            });
                        }
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('id/:id', 'post', function(id) {
                router.reset();
                self.$postViewer.siblings().hide();
                self.$postViewer.show();
                self.findPostById(id, function(doc) {
                    if(doc) {
                        if(doc.has('slug')) {
                            router.navigate(doc.get('slug'), {
                                trigger: false,
                                replace: true
                            });
                        }
                        self.carouselDoc(doc);
                    } else {
                        // console.log(id);
                        router.navigate('', {
                            replace: true,
                            trigger: true
                        });
                    }
                    router.trigger('loadingComplete');
                });
            });
            router.route('drafts', 'drafts', function() {
                router.reset();
                $('#navbar-header-form').hide();
                self.listView.filterView.filterBy('drafts');
                self.listView.$el.show().siblings().hide();
                router.setTitle('Draft posts');
                self.nav.selectByNavigate('drafts');
                router.trigger('loadingComplete');
            });
            router.route('new', 'new', function() {
                router.reset();
                $('#header').addClass('hideTitle');
                $('#navbar-header-form').hide();
                self.editDoc();
                router.trigger('loadingComplete');
                self.nav.selectByNavigate('new');
            });
        }
    });


    if(define) {
        define(function() {
            return PostsView;
        });
    }

})();