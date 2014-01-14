(function() {
    
    var Model = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var self = this;
            
            if(!options) options = {};
            options.model = this;
            return new Avatar(options);
        }
    });
    
    var Collection = Backbone.Collection.extend({
        model: Model,
        url: function(){
            var q = this.queryTerm;
            if(this.similarTerm) {
                return 'https://gdata.youtube.com/feeds/api/videos/'+this.similarTerm+'/related?start-index=1&max-results=50&v=2&alt=jsonc';
            }
            if(this.uploaderTerm) {
                return 'https://gdata.youtube.com/feeds/api/users/'+this.uploaderTerm+'/uploads?start-index=1&max-results=50&v=2&alt=jsonc';
            }
            //https://gdata.youtube.com/feeds/api/videos/ZTUVgYoeN_b/related?v=2
            //https://gdata.youtube.com/feeds/api/videos?q='+q+'&start-index=1&max-results=50&v=2&alt=jsonc
            return 'https://gdata.youtube.com/feeds/api/videos?q='+q+'&start-index=1&max-results=50&v=2&alt=jsonc';
        },
        initialize: function(docs, options) {
            var self = this;
            this.queryTerm = 'cats';
        },
        parse: function(res) {
            return res.data.items;
        },
        load: function(callback) {
            var self = this;
            // data: this.dataFilter, this.dataFilter.sort = 'at-';
            var options = {update: true, remove: false, withCredentials: false};
            if(callback) options.success = callback;
            this.reset();
            this.fetch(options);
        },
        query: function(term, callback) {
            var self = this;
            var simStr = 'similar:';
            var uploaderStr = 'uploader:';
            delete this.similarTerm;
            delete this.uploaderTerm;
            if(term.trim().indexOf(simStr) === 0) {
                var similarTerm = term.substr(term.indexOf(simStr)+simStr.length);
                this.similarTerm = similarTerm;
            } else if(term.trim().indexOf(uploaderStr) === 0) {
                var uploaderTerm = term.substr(term.indexOf(uploaderStr)+uploaderStr.length);
                this.uploaderTerm = uploaderTerm;
            } else {
                this.queryTerm = term;
            }
            this.load(callback);
        }
    });
    
    var Avatar = Backbone.View.extend({
        tagName: 'div',
        className: 'avatar',
        initialize: function(options) {
            var self = this;
        },
        render: function() {
            var self = this;
            
            
            
            this.setElement(this.$el);
            return this;
        },
        events: {
            
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