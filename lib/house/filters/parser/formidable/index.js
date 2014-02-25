// # Parse Filter
//
// ## Formidable
//
// Parse any POST, PUT, and DELETE requests for form data and make it avaiable via the object *req.fields*
//
exports = module.exports = function(house) {
    var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('parser')); });
    var options = (filter.parser && filter.parser.hasOwnProperty('formidable')) ? filter.parser.formidable : {};
    
    var formidable = require("formidable-plus");
    var handleReq = function(req, res, next) {
        if (req.method == "POST" || req.method == "PUT" || req.method == "DELETE") {
            var form = new formidable.IncomingForm();
            var fields = {};
            var files = {};
            var goNext = true;
            try {
                form
                  .on('error', function(err) {
                    if(goNext) {
                        goNext = false;
                        next();
                    }
                    if(err.message.indexOf('bad content-type header, no content-type') !== -1) {
                        // console.log('bad content type');
                        house.log.debug(err.message);
                    } else {
                        house.log.err(err);
                    }
                  })
                  .on('field', function(field, value) {
                    fields[field] = value;
                  })
                  .on('file', function(field, file) {
                    //   console.log('file ' + field + ' to: ' + file.path);
                      files[file.path] = file;
                  })
                  .on('end', function() {
                    req.fields = fields;
                    req.files = files; 
                    if(this.bytesReceived) { 
                        if(!req.bytes) { 
                            req.bytes = {i: 0, o: 0};
                        }
                        req.bytes.i = this.bytesReceived;
                    }
                    next();
                  });
                  
                form.uploadDir = house.config.tmp || '/tmp';
                form.maxFieldsSize = 552000000;
                form.keepExtensions = true; // must to get all the exif data
                try {
                    form.parse(req);
                } catch (e) {
                    if(e.message.indexOf('bad content-type header, no content-type') !== -1) {
                        house.log.debug(e.message);
                    } else {
                        house.log.err('formidable parse error');
                        house.log.err(e);
                    }  
                }
            } catch (err) {
                console.log("form parse err");
                house.log.err(err);
                if(goNext) {
                    goNext = false;
                    next();
                }
            }
        } else {
            next();
        }
    };
    return handleReq;
};
