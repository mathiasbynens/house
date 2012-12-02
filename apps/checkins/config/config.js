exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        checkins: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
