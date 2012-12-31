exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        analytics: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
