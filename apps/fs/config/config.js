exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        fs: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
