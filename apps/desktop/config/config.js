exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        desktop: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
