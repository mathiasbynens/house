exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        msgs: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
