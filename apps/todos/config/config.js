exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        todos: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
