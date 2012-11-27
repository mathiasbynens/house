exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        images: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
