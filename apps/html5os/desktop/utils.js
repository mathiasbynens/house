(function(){
    
    if (typeof console == "undefined") {
        window.console = {
            log: function () {}
        };
    }
    
    var utils = {};
    
    utils.getNewModal = function(opts) {
        return new this.ModalView(opts);
    }
    utils.getNewModalContent = function(opts) {
        return new this.ModalContentView(opts);
    }
    
    utils.ModalView = Backbone.View.extend({
        agName: "div",
        className: "modal",
        initialize: function(options) {
            var self = this;
            this.$modalDialog = $('<div class="modal-dialog"></div>');
            this.modalContent = this.getNewModalContent(options);
            //this.$el.append(this.$modalDialog);
            this.$el.on('hide.bs.modal', function () {
                //window.history.back();
                //auth.authView.remove();
                //self.remove();
                self.$el.remove();
            });
            if(options) {
                if(options.closeBtn) {
                    $modalHead.prepend(this.$closeBtn);
                }
                if(options.title) {
                    this.$modalHead.find('.modal-title').html(options.title);
                }
                if(options.body) {
                    this.$modalBody.append(options.body);
                }
                if(options.footer) {
                    this.$modalFoot.append(options.footer);
                }
                if(options.backdrop) {
                    modalOpts.backdrop = options.backdrop;
                }
                if(options.popup) {
                    this.$el.modal(modalOpts);
                }
            }
        },
        render: function() {
            this.$el.append(this.modalContent.render().$el);
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        remove: function(){
            //this.$el.modal('hide');
            //this.$el.remove();
        }
    });
    
    utils.ModalContentView = Backbone.View.extend({
        tagName: "div",
        className: "modal-content",
        initialize: function(options) {
            var self = this;
            //var modalOpts = {};
            //modalOpts.backdrop = 'static';
            this.$closeBtn = $('<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>');
            this.$modalHead = $('<div class="modal-header"><h4 class="modal-title" id="loginModalLabel"></h4>');
            this.$modalBody = $('<div class="modal-body"></div>');
            this.$modalFoot = $('<div class="modal-footer text-muted"></div>');
            //this.$el.append(this.$modalDialog);
            this.$el.on('hide.bs.modal', function () {
                //window.history.back();
                //auth.authView.remove();
                //self.remove();
               // self.$el.remove();
            });
            if(options) {
                if(options.closeBtn) {
                    $modalHead.prepend(this.$closeBtn);
                }
                if(options.title) {
                    this.$modalHead.find('.modal-title').html(options.title);
                }
                if(options.body) {
                    this.$modalBody.append(options.body);
                }
                if(options.footer) {
                    this.$modalFoot.append(options.footer);
                }
                if(options.backdrop) {
                    //modalOpts.backdrop = options.backdrop;
                }
                if(options.popup) {
                    //this.$el.modal(modalOpts);
                }
            }
        },
        render: function() {
            this.$el.append(this.$modalHead);
            this.$el.append(this.$modalBody);
            this.$el.append(this.$modalFoot);
            this.setElement(this.$el);
            return this;
        },
        events: {
        },
        remove: function(){
            //this.$el.modal('hide');
            this.$el.remove();
        }
    });
    
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

    utils.SelectGroupsInputView = Backbone.View.extend({
        tagName: "div",
        className: "groups",
        initialize: function() {
            this.fieldStr = this.options.fieldName || 'groups';
            this.fieldName = this.options.fieldName || 'groups';
            this.fieldSubName = false;
            if(this.fieldName.indexOf('.') !== -1) {
                this.fieldName = this.fieldName.substr(0, this.fieldName.indexOf('.'));
                this.fieldSubName = this.fieldName.substr(this.fieldName.indexOf('.')+1);
            }
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
        getModelFieldVal: function() {
            if(this.model && this.model.has(this.fieldName)) {
                this.value = this.model.get(this.fieldName);
                if(this.fieldSubName) {
                    if(this.value.hasOwnProperty(this.fieldSubName)) {
                        this.value = this.value[this.fieldSubName];
                    } else {
                    }
                }
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
            if(this.model && this.model.has(this.fieldName)) {
                var fieldVal = this.model.get(this.fieldName);
                if(this.fieldSubName) {
                    fieldVal = fieldVal[this.fieldSubName];
                }
                if(fieldVal.indexOf('public') !== -1) {
                    this.renderPublic();
                }
            } else if(!this.model.has(this.fieldName)) {
                var fieldVal = this.model.get(this.fieldName);
                if(fieldVal && (fieldVal.length == 0 || fieldVal.hasOwnProperty(this.fieldSubName) && fieldVal[this.fieldSubName].length == 0)) {
                    this.renderPrivate();
                } else {
                    
                }
            } else {
                var $span = this.$el.find('.privacy.btn span');
                $span.removeClass('glyphicon-lock');
                $span.removeClass('glyphicon-globe');
                $span.html(this.model.get(this.fieldName));
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
                //this.trigger('changed', this.value);
                this.saveVal();
            }
            e.preventDefault();
        },
        clickPublic: function(e) {
            this.value = ['public'];
            this.saveVal();
            //this.renderPublic();
            //this.trigger('changed', this.value);
            e.preventDefault();
        },
        clickPrivate: function(e) {
            this.value = [];
            this.saveVal();
            //this.renderPrivate();
            //this.trigger('changed', this.value);
            e.preventDefault();
        },
        saveVal: function() {
            var setDoc = {
            };
            setDoc[this.fieldStr] = this.val();
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
        }
    });

    if(define) {
        define(function () {
            return utils;
        });
    }
})();