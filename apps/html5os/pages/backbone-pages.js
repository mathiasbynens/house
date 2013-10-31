(function() {
    
    var Model = Backbone.Model.extend({
        collectionName: "pages",
        initialize: function(attr, opts) {
            var colOpts = {
                page: this
            };
            attr.sections = attr.sections || [];
            this.sectionsCollection = new SectionsCollection(attr.sections, colOpts);
            attr.features = attr.features || [];
            this.featuresCollection = new FeaturesCollection(attr.features, colOpts);
            this.views = {};
        },
        getTitleTxt: function() {
            var title = this.get('title');
            return $('<span>'+title+'</span>').text();
        },
        findSectionById: function(id, callback) {
            if(callback) {
                callback(this.sectionsCollection.get(id));
            }
        },
        getOwner: function(callback) {
            if(this.has('owner')) {
                var owner = this.get('owner');
                var user = window.usersCollection.getOrFetch(owner.id, callback);
            }
        },
        getFullView: function(options) {
            options = options || {};
            options.model = this;
            if (!this.fullView) {
                var view = this.fullView = new FullView(options);
                view.on('goToProfile', function(model){
                    options.list.trigger('goToProfile', model);
                });
                this.views.fullView = view;
            }
            return this.fullView;
        },
        getAvatar: function(options) {
            options = options || {};
            options.model = this;
            if (!this.avatar) {
                var view = this.avatar = new AvatarView(options);
                this.views.avatar = view;
            }
            return this.avatar;
        },
        getRow: function(options) {
            options = options || {};
            options.model = this;
            if (!this.row) {
                var row = this.row = new RowView(options);
                this.views.row = row;
            }
            return this.row;
        },
        getBrandView: function(options) {
            options = options || {};
            options.model = this;
            if (!this.brandview) {
                var brandview = this.brandview = new BrandView(options);
                this.views.brandview = brandview;
            }
            return this.brandview;
        },
        getSectionsView: function(opts) {
            return this.sectionsCollection.getView(opts);
        },
        getFeaturesView: function(opts) {
            return this.featuresCollection.getView(opts);
        },
        renderViews: function() {
            for(var i in this.views) {
                this.views[i].render();
            }
        },
        getNavigatePath: function() {
            if(this.has('path')) {
                return this.get('path');
            } else {
                return this.id;
            }
        }
    });
    
    var Section = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            options.model = this;
            return new SectionView(options);
        }
    });
    var Feature = Backbone.Model.extend({
        initialize: function() {},
        getView: function(options) {
            if (!this.hasOwnProperty("row")) {
                options.model = this;
                this.row = this.getNewView(options);
            }
            return this.row;
        },
        getNewView: function(options) {
            options.model = this;
            return new FeatureView(options);
        }
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        collectionName: 'pages',
        url: '/api/pages',
        initialize: function() {
            var self = this;
            self.pageSize = 10;
            this.resetFilters();
            
            require(['/desktop/socket.io.min.js'], function() {
                var socketOpts = {};
                if(window.location.protocol.indexOf('https') !== -1) {
                    socketOpts.secure = true;
                } else {
                    socketOpts.secure = false;
                }
                var socket = self.io = io.connect('//'+window.location.host+'/socket.io/io', socketOpts);
                socket.on('connect', function(data) {
                    //console.log('connected and now joining '+self.collectionName);
                    socket.emit('join', self.collectionName);
                });
                var insertOrUpdateDoc = function(doc) {
                    if(_.isArray(doc)) {
                        _.each(doc, insertOrUpdateDoc);
                        return;s
                    }
                    var model = self.get(doc.id);
                    if(!model) {
                        var model = new self.model(doc);
                        self.add(model);
                    } else {
                        model.set(doc, {silent:true});
                        model.renderViews();
                    }
                }
                socket.on('insertedPosts', function(doc) {
                    insertOrUpdateDoc(doc);
                    self.count++;
                    self.trigger('count', self.count);
                });
                socket.on('updatedPosts', function(doc) {
                    insertOrUpdateDoc(doc);
                });
                socket.on('deletedPosts', function(id) {
                    self.remove(id);
                    self.count--;
                    self.trigger('count', self.count);
                });
                
                self.initialized = true;
                self.trigger('initialized');
            });
        },
        headCount: function(callback) {
            var self = this;
            var aj = $.ajax({type: "HEAD",url: self.url,data: {},
                complete: function(json) {
                    callback(aj.getResponseHeader('X-Count'));
                },xhrFields: {withCredentials: true}
            });
        },
        refreshCount: function() {
            var self = this;
            self.headCount(function(count){
                self.count = count;
                self.trigger('count', count);
            });
        },
        load: function(options, success) {
            var self = this;
            if(!this.count) {
                this.refreshCount();
            }
            if(!options) {
                options = {};
            }
            if(!options.limit) {
                options.limit = self.pageSize;
            }
            if(!options.sort) {
                options.sort = "at-";
            }
            this.applyFilters(options);
            this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                    if(success) {
                        success();
                    }
                },
                error: function(collection, response){
                }
            });
        },
        getNextPage: function(callback) {
            if(this.length < this.count) {
                this.load({skip:this.length}, callback);
            }
        },
        applyFilters: function(options) {
            
        },
        updateFilter: function(filter) {
            this.reset();
            this.load();
        },
        comparator: function(doc) {
            var d;
            if(doc.get("at")) {
                d = new Date(doc.get("at")).getTime();
                return d * -1;
            } else {
                return 1;
            }
        },
        resetFilters: function() {
        },
        getOrFetch: function(id, callback) {
            var self = this;
            var doc;
            doc = this.get(id);
            if(doc) {
                callback(doc);
            } else {
                var options = { "_id": id };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = self.get(id);
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
        getOrFetchPath: function(path, callback) {
            var self = this;
            var doc;
            doc = _.first(this.where({path:path}));
            if(doc) {
                callback(doc);
            } else {
                var options = { "path": path };
                this.fetch({data: options, update: true, remove: false, success: function(collection, response){
                        if(response) {
                            doc = _.first(self.where({path:path}));
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
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("view")) {
                options.collection = this;
                this.view = new ListView(options);
                this.view.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.view;
        },
    });
    
    var SectionsCollection = Backbone.Collection.extend({
        model: Section,
        url: function() {
            return "/api/pages/" + this.options.page.id + "/sections";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new SectionList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        comparator: function(a) {
            return a.get("rank");
        }
    });
    
    var SectionList = Backbone.View.extend({
        tag: "span",
        className: "sections",
        render: function() {
            var self = this;
            this.$actions = $('<ul class="actions"></ul>');
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            //this.$el.append(this.$actions);
            this.setElement(this.$el);
            return this;
        },
        events: {},
        appendModel: function(m) {
            var el = this.$el.find('#'+m.id)[0];
            var row = m.getView({
                list: this,
                el: el
            });
            var rowEl = row.render().$el;
            
            var rank = row.model.get('rank');
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$el.children();
            var last = $lis.last();
            var lastRank = parseInt(last.attr('data-sort-rank'), 10);
            if(rank < lastRank) {
                $lis.each(function(i,e){
                    if(d) return;
                    var r = parseInt($(e).attr('data-sort-rank'), 10);
                    if(rank < r) {
                        $(e).before(rowEl);
                        d = true;
                    }
                });
            }
            if(!d) {
                this.$el.append(rowEl);
            }
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
    
    var FeaturesCollection = Backbone.Collection.extend({
        model: Feature,
        url: function() {
            return "/api/pages/" + this.options.page.id + "/features";
        },
        getView: function(options) {
            var self = this;
            if (!options) options = {};
            if (!this.hasOwnProperty("row")) {
                options.collection = this;
                this.row = new FeatureList(options);
                this.row.on("selected", function(m) {
                    self.trigger("selected", m);
                });
            }
            return this.row;
        },
        initialize: function(models, options) {
            var self = this;
            if (!options) {
                options = models;
            }
            this.options = options;
        },
        comparator: function(a) {
            return a.get("rank");
        }
    });
    
    var FeatureList = Backbone.View.extend({
        tag: "div",
        className: "carousel slide",
        initialize: function() {
            var self = this;
            this.collection.on("add", function(m) {
                self.appendModel(m);
            });
            this.collection.on("reset", function() {
            });
            this.interval = 12400;
            this.isPlaying = false;
            this.$inner = this.$el.find('.carousel-inner');
            if(this.$inner.length === 0) {
                this.$inner = $('<div class="carousel-inner"></div>');
            }
            this.$indicators = this.$el.find('.carousel-indicators');
            if(this.$indicators.length === 0) {
                this.$indicators = $('<ol class="carousel-indicators"></ol>');
            }
        },
        render: function() {
            var self = this;
            //this.$ul = $('<div class=""></div>');
            //this.$actions = $('<ul class="actions"></ul>');
            //this.$el.html("");
            //this.$el.hide();
            this.collection.each(function(m, i, c) {
                self.appendModel(m);
            });
            //this.$el.append(this.$actions);
            if(!this.hasOwnProperty('featureCarosel')) {
                var $c = $('.carousel');
                window.car = self.featureCarosel = $c;
                
                if(!this.options.onePageSlide) {
                    $c.prepend(this.$inner);
                    $c.prepend(this.$indicators);
                    if($c.find('.active').length === 0) {
                        $c.find('.carousel-inner').children().first().addClass('active');
                        $c.find('ol').children().first().addClass('active');
                    }
                    self.featureCarosel = $c.carousel({
                        interval: false,
                        hover: "pause"
                    });
                    self.play();
                } else {
                    require([ "https://raw.github.com/peachananr/onepage-scroll/master/jquery.onepage-scroll.js" ], function() {
                        $("#home").onepage_scroll({sectionContainer: ".item", easing: "ease", animationTime: 1000, pagination: true, updateURL: false});
                    });
                }
            } else {
                if(!this.options.onePageSlide) {
                } else {
                    $("#home").onepage_scroll({sectionContainer: ".item", easing: "ease", animationTime: 1000, pagination: true, updateURL: false});
                }
            }
            this.setElement(this.$el);
            return this;
        },
        next: function() {
            this.featureCarosel.carousel('next');
        },
        prev: function() {
            this.featureCarosel.carousel('prev');
        },
        goto: function(n) {
            this.featureCarosel.carousel(n);
        },
        pause: function() {
            this.featureCarosel.carousel('pause');
            this.isPlaying = false;
            clearTimeout(this.featureCaroselTimeout);
            delete this.featureCaroselTimeout;
        },
        play: function() {
            var self = this;
            if(!this.isPlaying) {
                this.isPlaying = true;
                self.playNext();
            }
        },
        playNext: function() {
            var self = this;
            this.featureCaroselTimeout = setTimeout(function(){
                self.featureCarosel.carousel('next');
                self.playNext();
            },this.interval);
        },
        events: {},
        appendModel: function(m) {
            if(!this.modelSeq) {
                this.modelSeq = {};
            }
            if(!this.modelSeq.hasOwnProperty(m.id)) {
                this.modelSeq[m.id] = _.size(this.modelSeq);
            }
            if(!this.options.onePageSlide) {
                var el = this.$inner.find('[data-id="'+m.id+'"]')[0];
            } else {
                var el = this.$el.find('[data-id="'+m.id+'"]')[0];
            }
            var row = m.getView({
                list: this,
                el: el
            });
            var rowEl = row.render().$el;
            
            var rank = row.model.get('rank');
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$inner.children();
            var last = $lis.last();
            var lastRank = parseInt(last.attr('data-sort-rank'), 10);
            if(rank < lastRank) {
                $lis.each(function(i,e){
                    if(d) return;
                    var r = parseInt($(e).attr('data-sort-rank'), 10);
                    if(rank < r) {
                        $(e).before(rowEl);
                        d = true;
                    }
                });
            }
            if(!d) {
                this.$inner.append(rowEl);
            }
            var $r = this['$r'+m.id] = $('<li data-target="#home" data-slide-to="'+this.modelSeq[m.id]+'"></li>');
            this.$indicators.append($r);
        }
    });
    
    var ListView = Backbone.View.extend({
        layout: 'row',
        initialize: function() {
            var self = this;
            self.loading = false;
            this.$pager = $('<div class="list-pager">showing <span class="list-length"></span> of <span class="list-count"></span> posts</div>');
            var $ul = this.$ul = $('<ul class="images"></ul>');
            this.collection.on('add', function(doc) {
                var view;
                if(self.layout === 'row') {
                    view = doc.getRow({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatar({list: self});
                }
                self.appendRow(view);
                self.renderPager();
                doc.on('remove', function(){
                    view.$el.remove();
                    return false;
                });
            });
            this.collection.on('remove', function(doc, col, options) {
                self.renderPager();
            });
            this.collection.on('count', function() {
                self.renderPager();
            });
            this.collection.on('reset', function(){
                self.render();
            });
            
            $(window).scroll(function(){
                if(self.$el.is(":visible")) {
                  if(!self.loading && $(window).scrollTop() + 250 >= $(document).height() - $(window).height()){
                    self.loading = true;
                    self.loadMore();
                  }
                }
            });
        },
        filter: function(f) {
            var self = this;
            if(f && typeof f == 'function') {
                this.currentFilter = f;
                this.collection.filter(function(model) {
                  if(f(model)) {
                      self.getDocLayoutView(model).$el.show();
                      return true;
                  }
                  self.getDocLayoutView(model).$el.hide();
                  return false;
                });
            } else {
                // show all
                self.$ul.children().show();
                self.currentFilter = false;
            }
        },
        events: {
          "click .list-pager": "loadMore",
        },
        loadMore: function() {
            var self = this;
            this.collection.getNextPage(function(){
                self.loading = false;
            });
        },
        getDocLayoutView: function(doc) {
            var view;
            if(this.layout === 'row') {
                view = doc.getRow({list: self});
            } else if(this.layout === 'avatar') {
                view = doc.getAvatar({list: self});
            }
            return view;
        },
        render: function() {
            var self = this;
            this.$el.html('');
            this.$el.append(this.$ul);
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view = self.getDocLayoutView(doc);
                self.appendRow(view);
            });
            this.$el.append(this.$pager);
            this.renderPager();
            this.trigger('resize');
            this.setElement(this.$el);
            return this;
        },
        renderPager: function() {
            var len = this.collection.length;
            var c = this.collection.count > len ? this.collection.count : len;
            this.$pager.find('.list-length').html(len);
            this.$pager.find('.list-count').html(c);
        },
        appendRow: function(row) {
            var rank = new Date(row.model.get('at'));
            rank = rank.getTime();
            var rowEl = row.render().$el;
            if(this.currentFilter && !this.currentFilter(row.model)) {
                rowEl.hide();
            }
            rowEl.attr('data-sort-rank', rank);
            var d = false;
            var $lis = this.$ul.children();
            var last = $lis.last();
            var lastRank = parseInt(last.attr('data-sort-rank'), 10);
            if(rank > lastRank) {
                $lis.each(function(i,e){
                    if(d) return;
                    var r = parseInt($(e).attr('data-sort-rank'), 10);
                    if(rank > r) {
                        $(e).before(rowEl);
                        d = true;
                    }
                });
            }
            if(!d) {
                this.$ul.append(rowEl);
            }
        }
    });
    
    var SectionView = Backbone.View.extend({
        tagName: "div",
        className: "featurette",
        initialize: function() {
            var self = this;
            if(window.pages) {
                pages.on("refreshUser", function(user) {
                    self.render();
                });
            }
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        render: function() {
            var self = this;
            var desc = '';
            if(this.model.has('title')) {
                desc = '<span class="muted">'+this.model.get('title')+'</span>';
            }
            if(this.$el.find('h2').length == 0) {
                this.$el.prepend('<h2 class="featurette-heading container">'+this.model.get('name')+desc+'</h2>');
            } else {
                this.$el.find('h2').html(this.model.get('name')+desc);
            }
            
            if(this.model.has('html')) {
                var doFeedbackView = false;
                var doMapView = false;
                var doGalleryView = false;
                var html = this.model.get('html');
                if(this.$el.find('.sectionHtml').length == 0) {
                    this.$el.append('<div class="sectionHtml container">'+this.model.get('html')+'</div>');
                } else {
                    this.$el.find('.sectionHtml').html(html);
                }
                var sectionHtml = this.$el.find('.sectionHtml');
                var fstropen = '[[feedback';
                var iof = html.indexOf(fstropen);
                var iofend = html.indexOf(']]', iof);
                if(iof !== -1) {
                    //console.log('feedback form in section')
                    var opts = {};
                    var feedbackOpts = html.substring(iof+fstropen.length+1, iofend);
                    feedbackOpts = feedbackOpts.split('|');
                    for(var i in feedbackOpts){
                        var option = feedbackOpts[i].split('=');
                        opts[option[0]] = option[1];
                    }
                    html = html.substr(0, iof+fstropen.length) + html.substr(iofend);
                    html = html.replace('[[feedback]]', '<span class="feedback container"></span>');
                    
                    this.$el.find('.sectionHtml').html(html);
                    doFeedbackView = true;
                }
                
                // GALLERY
                var procGallery = function(g) {
                    var gallerystropen = '[[gallery';
                    var iofgallery = html.indexOf(gallerystropen);
                    var iofgalleryend = html.indexOf(']]', iofgallery);
                    if(iofgallery !== -1) {
                        var gallery_options = {};
                        var galleryOpts = html.substring(iofgallery+gallerystropen.length+1, iofgalleryend);
                        galleryOpts = galleryOpts.split('|');
                        for(var i in galleryOpts){
                            var galleryeqi = galleryOpts[i].indexOf('=');
                            var galleryOptName = galleryOpts[i].substr(0, galleryeqi);
                            var galleryOptVal = galleryOpts[i].substr(galleryeqi+1);
                            //var galleryoption = galleryOpts[i].split('=');
                            //opts[option[0]] = galleryoption[1];
                            gallery_options[galleryOptName] = galleryOptVal;
                        }
                        html = html.substr(0, iofgallery+gallerystropen.length) + html.substr(iofgalleryend);
                        gallery_options.className = 'gallery'+g;
                        var $g = $(gallery_options.a);
                        if($g.length == 0) {
                            $g = $('<span>'+gallery_options.a+'</span>');
                        }
                        html = html.replace('[[gallery]]', $g.addClass(gallery_options.className)[0].outerHTML);
                        
                        if($('#blueimp-gallery').length === 0) {
                            var galleryBox = '<div id="blueimp-gallery" class="blueimp-gallery">\n\
        <div class="slides"></div>\n\
        <h3 class="title"></h3>\n\
        <a class="prev">‹</a>\n\
        <a class="next">›</a>\n\
        <a class="close">×</a>\n\
        <a class="play-pause"></a>\n\
        <ol class="indicator"></ol>\n\
        <div class="modal fade">\n\
            <div class="modal-dialog">\n\
                <div class="modal-content">\n\
                    <div class="modal-header">\n\
                        <button type="button" class="close" aria-hidden="true">&times;</button>\n\
                        <h4 class="modal-title"></h4>\n\
                    </div>\n\
                    <div class="modal-body next"></div>\n\
                    <div class="modal-footer">\n\
                        <button type="button" class="btn btn-default pull-left prev">\n\
                            <i class="glyphicon glyphicon-chevron-left"></i>\n\
                            Previous\n\
                        </button>\n\
                        <button type="button" class="btn btn-primary next">\n\
                            Next\n\
                            <i class="glyphicon glyphicon-chevron-right"></i>\n\
                        </button>\n\
                    </div>\n\
                </div>\n\
            </div>\n\
        </div>\n\
    </div>';
                            $('body').append($(galleryBox));
                        }
                        
                        self.$el.find('.sectionHtml').html(html);
                        doGalleryView = true;
                        
                        return gallery_options;
                    }
                    return false;
                }
                var galleries = [];
                var g = 1;
                while(g > 0) {
                    var gallery = procGallery(g);
                    if(!gallery) {
                        g = 0;
                    } else {
                        galleries.push(gallery);
                        g = g+1;
                    }
                }
                
                
                
                // MAP
                var mapStrOpen = '[[map';
                //<span class="pull-right"><iframe width="425" alt="" src="https://www.google.com/maps?
                //sll=33.8590794564068,-117.90525272906511
                //&amp;sspn=0.006833748256374074,0.014924553893220007
                //&amp;t=p
                //&amp;q=1232+E+Orangethorpe+Ave,+Fullerton,+CA+92831
                //&amp;ie=UTF8
                //&amp;hq=
                //&amp;hnear=1232+E+Orangethorpe+Ave,+Fullerton,+California+92831
                //&amp;ll=34.082237,-117.90802
                //&amp;spn=0.796181,1.167297
                //&amp;z=9
                //&amp;iwloc=A
                //&amp;output=embed" height="350"></iframe></span>
                html = sectionHtml.html();
                var iof = html.indexOf(mapStrOpen);
                var iofend = html.indexOf(']]', iof);
                if(iof !== -1) {
                    //console.log('map form in section')
                    var mapOpts = {
                        width: 600,
                        height: 350,
                        markerLabelColor: 'blue',
                        zoom: 11
                    };
                    var mapOptsStr = html.substring(iof+mapStrOpen.length+1, iofend);
                    var mapOptsIn = mapOptsStr.split('|');
                    for(var i in mapOptsIn){
                        var option = mapOptsIn[i].split('=');
                        mapOpts[option[0]] = option[1];
                    }
                    html = html.substr(0, iof+mapStrOpen.length) + html.substr(iofend);
                    var locStr = mapOpts.loc.replace(/ /g, '+');
                    var centerLocStr = locStr;
                    if(mapOpts.center) {
                        centerLocStr = mapOpts.center.replace(/ /g, '+');
                    }
                    html = html.replace('[[map]]', '<span class="map"></span>');
                    this.$el.find('.sectionHtml').html(html);
                    doMapView = true;
                }
                
                if(galleries.length > 0) {
                    galleries.forEach(function(e, x){
                        self.$el.find('.sectionHtml .'+e.className).on('click', function (event) {
                            event.preventDefault();
                            var $j = $('<span>'+e.items+'</span>');
                            var items = [];
                            $j.find('img').each(function(i,e){
                                var $e = $(e);
                                items.push({href: $e.attr('src'), title: $e.attr('alt')});
                            })
                            blueimp.Gallery(items, {useBootstrapModal: true});
                        });
                    });
                }
                
                if(doFeedbackView) {
                    var saveMsg = opts.saveMsg || 'Thank you for your feedback!';
                    if(MsgsBackbone) {
                        if(!this.msgForm) {
                            this.msgForm = new window.MsgsBackbone.Form({
                                collection: window.msgsCollection,
                                ui: opts
                            });
                            this.msgForm.on("saved", function(doc) {
                                alert(saveMsg);
                                self.msgForm.clear();
                            });
                        }
                        var $form = this.msgForm.render().$el;
                        //$form.show();
                        
                        if(opts.modal && opts.modal !== 'false') {
                            if(!this.feedbackModal) {
                                var modalOpts = {body: $form};
                                if(opts.title) {
                                    modalOpts.title = opts.title;
                                }
                                this.feedbackModal = utils.getNewModalContent(modalOpts);
                            }
                            //this.$el.find('.sectionHtml .feedback').html('asdasdas');
                            this.$el.find('.sectionHtml .feedback').append(this.feedbackModal.render().$el);
                        } else {
                            this.$el.find('.sectionHtml .feedback').append(this.msgForm.render().$el);
                        }
                    }
                }
                if(doMapView) {
                    if(mapOpts.align) {
                        var pullStr = 'pull-'+mapOpts.align;
                        this.$el.find('.sectionHtml .map').addClass(pullStr);
                    }
                    
/*https://maps.google.com/maps?f=q
source=s_q
<iframe width="999" height="222" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="
hl=en
geocode=
q=1232+E+Orangethorpe+Ave%E2%80%8E+Fullerton,+CA+92831
sll=33.859077,-117.905243
sspn=0.012723,0.022724
ie=UTF8
hq=
hnear=1232+E+Orangethorpe+Ave,+Fullerton,+California+92831
t=m
ll=33.859084,-117.905273
spn=0.015823,0.085745
z=14
iwloc=A
output=embed"></iframe>*/

                    
                    if(mapOpts.embed && mapOpts.embed !== 'false') {
                        this.$el.find('.sectionHtml .map').html('<iframe width="'+mapOpts.width+'" height="'+mapOpts.height+'" alt="Location: '+mapOpts.loc+'" src="https://www.google.com/maps?q='+locStr+'&amp;t=p&amp;iwloc=A&amp;iwloc=A&amp;output=embed&amp;z='+mapOpts.zoom+'&amp;hnear='+centerLocStr+'"></iframe>');
                    } else {
                        this.$el.find('.sectionHtml .map').html('<img width="100%" height="'+mapOpts.height+'" alt="Location: '+mapOpts.loc+'" src="http://maps.googleapis.com/maps/api/staticmap?center='+centerLocStr+'&zoom='+mapOpts.zoom+'&size='+mapOpts.width+'x'+mapOpts.height+'&sensor=false&visual_refresh=true&markers=size:normal%7Ccolor:'+mapOpts.markerLabelColor+'%7C'+locStr+'">');
                    }
                }
            }
            
            // check for H3's and add them to our subnav
            var subs = [];
            this.$el.find('.sectionHtml h3').each(function(i,e){
                var $e = $(e);
                var txt = $e.text();
                var elStr = txt.replace(/[^a-zA-Z0-9\s]/g,"").toLowerCase().replace(/ /gi, '-');
                $e.attr('id', elStr);
                if(txt && txt != '') {
                    //self.options.list.trigger('addToNavSub', self.model, txt);
                    subs.push(txt);
                }
            });
            if(subs.length > 0) {
                self.options.list.trigger('addToNavSubs', self.model, subs);
            }
            
            if(window.account && (account.isAdmin()) && this.$el.find('.actions').length == 0) {
                this.$actions = $('<ul class="actions container"></ul>');
                this.$actions.append('<li><button class="edit">Edit</button></li><li><button class="moveUp" title="rank ' + this.model.get("rank") + '">Move Up</button></li><li><button class="remove">Remove</button></li><li><button class="new">New</button></li>');
                this.$el.append(this.$actions);
            }
            
            this.$el.attr("data-name", this.model.get("name"));
            this.$el.attr("id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .edit": "edit",
            "click .new": "newthing",
            "click .moveUp": "moveUp",
            "click .remove": "removeit",
        },
        newthing: function(e) {
            var m = new Section();
            this.model.collection.add(m);
            m.getView().edit();
            return false;
        },
        edit: function(e) {
            var self = this;
            this.$el.addClass('editing');
            this.form = new SectionForm({model: this.model, collection: this.model.collection});
            this.form.on('saved', function(){
                self.model.trigger('change');
                self.$el.removeClass('editing');
                self.form.$el.remove();
            });
            this.form.on('cancelled', function(model){
                self.$el.removeClass('editing');
                self.form.$el.remove();
            });
            this.$el.append(this.form.render().$el);
            this.form.wysiEditor();
            this.form.focus();
            return false;
        },
        moveUp: function(e) {
            var self = this;
            self.model.collection.sort({
                silent: true
            });
            var r = self.model.get("rank");
            var sibId = this.$el.prev().attr("id");
            if (sibId) {
                var swapModel = self.model.collection.get(sibId);
                if (swapModel) {
                    var higherRank = swapModel.get("rank");
                    if (higherRank == r) {
                        r++;
                    }
                    swapModel.set({
                        rank: r
                    },{silent: true});
                    var sm = swapModel.save(null, {
                        wait: true, silent: false
                    }).done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                        self.options.list.render();
                    });
                    if (higherRank != self.model.get("rank")) {
                        self.model.set({
                            rank: higherRank
                        }, {silent: true});
                        var s = self.model.save(null, {
                            wait: true, silent: false
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
            if(confirm("Are you sure that you want to delete this section?")) {
                this.model.destroy();
            }
            e.stopPropagation();
            e.preventDefault();
            return false;
        },
        select: function() {
            if (this.options.list) {
                this.options.list.trigger("selected", this);
            }
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    var FeatureView = Backbone.View.extend({
        tagName: "div",
        className: "item",
        initialize: function() {
            var self = this;
            if(window.pages) {
                pages.on("refreshUser", function(user) {
                    self.render();
                });
            }
            
            self.uploadFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'image', metadata:{groups: ['public']}});
            self.uploadFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(data.image) {
                    var setDoc = {
                        image: data.image
                    }
                    self.model.set(setDoc, {silent: true});
                    var saveModel = self.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.trigger("newFeatureImage", self.model);
                        });
                    }
                }
            });
            this.$actions = $('<ul class="actions"></ul>');
            if(window.account && (account.isAdmin())) {
                this.$actions.append('<li><button class="edit">Edit</button></li><li class="image"><button class="attach">Attach image</button></li><li><button class="moveUp" title="rank ' + this.model.get("rank") + '">Move Up</button></li><li><button class="remove">Remove</button></li><li><button class="new">New</button></li>');
            }
            
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        render: function() {
            var self = this;
            var $e = this.$el.find('.container');
            var src = 'img/slide-01.jpg';
            if(this.model && this.model.has('image') && this.model.get('image').filename) {
                src = this.model.get('image').filename;
            }
            if($e.length > 0) {
                
            } else {
                $e = $('<div class="container"><div class="carousel-caption"><h1></h1><p class="caption"></p><p><a class="btn btn-large btn-default" href="#">See more</a></p></div></div>');
                this.$el.append($e);
            }
            if(this.$el.find('img[src="/api/files/'+src+'"]').length == 0) {
                this.$el.find('img').remove();
                this.$el.prepend('<img src="/api/files/'+src+'" />'); ///api/files/' + this.model.get("filename") + '
            }
            var $cap = $e.find('.carousel-caption');
            if(this.model.has('title')) {
                $e.find('h1').html(this.model.get('title'));
            }
            if(this.model.has('desc')) {
                $e.find('.caption').html(nl2br(this.model.get('desc')));
            }
            if(this.model.has('href')) {
                var  a = this.model.get('a') || 'See more';
                $e.find('a').attr('href', this.model.get('href'));
                $e.find('a').html(a);
            }
            
            if(window.account && (account.isAdmin()) && $e.find('.action').length == 0) {
                this.$el.append(self.uploadFrame.render().$el); //this.$actions.find('.image')
                this.$el.append(this.$actions);
            }
            
            this.$el.attr("data-id", this.model.get("id"));
            this.setElement(this.$el);
            return this;
        },
        events: {
            "click .carousel-caption": "select",
            "click .attach": "attachImage",
            "click .edit": "edit",
            "click .new": "newthing",
            "click .moveUp": "moveUp",
            "click .remove": "removeit"
        },
        attachImage: function(e) {
            this.uploadFrame.pickFiles();
            return false;
        },
        newthing: function(e) {
            var m = new Feature();
            this.model.collection.add(m);
            m.getView().edit();
            return false;
        },
        edit: function(e) {
            var self = this;
            this.$el.addClass('editing');
            this.form = new FeatureForm({model: this.model, collection: this.model.collection});
            this.form.on('saved', function(model){
                self.model.trigger('change');
                self.$el.removeClass('editing');
                self.form.$el.remove();
            });
            this.form.on('cancelled', function(model){
                self.$el.removeClass('editing');
                self.form.$el.remove();
            });
            this.$el.append(this.form.render().$el);
            this.form.focus();
            //e.stopPropagation();
            //e.preventDefault();
            this.options.list.pause();
            //this.options.list.goto(this.options.list.$el.find('.item').length-1);
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
                    swapModel.set({
                        rank: r
                    },{silent: true});
                    var sm = swapModel.save(null, {
                        wait: true, silent: false,
                    }).done(function(s, typeStr, respStr) {
                        self.render();
                        self.model.collection.sort({
                            silent: true
                        });
                        self.options.list.render();
                    });
                    if (higherRank != self.model.get("rank")) {
                        self.model.set({
                            rank: higherRank
                        },{silent: true});
                        var s = self.model.save(null, {
                            wait: true, silent: false,
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
        select: function(e) {
            var $e = $(e.target);
            var $pv = this.$el.find('.playVideo');
            if($pv.length > 0) {
                if($pv.has($e).length > 0) {
                    //$e.siblings().show();
                    var ytid = $pv.attr('data-ytid');
                    var ifr = '<iframe width="'+$pv.width()+'" height="'+$pv.height()+'" src="http://www.youtube.com/embed/'+ytid+'?autohide=1&fs=1&autoplay=1&iv_load_policy=3&rel=0&modestbranding=1&showinfo=0&hd=1" frameborder="0" allowfullscreen></iframe>';
                    $e.hide();
                    $pv.append(ifr);
                    if(this.options.list) {
                        this.options.list.pause();
                    }
                    
                    return false;
                }
            }
            if (!this.$el.hasClass('editing') && this.options.list) {
                this.options.list.trigger("selected", this);
            }
            return false;
        },
        remove: function() {
            this.$el.remove();
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
            //self.$el.append(this.deleteView.render().$el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.actions = [];
            //this.groupsView = new GroupsView({id: this.id, model: this.model});
            //this.tagsView = new TagsView({id: this.id, model: this.model});
            //this.deleteView = new ActionDeleteView({id: this.id, model: this.model});
            this.editView = new ActionEditView({id: this.id, model: this.model});
        }
    });

    var ActionDeleteView = Backbone.View.extend({
        tagName: "span",
        className: "delete",
        render: function() {
            this.$el.html('<button>delete</button>');
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
            if(confirm("Are you sure that you want to delete this page?")) {
                this.model.destroy({success: function(model, response) {
                  window.history.back(-1);
                }, 
                error: function(model, response) {
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
            this.$el.html('<button>edit</button>');
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
    
    
    var BrandView = Backbone.View.extend({
        tagName: "a",
        className: "brand",
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            //this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            if(this.model.has('title')) {
                this.$el.html(this.model.get('title'));
                
                $('.pageTitle').html(this.model.get('title')); // in our footer
            }
            if(this.model.has('desc')) {
                this.$el.attr('title', this.model.get('desc'));
            }
            if(this.model.has('logo')) {
                var logoImage = this.model.get('logo');
                if(this.$el.css('background-image').indexOf('/api/files/'+logoImage.filename) === -1) {
                    this.$el.css('background-image', 'url("/api/files/'+logoImage.filename+'")');
                }
                this.$el.css('background-size', '100%');
                this.$el.css('color', 'transparent');
            }
            
            if(window.account && (account.isAdmin()) && this.$el.find('.edit').length == 0) {
                this.$el.append('<button class="edit">edit</button>');
            }
            
            this.$el.attr('data-id', this.model.id);
            //this.$el.append(this.actions.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
          "click": "select",
          "click .edit": "edit"
        },
        edit: function(e) {
            var self = this;
            this.$el.addClass('editing');
            this.form = new FormView({model: this.model, collection: this.model.collection});
            this.form.on('saved', function(){
                self.model.trigger('change');
                self.$el.removeClass('editing');
                self.form.$el.remove();
            });
            this.form.on('cancelled', function(){
                self.$el.removeClass('editing');
                self.form.$el.remove();
            });
            this.$el.after(this.form.render().$el);
            this.form.focus();
            return false;
        },
        select: function(e) {
            this.trigger('gohome');
            return false;
        },
        remove: function() {
          this.$el.remove();
        }
    });


    var RowView = Backbone.View.extend({
        tagName: "li",
        className: "row",
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            //this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            this.$el.html('');
            var $byline = $('<span class="byline"></span>');
            if(this.model.has('title')) {
                this.$el.append('<strong class="title">'+this.model.get('title')+'</strong>');
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
                $byline.append(' by '+this.model.get('owner').name);
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
    
    var FullView = Backbone.View.extend({
        tagName: "div",
        className: "fullView",
        initialize: function(options) {
            var self = this;
            if(options.list) {
                this.list = options.list;
            }
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            this.actions = new ActionsView({id: this.id, model: this.model});
        },
        render: function() {
            var self = this;
            this.$el.html('');
            var $byline = $('<span></span>');
            if(this.model.has('title')) {
                this.$el.append('<h1 class="title">'+this.model.get('title')+'</h1>');
            }
            if(this.model.has('owner')) {
                $byline.append(' <i>by</i> <span class="owner">'+this.model.get('owner').name+'</span>');
                $byline.attr('data-owner-id', this.model.get('owner').id);
                var owner = this.model.getOwner(function(owner){
                    if(owner) {
                        $byline.find('.owner').html('');
                        var ownerAvatarName = owner.getAvatarNameView();
                        ownerAvatarName.on('goToProfile', function(user){
                            self.trigger('goToProfile', user);
                        });
                        $byline.find('.owner').append(ownerAvatarName.render().$el);
                    }
                });
            }
            if(this.model.has('at')) {
                var $at = $('<span class="at"></span>');
                if(window.clock) {
                    $at.attr('title', clock.moment(this.model.get('at')).format('LLLL'));
                    $at.html(clock.moment(this.model.get('at')).calendar());
                } else {
                    $at.html(this.model.get('at'));
                }
                $byline.append(' ');
                $byline.append($at);
            }
            if(this.model.has('msg')) {
                var $msg = $('<span class="msg"></span>');
                $msg.html(this.model.get('msg'));
                this.$el.append($msg);
            }
            this.$el.append($byline);
            
            if(window.account && (account.isAdmin() || account.isOwner(this.model.get('owner').id))) {
                this.$el.append(this.actions.render().$el);
            }
            this.trigger('resize');
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            return this;
        },
        renderActions: function() {
            this.actions.render();
        },
        show: function() {
            this.$el.show();
        },
        events: {
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    
    window.nl2br = function(str) {
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + "<br />");
    };
    
    var AvatarView = Backbone.View.extend({
        tagName: "span",
        className: "avatar",
        render: function() {
            this.$el.html('');
            var $byline = $('<span class="byline"></span>');
            if(this.model.has('title')) {
                this.$el.append('<strong class="title">'+this.model.get('title')+'</strong>');
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
                $byline.append(' by '+this.model.get('owner').name);
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
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
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
    var FormView = Backbone.View.extend({
        tagName: "div",
        className: "form",
        initialize: function() {
            var self = this;
            if(this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
            } else {
                if(!this.model) {
                    this.model = new Model({}, {
                        collection: this.collection
                    });
                } else {
                }
            }
            
            self.uploadFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'image', metadata:{groups: ['public']}});
            self.uploadFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(data.image) {
                    var setDoc = {
                        logo: data.image
                    }
                    self.model.set(setDoc, {silent: true});
                    var saveModel = self.model.save(null, {
                        silent: false,
                        wait: true
                    });
                    if(saveModel) {
                        saveModel.done(function() {
                            self.trigger("newFeatureImage", self.model);
                            self.render();
                        });
                    }
                }
            });
            
            this.$inputTitle = $('<input type="text" name="title" placeholder="Title of your page" autocomplete="off" />');
            this.$inputDesc = $('<input type="text" name="desc" placeholder="Description" autocomplete="off" />');
            this.$inputPath = $('<input type="text" name="path" placeholder="/ path" autocomplete="off" />');
            this.$form = $('<form class="page"><fieldset></fieldset><div class="controls"></div></form>');
            this.$form.find('fieldset').append(this.$inputTitle);
            this.$form.find('fieldset').append(this.$inputDesc);
            this.$form.find('fieldset').append(this.$inputPath);
            this.$el.append('<button class="attach">Upload logo</button>');
            this.$el.append('<button class="publish">Publish site</button>');
            this.$form.find('.controls').append('<input type="submit" value="Save" />');
            this.$form.find('.controls').append('<button class="cancel">cancel</button>');
        },
        render: function() {
            var self = this;
            if(this.$el.find('form').length === 0) {
                this.$el.append(this.$form);
            }
            if(this.model) {
                if(this.model.has('title')) {
                    this.$inputTitle.val(this.model.get('title'));
                }
                if(this.model.has('path')) {
                    this.$inputPath.val(this.model.get('path'));
                }
                if(this.model.has('desc')) {
                    this.$inputDesc.val(this.model.get('desc'));
                }
                if(this.model.has('logo')) {
                    this.$inputTitle.css('background-image', 'url("/api/files/'+this.model.get('logo').filename+'")');
                }
            }
            this.$el.append(self.uploadFrame.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "submit form": "submit",
            "click .attach": "attachImage",
            "click .publish": "publish",
            'click input[type="submit"]': "submit",
            'click button.cancel': "cancel",
            'keyup input[name="title"]': "throttleTitle",
            'blur input[name="title"]': "blurTitle"
        },
        attachImage: function() {
            this.uploadFrame.pickFiles();
            return false;
        },
        reset: function() {
        },
        cancel: function() {
            var self = this;
            //if(confirm("Are you sure that you want to cancel your changes?")) {
                self.trigger("cancelled", this.model);
            //}
            return false;
        },
        publish: function() {
            this.model.set({publish: window.location.href}, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false ,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    window.location.reload();
                });
            }
            return false;
        },
        blurTitle: function() {
            var titleStr = this.$inputTitle.val().trim();
            if(titleStr != '') {
                // autosave
            }
        },
        throttleTitle: _.debounce(function(){
            this.refreshTitle.call(this, arguments);
        }, 300),
        refreshTitle: function(e) {
            var titleStr = this.$inputTitle.val().trim();
            this.trigger('title', titleStr);
        },
        submit: function() {
            var self = this;
            var setDoc = {};
            var title = this.$inputTitle.val();
            var desc = this.$inputDesc.val();
            var path = this.$inputPath.val();
            if(title !== '' && title !== this.model.get('title')) {
                setDoc.title = title;
            }
            if(desc !== '' && desc !== this.model.get('desc')) {
                setDoc.desc = desc;
            }
            if(path !== '' && path !== this.model.get('path')) {
                setDoc.path = path;
            }
            this.model.set(setDoc, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false ,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.trigger("saved", self.model);
                    self.collection.add(self.model);
                });
            } else {
                self.trigger("saved", self.model);
            }
            return false;
        },
        focus: function() {
            this.$inputTitle.focus();
        },
        remove: function() {
            this.$el.remove();
        }
    });
    
    var FeatureForm = Backbone.View.extend({
        tagName: "div",
        className: "form",
        initialize: function() {
            var self = this;
            if(this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
            } else {
                if(!this.model) {
                    this.model = new Feature({}, {
                        collection: this.collection
                    });
                } else {
                }
            }
            this.$inputTitle = $('<input type="text" name="title" placeholder="Title of your feature" autocomplete="off" />');
            this.$inputDesc = $('<textarea name="desc" placeholder="Your message..."></textarea>');
            this.$inputA = $('<input type="text" name="a" placeholder="Show more" autocomplete="off" />');
            this.$inputHref = $('<input type="text" name="href" placeholder="section name ex. about, contact or http://google.com" autocomplete="off" />');
            
            this.$form = $('<form class="feature"><fieldset></fieldset><div class="controls"></div></form>');
            this.$form.find('fieldset').append(this.$inputTitle);
            this.$form.find('fieldset').append(this.$inputDesc);
            this.$form.find('fieldset').append(this.$inputA);
            this.$form.find('fieldset').append(this.$inputHref);
            this.$form.find('.controls').append('<input type="submit" value="Save" /> <button class="cancel">cancel</button>');
        },
        render: function() {
            var self = this;
            if(this.$el.find('form').length === 0) {
                this.$el.append(this.$form);
            }
            if(this.model) {
                if(this.model.has('title')) {
                    this.$inputTitle.val(this.model.get('title'));
                }
                if(this.model.has('desc')) {
                    this.$inputDesc.val(this.model.get('desc'));
                }
                if(this.model.has('href')) {
                    this.$inputHref.val(this.model.get('href'));
                }
                if(this.model.has('a')) {
                    this.$inputA.val(this.model.get('a'));
                }
            }
            this.setElement(this.$el);
            return this;
        },
        events: {
            "submit form": "submit",
            'click [type="submit"]': "submit",
            'click .cancel': "cancel",
            'keyup input[name="title"]': "throttleTitle",
            'blur input[name="title"]': "blurTitle"
        },
        cancel: function() {
            var self = this;
            if(confirm("Are you sure that you want to cancel your chagnes?")) {
                self.trigger("cancelled", this.model);
            }
            return false;
        },
        blurTitle: function() {
            var titleStr = this.$inputTitle.val().trim();
            if(titleStr != '') {
                // autosave
            }
        },
        throttleTitle: _.debounce(function(){
            this.refreshTitle.call(this, arguments);
        }, 300),
        refreshTitle: function(e) {
            var titleStr = this.$inputTitle.val().trim();
            this.trigger('title', titleStr);
        },
        submit: function() {
            var self = this;
            var setDoc = {};
            var title = this.$inputTitle.val();
            var desc = this.$inputDesc.val();
            var href = this.$inputHref.val();
            var a = this.$inputA.val();
            if(title !== '' && title !== this.model.get('title')) {
                setDoc.title = title;
            }
            if(desc !== '' && desc !== this.model.get('desc')) {
                setDoc.desc = desc;
            }
            if(a !== '' && a !== this.model.get('a')) {
                setDoc.a = a;
            }
            if(href !== '' && href !== this.model.get('href')) {
                setDoc.href = href;
            }
            this.model.set(setDoc, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false ,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.trigger("saved", self.model);
                    self.collection.add(self.model);
                });
            } else {
                self.trigger("saved", self.model);
            }
            return false;
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
            this.$html = $('<label>Image:<input data-wysihtml5-dialog-field="src" value="http://"></label><label>Caption:<input name="alt" placeholder="caption"></label><label class="justify"><input type="radio" name="klass" value="original"> Center </label><label class="justify"><input type="radio" name="klass" value="pull-left"> Left </label><label class="justify"><input type="radio" name="klass" value="pull-right"> Right </label><button class="save">OK</button>&nbsp;<a data-wysihtml5-dialog-action="cancel">Cancel</a>');
            self.$inputUrl = this.$html.find('input[data-wysihtml5-dialog-field="src"]');
            self.uploadFrame = new window.FilesBackbone.UploadFrame({collection: window.filesCollection, type:'image', metadata:{groups: ['public']}});
            self.uploadFrame.on('uploaded', function(data){
                if(_.isArray(data)) {
                    data = _.first(data);
                }
                if(data.image) {
                    var url = '/api/files/'+data.image.filename; //window.location.origin+
                    if(data.image.sizes && data.image.sizes.full) {
                        url = '/api/files/'+data.image.sizes.full.filename;
                    }
                    self.$inputUrl.val(url);
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
    
    var SectionForm = Backbone.View.extend({
        tagName: "div",
        className: "form",
        initialize: function() {
            var self = this;
            if(this.model && this.model.id) {
                this.$el.attr('data-id', this.model.id);
            } else {
                if(!this.model) {
                    this.model = new Section({}, {
                        collection: this.collection
                    });
                } else {
                }
            }
            this.wsyi_id = 'wysihtml5-'+this.cid;
            this.$htmlToolbar = $('<div class="wysihtml5-toolbar" id="'+this.wsyi_id+'-toolbar"><header><ul class="commands">\
                  <li data-wysihtml5-command="bold" title="Make text bold (CTRL + B)" class="command"></li>\
                  <li data-wysihtml5-command="italic" title="Make text italic (CTRL + I)" class="command"></li>\
                  <li data-wysihtml5-command="insertUnorderedList" title="Insert an unordered list" class="command"></li>\
                  <li data-wysihtml5-command="insertOrderedList" title="Insert an ordered list" class="command"></li>\
                  <li data-wysihtml5-command="createLink" title="Insert a link" class="command"></li>\
                  <li data-wysihtml5-command="insertImage" title="Insert an image" class="command"></li>\
                  <li data-wysihtml5-command="formatBlock" data-wysihtml5-command-value="h2" title="Insert headline 2" class="command"></li>\
                  <li data-wysihtml5-command="formatBlock" data-wysihtml5-command-value="h3" title="Insert headline 3" class="command"></li>\
                  <li data-wysihtml5-command="insertSpeech" title="Insert speech" class="command"></li>\
                  <li data-wysihtml5-action="change_view" title="Show HTML" class="action"></li></ul></header>\
              <div data-wysihtml5-dialog="createLink" style="display: none;"><label>Link:<input data-wysihtml5-dialog-field="href" value="http://"></label><a data-wysihtml5-dialog-action="save">OK</a>&nbsp;<a data-wysihtml5-dialog-action="cancel">Cancel</a></div>\
              <div data-wysihtml5-dialog="insertImage" style="display: none;">\
                </div></div>');
             
            this.$inputName = $('<input type="text" name="name" placeholder="Name of your section" autocomplete="off" />');
            this.$inputTitle = $('<input type="text" name="title" placeholder="Sub title of the section" autocomplete="off" />');
            this.$inputHtml = $('<textarea id="'+this.wsyi_id+'-textarea" name="html" placeholder="Your section html..."></textarea>');
            
            this.$form = $('<form class="section"><fieldset></fieldset><div class="controls"></div></form>');
            this.$form.find('fieldset').append(this.$inputName);
            this.$form.find('fieldset').append(this.$inputTitle);
            this.$el.append(this.$htmlToolbar);
            this.$form.find('fieldset').append(this.$inputHtml);
            this.$form.find('.controls').append('<input type="submit" value="Save" />');
            this.$form.find('.controls').append(' <button class="cancel">cancel</button>');
        },
        render: function() {
            var self = this;
            if(this.$el.find('form').length === 0) {
                this.$el.append(this.$form);
            }
            if(this.model) {
                if(this.model.has('name')) {
                    this.$inputName.val(this.model.get('name'));
                }
                if(this.model.has('title')) {
                    this.$inputTitle.val(this.model.get('title'));
                }
                if(this.model.has('html')) {
                    this.$inputHtml.val(this.model.get('html'));
                }
            }
            this.setElement(this.$el);
            return this;
        },
        wysiEditor: function() {
            // set h/w of textarea
            $('#'+this.wsyi_id+'-textarea').css('height', $('#'+this.wsyi_id+'-textarea').outerHeight());
            $('#'+this.wsyi_id+'-textarea').css('width', $('#'+this.wsyi_id+'-textarea').outerWidth());
            this.editor = new wysihtml5.Editor(this.wsyi_id+"-textarea", { // id of textarea element
              toolbar:      this.wsyi_id+"-toolbar", // id of toolbar element
              //stylesheets: ['/pages/bootstrap.css', '/pages/index.css'],
              parserRules:  wysihtml5ParserRules // defined in parser rules set 
            });
            this.wysiImagePicker = new WysiImagePicker({el: this.$htmlToolbar.find('[data-wysihtml5-dialog="insertImage"]')[0], editor: this.editor});
            this.wysiImagePicker.render();
            $(this.editor.composer.iframe.contentDocument).find('head').append($('head style').clone());
        },
        events: {
            "submit form": "submit",
            'click [type="submit"]': "submit",
            'click .cancel': "cancel",
            'click [data-wysihtml5-command="insertImage"]': "attachImage"
        },
        attachImage: function() {
            this.wysiImagePicker.uploadFrame.pickFiles();
        },
        cancel: function() {
            var self = this;
            if(confirm("Are you sure that you want to cancel your chagnes?")) {
                self.trigger("cancelled", this.model);
            }
            return false;
        },
        submit: function() {
            var self = this;
            var setDoc = {};
            var name = this.$inputName.val();
            var title = this.$inputTitle.val();
            var html = this.$inputHtml.val();
            if(name !== '' && name !== this.model.get('name')) {
                setDoc.name = name;
            }
            if(title !== this.model.get('title')) {
                setDoc.title = title;
            }
            if(html !== '' && html !== this.model.get('html')) {
                setDoc.html = html;
            }
            this.model.set(setDoc, {silent: true});
            var saveModel = this.model.save(null, {
                silent: false ,
                wait: true
            });
            if(saveModel) {
                saveModel.done(function() {
                    self.trigger("saved", self.model);
                    self.collection.add(self.model);
                });
            } else {
                self.trigger("saved", self.model);
            }
            return false;
        },
        focus: function() {
            this.$inputName.focus();
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