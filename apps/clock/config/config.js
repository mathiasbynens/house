exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        clock: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
