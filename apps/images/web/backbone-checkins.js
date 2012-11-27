(function() {
    
    var Checkin = Backbone.Model.extend({
        collectionName: "checkins",
        initialize: function() {
            this.on("change", function(model, options){
                console.log('change');
                var doSave = false;
                var changedAttr = model.changedAttributes();
                
                // Don't update the id or at
                delete changedAttr['_id'];
                delete changedAttr['owner'];
                delete changedAttr['at'];
                
                for(var i in changedAttr) {
                    if(changedAttr.hasOwnProperty(i)) {
                        doSave = true;
                    }
                }
                
                for(var i in model.pulls) {
                    doSave = true;
                }
                for(var i in model.pushes) {
                    doSave = true;
                }
                for(var i in model.pushAlls) {
                    doSave = true;
                }
                
                if(doSave) {
                    model.save();
                }
            });
        },
        getFullView: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.fullView) {
                this.fullView = new CheckinFullView(options);
            }
            return this.fullView;
        },
        getAvatar: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.avatar) {
                this.avatar = new CheckinAvatar(options);
            }
            return this.avatar;
        },
        getRow: function(options) {
            options = options || {};
            options.id = this.get("_id");
            options.model = this;
            if (!this.row) {
                this.row = new CheckinRow(options);
            }
            return this.row;
        }
    });
    
    var Checkins = Backbone.Collection.extend({
        model: Checkin,
        collectionName: 'checkins',
        url: '/jeffshouse/checkins',
        initialize: function() {
            var self = this;
            self.pageSize = 10;
            this.resetFilters();
            
            return;
            require(['https://www.jeffshouse.com:8443/socket.io/socket.io/socket.io.js'], function() {
                var socket = io.connect('https://www.jeffshouse.com:8443/socket.io/checkins', {secure:true});
                socket.on('connect', function(data) {
                    console.log('connected to socket.io/checkins');
                });
                socket.on('checkin', function (data) {
                    var sess = self.get(data["_id"]);
                    if(sess) {
                        sess.set(data, {silent: true});
                        //sess.getRow().render();
                    } else {
                        self.add(data);
                    }
                    self.sort();
                });
                console.log('connect to socket.io/checkins');
            });
        },
        load: function(options, success) {
            var self = this;
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
                    
            this.fetch({data: options, add: true, success: function(collection, response){
                    if(success) {
                        success();
                    }
                },
                error: function(collection, response){
                }
            });
        },
        getNextPage: function() {
            if(this.length < this.collectionCount) {
                this.load({skip:this.length});
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
            var checkin;
            
            checkin = this.get(id);
            
            if(checkin) {
                callback(checkin);
            } else {
                var options = { "_id": id };
                this.fetch({data: options, add: true, success: function(collection, response){
                        if(response) {
                            console.log(response);
                            checkin = self.get(id);
                            callback(checkin);
                        } else {
                            callback(false);
                        }
                    },
                    error: function(collection, response){
                        callback(false);
                    }
                });
            }
        }
    });
    
    var CheckinsList = Backbone.View.extend({
        layout: 'avatar',
        render: function() {
            
            var self = this;
            this.$el.html('');
            
            this.$el.append(this.$ul);
            
            this.$ul.html('');
            //this.collection.sort({silent:true});
            this.collection.each(function(doc){
                var view;
                if(self.layout === 'row') {
                    view = doc.getRow({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatar({list: self});
                }
                
                self.appendRow(view.render().el);
            });
            
            this.trigger('resize');
            
            return this;
        },
        initialize: function() {
            var self = this;
            
            var $ul = this.$ul = $('<ul id="checkins"></ul>');
            
            this.collection.bind("add", function(doc) {
                var view;
                if(self.layout === 'row') {
                    view = doc.getRow({list: self});
                } else if(self.layout === 'avatar') {
                    view = doc.getAvatar({list: self});
                }
                
                self.appendRow(view.render().el);
                // refresh pager
            });
            
            this.collection.on('reset', function(){
                self.render();
            });
        },
        refreshPager: function() {
        },
        appendRow: function(row) {
            this.$ul.append(row);
        }
    });
    
    var CheckinActions = Backbone.View.extend({
        
        tagName: "div",
        
        className: "checkinActions",
        
        render: function() {
            var self = this;
            this.$el.html('');
            
            this.actions.forEach(function(action){
                self.$el.append(action.render().el);
            });
            
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.actions = [];
            
            this.checkinTags = new CheckinTags({id: this.id, model: this.model});
            this.$el.append(this.checkinTags.render().el);
            this.actions.push(this.checkinTags);
            
            this.checkinGroups = new CheckinGroups({id: this.id, model: this.model});
            this.$el.append(this.checkinGroups.render().el);
            this.actions.push(this.checkinGroups);
            
            this.checkinActionDelete = new CheckinActionDelete({id: this.id, model: this.model});
            this.$el.append(this.checkinActionDelete.render().el);
            this.actions.push(this.checkinActionDelete);
        }
    });

    var CheckinActionDelete = Backbone.View.extend({
        
        tagName: "span",
        
        className: "delete",
        
        render: function() {
            this.$el.html('<button>delete</button>');
            
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            
        },
        events: {
          "click": "select",
        },
        select: function() {
            if(confirm("Are you sure that you want to delete this checkin?")) {
                this.model.destroy({success: function(model, response) {
                  console.log('delete');
                }, 
                errorr: function(model, response) {
                    console.log(arguments);
                },
                wait: true});
            }
            return false;
        }
    });

    var CheckinActionProcess = Backbone.View.extend({
        
        tagName: "span",
        
        className: "process",
        
        render: function() {
            this.$el.html('<button>process</button>');
            
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            
        },
        events: {
          "click": "select",
        },
        select: function() {
            if(confirm("Are you sure that you want to process this checkin?")) {
                this.model.set({proc: 0});
            }
            return false;
        }
    });

    var CheckinTags = Backbone.View.extend({
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
            if(confirm("Are you sure that you want to remove this tag?")) {
                var tags = this.model.get("tags");
                
                var $tag = $(e.target);
                var tagName = '';
                if($tag.attr('data-tag')) {
                    tagName = JSON.parse($tag.attr('data-tag'));
                } else {
                    tagName = e.target.innerHTML;
                }
                this.model.pull({"tags": tagName}, {wait: true});
            }
        },
        newTag: function() {
            var tagName = prompt("Enter tags, separated, by commas.");
            
            tagName = tagName.split(',');
            
            for(var i in tagName) {
                var tag = tagName[i];
                tagName[i] = tag.trim(); // trim extra white space
            }
            if(tagName) {
                if(!this.model.get("tags")) {
                    this.model.set({'tags': tagName}, {wait: true});
                } else {
                    this.model.pushAll({"tags": tagName}, {wait: true});
                }
            }
        }
    });

    var CheckinGroups = Backbone.View.extend({
        tagName: "span",
        className: "groups",
        render: function() {
            this.$el.html('');
            var groups = this.model.get("groups");
            if(groups) {
                for(var i in groups) {
                    var groupName = groups[i];
                    this.$el.append('<button class="group">'+groupName+'</button>');
                }
            }
            if(groups.indexOf('public') === -1) {
                this.$el.append('<button class="publicGroup">+ public</button>');
            }
            if(groups && groups.length > 0) {
                this.$el.append('<button class="privateGroup">+ private</button>');
            }
            this.$el.append('<button class="newGroup">+ group</button>');
            this.$el.removeAttr('id');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
          "click .newGroup": "newGroup",
          "click .group": "removeGroup",
          "click .publicGroup": "publicGroup",
          "click .privateGroup": "privateGroup"
        },
        privateGroup: function() {
            if(confirm("Are you sure that you want to make this private?")) {
                this.model.set({"groups": []}, {wait: true});  
            }
        },
        publicGroup: function() {
            if(confirm("Are you sure that you want to make this public?")) {
                this.model.push({"groups": "public"}, {wait: true});
            }
        },
        removeGroup: function(e) {
            if(confirm("Are you sure that you want to remove this group?")) {
                var groups = this.model.get("groups");
                var name = e.target.innerHTML;
                this.model.pull({"groups": name}, {wait: true});
            }
        },
        newGroup: function() {
            var groupName = prompt("Enter groups, separated, by commas.");
            groupName = groupName.split(',');
            
            for(var i in groupName) {
                var g = groupName[i];
                groupName[i] = g.trim(); // trim extra white space
            }
            if(groupName) {
                if(!this.model.get("groups")) {
                    this.model.set({'groups': groupName}, {wait: true});
                } else {
                    this.model.pushAll({"groups": groupName}, {wait: true});
                }
            }
        }
    });


    var CheckinRow = Backbone.View.extend({
        
        tagName: "li",
        
        className: "checkinRow clearfix",

        htmlTemplate: '<img src="/jeffshouse/file/<%= filename %>" />\
                        <span class="info">\
                            <span class="filename"><%= filename %></span>\
                            <span class="at" data-datetime="<%= at ? at : "" %>" title="<%= createdAtFormatted %>">created: <%= createdAtShort %></span>\
                        </span>',
        
        template: function(doc) {
            
            // Add default values to doc which are required in the template
            
            if(doc.hasOwnProperty('at')) {
                var createdAtFormatted = new Date(doc.at);
                doc.createdAtFormatted = createdAtFormatted.toLocaleString();
                var hours = createdAtFormatted.getHours();
                var ampm = 'am';
                if(hours > 12) {
                    hours = hours - 12;
                    ampm = 'pm';
                }
                doc.createdAtShort = (createdAtFormatted.getMonth()+1)+'/'+createdAtFormatted.getDate()+' @ '+hours+':'+createdAtFormatted.getMinutes()+' '+ampm;
            } else {
                doc.at = false;
                doc.createdAtFormatted = '';
                doc.createdAtShort = '';
            }
            
            var template = $(_.template(this.htmlTemplate, doc));
            
            this.$el.attr('data-checkins-id', this.model.get("_id"));
            
            return template;
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            
            this.$el.append(this.$actions);
            
            this.checkinActions.render();
            
            this.trigger('resize');
            
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            
            return this;
        },
        initialize: function(options) {
            
            if(options.list) {
                this.list = options.list;
            }
            
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);

            this.$actions = $('<div class="actions"></div>');
            this.checkinActions = new CheckinActions({id: this.id, model: this.model});
            this.$actions.append(this.CheckinActions.render().el);
        },
        events: {
          "click": "select"
        },
        select: function(e) {
            
            
            // One click to select, another to deselect.  Can only have one selection at a time.
            
            var deselectSiblings = function(el) {
                el.siblings().removeClass('selected');
                el.siblings().removeAttr('selected');
            }
            
            if(this.$el.hasClass('selected')) {
                this.$el.removeClass("selected");
                this.$el.removeAttr('selected');
                
                this.trigger('deselect');
            } else {
                deselectSiblings(this.$el);
                this.$el.addClass("selected");
                this.$el.attr("selected", true);
                
                if(this.hasOwnProperty('list')) {
                    this.list.trigger('select', this);
                }
                
                this.trigger('select');
            }
            this.trigger('resize');
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var CheckinFullView = Backbone.View.extend({
        
        tagName: "div",
        
        className: "checkinFullView clearfix",
    
        htmlTemplate: '<img src="/jeffshouse/file<%= imgSrc %>" />\
                        <span class="info">\
                            <h3 class="caption"></h3>\
                            <span class="at" data-datetime="<%= at ? at : "" %>" title="<%= createdAtFormatted %>">created: <%= createdAtShort %></span>\
                            <%= checkinHtml %>\
                            <%= downloadMenu %>\
                            <%= exifHtml %>\
                        </span>',
        
        template: function(doc) {
            
            // Add default values to doc which are required in the template
            
            if(doc.hasOwnProperty('at')) {
                var createdAtFormatted = new Date(doc.at);
                doc.createdAtFormatted = createdAtFormatted.toLocaleString();
                var hours = createdAtFormatted.getHours();
                var ampm = 'am';
                if(hours > 12) {
                    hours = hours - 12;
                    ampm = 'pm';
                }
                doc.createdAtShort = (createdAtFormatted.getMonth()+1)+'/'+createdAtFormatted.getDate()+' @ '+hours+':'+createdAtFormatted.getMinutes()+' '+ampm;
            } else {
                doc.at = false;
                doc.createdAtFormatted = '';
                doc.createdAtShort = '';
            }
            
            doc.metaLinksHtml = '<a href="/jeffshouse/file'+doc.filename+'.meta" target="_new">meta</a> <a href="/jeffshouse/file'+doc.filename+'.metab" target="_new">meta binary</a>';
            
            doc.downloadMenu = '<a target="_new" href="/jeffshouse/file'+doc.filename+'">original</a>';
            
            doc.imgSrc = doc.filename;
            
            if(doc.hasOwnProperty('sizes')) {
                for(var i in doc.sizes) {
                    for(var sizeName in doc.sizes[i]) {
                        var size = doc.sizes[i][sizeName];
                        
                        if(sizeName == 'full') {
                            doc.imgSrc = size.filename;
                        }
                        
                        var downloadSize = ' <a target="_new" href="/jeffshouse/file'+size.filename+'">'+sizeName+'</a> ';
                        doc.downloadMenu += downloadSize;
                    }
                }
            }
            
            doc.downloadMenu = '<span class="download"><a>'+doc.filename+'</a> '+ doc.downloadMenu + doc.metaLinksHtml + '</span>';
            
            // Checkin HTML
            doc.checkinHtml = '';
            if(doc.hasOwnProperty('checkin')) {
                doc.checkinHtml = '<span class="checkin">checkins/'+doc.checkin.id+'</span>';
            }
            
            // Exif HTML
            doc.exifHtml = '';
            if(doc.hasOwnProperty('exif')) {
                for(var i in doc.exif) {
                    doc.exifHtml += '<pre>'+i+': '+doc.exif[i]+'</pre>';
                }
            }
            doc.exifHtml = '<a class="exif" href="#">exif data</a><span class="exifData">' + doc.exifHtml + '</span>';
            
            var template = $(_.template(this.htmlTemplate, doc));
            
            this.$el.attr('data-checkins-id', this.model.get("_id"));
            
            return template;
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            
            this.renderCaption();
            
            this.$el.append(this.$actions);
            
            this.checkinActions.render();
            
            this.trigger('resize');
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            return this;
        },
        renderInfo: function() {
            
        },
        renderActions: function() {
            this.checkinActions.render();
        },
        renderCaption: function() {
            var caption = this.model.has('caption') ? this.model.get('caption') : 'add a caption';
            this.$el.find('.caption').html(caption);
        },
        initialize: function(options) {
            
            if(options.list) {
                this.list = options.list;
            }
            
            this.model.bind('change', this.renderInfo, this);
            this.model.bind('change:caption', this.renderCaption, this);
            this.model.bind('change:tags', this.renderActions, this);
            this.model.bind('change:groups', this.renderActions, this);
            this.model.bind('change:owner', this.renderActions, this);
            this.model.bind('destroy', this.remove, this);
    
            this.$actions = $('<div class="actions"></div>');
            this.checkinActions = new CheckinActions({id: this.id, model: this.model});
            this.$actions.append(this.checkinActions.render().el);
        },
        show: function() {
            this.$el.show();
        },
        events: {
          "click .exif": "toggleExif",
          "click .caption": "editCaption"
        },
        toggleExif: function() {
            this.$el.find('.exifData').toggle();
            return false;
        },
        editCaption: function() {
            var c = this.model.get("caption");
            
            var newCaption = prompt("caption text", c);
            
            if(newCaption) {
                this.model.set({"caption": newCaption}, {wait: true});
            }
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var CheckinAvatar = Backbone.View.extend({
    
        tagName: "li",
        
        className: "checkinAvatar",
        
        htmlTemplate: '<img class="map" src="/jeffshouse/file<%= imgSrc %>" />\
<span class="info">\
    <span class="location"><%= loc %></span>\
</span>',
        
        template: function(doc) {
            
            // Add default values to doc which are required in the template
            
            if(doc.hasOwnProperty('at')) {
                var createdAtFormatted = new Date(doc.at);
                doc.createdAtFormatted = createdAtFormatted.toLocaleString();
                var hours = createdAtFormatted.getHours();
                var ampm = 'am';
                if(hours > 12) {
                    hours = hours - 12;
                    ampm = 'pm';
                }
                doc.createdAtShort = (createdAtFormatted.getMonth()+1)+'/'+createdAtFormatted.getDate()+' @ '+hours+':'+createdAtFormatted.getMinutes()+' '+ampm;
            } else {
                doc.at = false;
                doc.createdAtFormatted = '';
                doc.createdAtShort = '';
            }
            
            doc.imgSrc = doc.thumb;
            console.log(doc);
            if(doc.hasOwnProperty('mapImage') && doc.mapImage.hasOwnProperty('sizes')) {
                for(var i in doc.mapImage.sizes) {
                    for(var sizeName in doc.mapImage.sizes[i]) {
                        if(sizeName == 'thumb') {
                            var size = doc.mapImage.sizes[i][sizeName];
                            doc.imgSrc = size.filename;
                        }
                    }
                }
            } else if(doc.hasOwnProperty('thumb')) {
                doc.imgSrc = doc.thumb;
            }
            
            var template = $(_.template(this.htmlTemplate, doc));
            
            this.$el.attr('data-checkins-id', this.model.get("_id"));
            
            return template;
        },
        render: function() {
            var self = this;
            
            if(!this.initialized) {
                
                this.on('initialized', function(){
                    self.render();
                });
                
                return;
            }
            this.$el.html(this.template(this.model.toJSON()));
            
            this.$el.append(this.checkinActionProcess.render().el);
            
            this.trigger('resize');
            
            this.setElement(this.$el); // hmm - needed this to get click handlers //this.delegateEvents(); // why doesn't this run before
            
            return this;
        },
        bindModel: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
            
            this.checkinActionProcess = new CheckinActionProcess({model: this.model});
        },
        initialize: function(options) {
            if(options.list) {
                this.list = options.list;
            }
            
            var self = this;
            self.initialized = false;
            
            if(!this.hasOwnProperty('model')) {
                
                body.checkins.getOrFetch(this.id, function(model){
                    self.model = model;
                    self.bindModel();
                    self.initialized = true;
                    self.trigger('initialized');
                });
            } else {
                this.bindModel();
                self.initialized = true;
                this.trigger('initialized');
            }
        },
        events: {
          "click": "select"
        },
        select: function(e) {
            
            
            // One click to select, another to deselect.  Can only have one selection at a time.
            
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
    
    if(define)
    define(function () {
        //Do setup work here
    
        return {
            Collection: Checkins,
            Model: Checkin,
            List: CheckinsList,
            Row: CheckinRow,
            Avatar: CheckinAvatar
        }
    });
})();