// # Session Filter
//
// ## House Guest
//

(exports = module.exports = function(house){
    var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('session')); });
    var options = (filter.session && filter.session.hasOwnProperty('houseGuest')) ? filter.session.houseGuest : {};
    
    var handleReq = function(req, res, next) {
        next();
    };
    return handleReq;
});
