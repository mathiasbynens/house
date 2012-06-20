// # Error 404 Filter
//
// Last stop filter to send an error 404 response.
//
// TODO add option for html file for a response
//
(exports = module.exports = function(house){
    var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('backDoor')); });
    var options = (filter.backDoor && filter.backDoor.hasOwnProperty('fourOhFour')) ? filter.backDoor.fourOhFour : {};

    var errCode = (options.hasOwnProperty('code')) ? options.code : 404;
    var errMsg = (options.hasOwnProperty('msg')) ? options.msg : "Error 404: File not found";
    
    return function(req, res, next) {
        res.writeHead(errCode, {'Content-Type': 'text/plain'});
        res.end(errMsg);
    };
});
