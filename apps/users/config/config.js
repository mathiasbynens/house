exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        users: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
