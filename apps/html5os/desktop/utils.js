(function(){
    
    var utils = {};
    
    utils.appendLightBox = function(el, title, footer) {
        var opts = {
            container: el
        }
        if(title) {
            opts.title = title;
        }
        if(footer) {
            opts.footer = footer;
        }
        var lightBox = new this.LightboxView(opts);
        lightBox.render();
        return lightBox;
    }
    
    utils.LightboxView = Backbone.View.extend({
        tagName: "div",
        className: "modal",
        initialize: function(options) {
            var self = this;
            this.$modalDialog = $('<div class="modal-dialog">\n\
                                        <div class="modal-content">\n\
                                          <div class="modal-header">\n\
                                            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\n\
                                            <h4 class="modal-title" id="loginModalLabel"></h4>\n\
                                          </div>\n\
                                          <div class="modal-body">\n\
                                          </div>\n\
                                          <div class="modal-footer text-muted">\n\
                                          </div>\n\
                                        </div>\n\
                                    </div>');
            this.$el.append(this.$modalDialog);
            $('body').append(this.$el);
            this.$el.on('hide.bs.modal', function () {
                //window.history.back();
                //auth.authView.remove();
                //self.remove();
                self.$el.remove();
            });
            
            if(options && options.title) {
                this.$modalDialog.find('.modal-title').html(options.title);
            }
            if(options && options.container) {
                this.$modalDialog.find('.modal-body').append(options.container);
            }
            if(options && options.footer) {
                this.$modalDialog.find('.modal-footer').append(options.footer);
            }
            var modalOpts = {};
            modalOpts.backdrop = 'static';
            this.$el.modal(modalOpts);
        },
        render: function() {
            //this.$el.append(this.$modal);
            $('body').append(this.$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        remove: function(){
            this.$el.modal('hide');
            //this.$el.remove();
        }
    });

    utils.UploadInputView = Backbone.View.extend({
        tagName: "div",
        className: "upload",
        initialize: function(options) {
            var self = this;
            options = options || {};
            var acceptType = options.acceptType || 'image/*';
            this.$input = $('<input class="uploadInput" style="display:none" type="file" multiple accept="'+acceptType+'" capture="camera">');
            this.$meter = $('<div class="meter" style="display:none"><div class="bar" style="width:1%"></div></div>');
        },
        render: function() {
            var self = this;
            this.$el.append(this.$input);
            this.$el.append(this.$meter);
            this.setElement(this.$el);
            return this;
        },
        events: {
            "change .uploadInput": "fileChangeListener"
        },
        click: function() {
            //this.$input.show();
            this.$input.click();
        },
        uploadFile: function(blobOrFile, callback) {
            console.log(blobOrFile)
            var self = this;
            self.$meter.show();
            var formData = new FormData;
            var xhr = new XMLHttpRequest;
            var onReady = function(e) {
            };
            var onError = function(err) {
                console.log(err);
                alert("upload failed");
            };
            formData.append("files", blobOrFile);
            xhr.open("POST", "/api/files", true);
            xhr.addEventListener("error", onError, false);
            xhr.addEventListener("readystatechange", onReady, false);
            xhr.onload = function(e) {
                var data = JSON.parse(e.target.response);
                self.$input.hide();
                self.$meter.hide();
                if (callback) callback(data);
            };
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    var per = Math.floor((e.loaded / e.total) * 100);
                    self.$meter.find('.bar').css('width', per+'%');
                }
            };
            xhr.setRequestHeader('cache-control', 'no-cache');
            xhr.send(formData);
        },
        fileChangeListener: function(e) {
            e.stopPropagation();
            e.preventDefault();
            var self = this;
            var files = e.target.files;
            var queue = [];
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                queue.push(file);
            }
            var process = function() {
                if (queue.length) {
                    var f = queue.shift();
                    self.uploadFile(f, function(data) {
                        console.log(data);
                        if(_.isArray(data)) {
                            data = _.first(data);
                        }
                        self.trigger("upload", data);
                    });
                    if (queue.length > 0) {
                        process();
                    } else {}
                }
            };
            process();
            return false;
        }
    });

    if(define) {
        define(function () {
            return utils;
        });
    }
})();