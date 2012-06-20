// # Parse Filter
//
// ## Formidable
//
// Parse any POST, PUT, and DELETE requests for form data and make it avaiable via the object *req.fields*
//
exports = module.exports = function(house) {
    var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('parser')); });
    var options = (filter.parser && filter.parser.hasOwnProperty('formidable')) ? filter.parser.formidable : {};
    
    var formidable = require("formidable");
    var handleReq = function(req, res, next) {
        if (req.method == "POST" || req.method == "PUT" || req.method == "DELETE") {
            var form = new formidable.IncomingForm();
            var fields = {};
            try {
                form
                  .on('error', function(err) {
                    res.writeHead(200, {'content-type': 'text/plain'});
                    res.end('error:\n\n'+util.inspect(err));
                  })
                  .on('field', function(field, value) {
                    fields[field] = value;
                  })
                  .on('end', function() {
                    req.fields = fields;
                    next();
                  });
                form.parse(req);
            } catch (err) {
                console.log("form parse err");
                next();
            }
        } else {
            next();
        }
    };
    return handleReq;
};