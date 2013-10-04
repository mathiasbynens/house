window.houseApi = '/api';

Backbone.Collection = Backbone.Collection.extend({
    next: function(model) {
        var i = this.at(this.indexOf(model));
        if (undefined === i || i < 0) return false;
        return this.at(this.indexOf(model) + 1);
    },
    prev: function(model) {
        var i = this.at(this.indexOf(model));
        if (undefined === i || i < 1) return false;
        return this.at(this.indexOf(model) - 1);
    }
});
Backbone.Model = Backbone.Model.extend({
    next: function() {
        return this.collection.next(this);
    },
    prev: function() {
        return this.collection.prev(this);
    }
});

Backbone.Router.prototype.localStorageNavigationHistory = function(navigateArguments) {
    var n = this.getLocalStorageNavigationHistory();
    if(!n) {
        n = new Array;
    }
    if(n.length > 20) {
        n = n.slice(-10);
    }
    if(navigateArguments) {
        n.push(navigateArguments);
        localStorage.setItem(this.appName+'-navigation', JSON.stringify(n));
    }
    //return n;
}
Backbone.Router.prototype.getLocalStorageNavigationHistory = function() {
    if(!this.hasOwnProperty('appName')) {
        this.appName = 'app';
    }
    var n = JSON.parse(localStorage.getItem(this.appName+'-navigation'));
    return n;
}
var _navigate = Backbone.Router.prototype.navigate;

Backbone.Router.prototype.navigate = function(path, go) {
    var frag = Backbone.history.getFragment();
    Backbone.history.navDirection = 1;
    this.localStorageNavigationHistory(path);
    _navigate.apply(this, arguments);
    var wl = window.location.toString();
    if(go && frag !== path) {
        if(window.ActionsBackbone) {
            var action = new ActionsBackbone.Model({});
            action.set({a:"GET "+wl},{silent:true});
            action.save();
        } else {
            require(['/analytics/backbone-actions.js'], function(ActionsBackbone){
                window.ActionsBackbone = ActionsBackbone;
                var action = new ActionsBackbone.Model({});
                action.set({a:"GET "+wl},{silent:true});
                action.save();
            });
        }
    }
};

Backbone.History.prototype.checkUrl = function(e) {
    this.navDirection = 0;
    if(e.type == "popstate") {
        this.navDirection = -1;
    }
  var current = this.getFragment();
  if (current == this.fragment && this.iframe) current = this.getFragment(this.getHash(this.iframe));
  if (current == this.fragment) return false;
  if (this.iframe) this.navigate(current);
  this.loadUrl() || this.loadUrl(this.getHash());
}

var methodMap = {
  'create': 'POST',
  'update': 'PUT',
  'delete': 'DELETE',
  'read':   'GET'
};

var getValue = function(object, prop) {
  if (!(object && object[prop])) return null;
  return _.isFunction(object[prop]) ? object[prop]() : object[prop];
};

// TODO sync with offline storage

Backbone.sync = function(method, model, options) {
    //if(navigator && navigator.hasOwnProperty('onLine') && !navigator.onLine) {
    //    return;
    //}
  var type = methodMap[method];
  
  // Default options, unless specified.
  options || (options = {});

  // Default JSON-request options.
  var params = {type: type, dataType: 'json'};

  // Ensure that we have a URL.
  if (!options.url) {
    params.url = getValue(model, 'url') || urlError();
  }
  
  if (!options.hasOwnProperty('withCredentials')) {
      params.xhrFields = {
         withCredentials: true
      }
  } else {
      params.xhrFields = {
         withCredentials: options.withCredentials
      }
  }

  // Ensure that we have the appropriate request data.
  if (!options.data && model && (method == 'create' || method == 'update')) {
    params.contentType = 'application/json';
    params.data = JSON.stringify(model.toJSON());
  }
  
  if (params.type === 'PUT') {
      var restObj = {};
      var fullPut = true;
      var changedAttr = model.changedAttributes();
      //console.log(changedAttr);
      for(var i in changedAttr) {
          if(_.isUndefined(changedAttr[i]) || _.isNull(changedAttr[i])) {
              if(!restObj.hasOwnProperty("$unset")) {
                  restObj["$unset"] = {};
              }
              restObj["$unset"][i] = true;
              delete changedAttr[i];
              fullPut = false;
          }
      }
      //console.log(changedAttr);
      if(changedAttr) {
          restObj["$set"] = changedAttr;
          fullPut = false;
      }
      if(model.pulls) {
          restObj["$pull"] = model.pulls;
          delete model.pulls;
          fullPut = false;
      }
      if(model.pushes) {
          restObj["$push"] = model.pushes;
          delete model.pushes;
          fullPut = false;
      }
      if(model.pushAlls) {
          restObj["$pushAll"] = model.pushAlls;
          delete model.pushAlls;
          fullPut = false;
      }
      if(fullPut) {
          console.log('full put prevented');
          return false;
      }
      if(restObj.hasOwnProperty('$set') && _.size(restObj["$set"]) < 1) {
          delete restObj["$set"];
      }
      params.data = JSON.stringify(restObj);
  }

  // Don't process data on a non-GET request.
  if (params.type !== 'GET' && !Backbone.emulateJSON) {
    params.processData = false;
  }
  
  // Make the request, allowing the user to override any Ajax options.
  return $.ajax(_.extend(params, options));
};

Backbone.Model.prototype.pull = function(key, value, options) {
    var attrs, attr, val;
    
    // Handle both `"key", value` and `{key: value}` -style arguments.
    if (_.isObject(key) || key == null) {
      attrs = key;
      options = value;
    } else {
      attrs = {};
      attrs[key] = value;
    }
    
    // Extract attributes and options.
    options || (options = {});
    if (!attrs) return this;
    if (attrs instanceof Backbone.Model) attrs = attrs.attributes;
    options.pulls = {};
    var now = this.attributes;
    var escaped = this._escapedAttributes;
    var prev = this._previousAttributes || {};
    
    if(!this.pulls) this.pulls = {};
    // For each `set` attribute...
    for (attr in attrs) {
        val = attrs[attr];
        options.pulls[attr] = true;
        this.pulls[attr] = val;
        var ni = now[attr].indexOf(val);
        if(ni != -1) {
            delete now[attr][ni];
        }
    }
    // Fire the `"change"` events.
    if (!options.silent) {
        var pulling = this._pullings;
        this._pulling = true;
        for (var attr in this._silentPulls) this._pendingPulls[attr] = true;
        
        var pulls = _.extend({}, options.pulls, this._silentPulls);
        this._silent = {};
        for (var attr in pulls) {
            this.trigger('change:' + attr, this, this.get(attr), options);
        }
        if (pulling) return this;
        
        this.trigger('change', this, options);
        this._pulling = false;
    }
    return this;
}
Backbone.Model.prototype.push = function(key, value, options) {
    var attrs, attr, val;
    
    // Handle both `"key", value` and `{key: value}` -style arguments.
    if (_.isObject(key) || key == null) {
      attrs = key;
      options = value;
    } else {
      attrs = {};
      attrs[key] = value;
    }
    
    // Extract attributes and options.
    options || (options = {});
    if (!attrs) return this;
    if (attrs instanceof Backbone.Model) attrs = attrs.attributes;
    options.pushes = {};
    var now = this.attributes;
    var escaped = this._escapedAttributes;
    var prev = this._previousAttributes || {};
    
    if(!this.pushes) this.pushes = {};
    
    // For each `set` attribute...
    for (attr in attrs) {
        val = attrs[attr];
        options.pushes[attr] = true;
    
        this.pushes[attr] = val;
        if(!now.hasOwnProperty(attr)) {
            now[attr] = [];
        }
        now[attr].push(val);
    }
    // Fire the `"change"` events.
    if (!options.silent) {
        for (var attr in options.pushes) {
            this.trigger('change:' + attr, this, this.get(attr), options);
        }
        this.trigger('change', this, options);
    }
    return this;
}
Backbone.Model.prototype.pushAll = function(key, value, options) {
    var attrs, attr, val;
    
    // Handle both `"key", value` and `{key: value}` -style arguments.
    if (_.isObject(key) || key == null) {
      attrs = key;
      options = value;
    } else {
      attrs = {};
      attrs[key] = value;
    }
    
    // Extract attributes and options.
    options || (options = {});
    if (!attrs) return this;
    if (attrs instanceof Backbone.Model) attrs = attrs.attributes;
    options.pushAlls = {};
    var now = this.attributes;
    
    if(!this.pushAlls) this.pushAlls = {};
    
    // For each `set` attribute...
    for (attr in attrs) {
        val = attrs[attr];
        options.pushAlls[attr] = true;
    
        this.pushAlls[attr] = val;
        
        for(var i in val) {
            now[attr].push(val[i]);
        }
    }
    // Fire the `"change"` events.
    if (!options.silent) {
        for (var attr in options.pushAlls) {
            this.trigger('change:' + attr, this, this.get(attr), options);
        }
        this.trigger('change', this, options);
    }
    return this;
}
