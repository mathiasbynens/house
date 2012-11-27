exports = module.exports.config = {
    version: 0.001,
    favicon: 'favicon.ico',
    iosicon: 'iosicon.png',
    routes: [ {
        account: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                }
            }
        }
    } ]
};
