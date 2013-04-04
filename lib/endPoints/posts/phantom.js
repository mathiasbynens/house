var page = require('webpage').create(),
    system = require('system'),
    address, output, size;
    page.settings.userAgent = 'HouseJs HTML Cacher/0.003';
    address = system.args[1];
    output = system.args[2];
    page.viewportSize = { width: 1000, height: 1000 };
    page.open(address, function (status) {
    if (status !== 'success') {
        console.log('Unable to load the address!');
        console.log(address);
        console.log(status);
        phantom.exit();
    } else {
        window.setTimeout(function () {
            //page.render(output);
            var title = page.evaluate(function () {
                if($) {
                    $('script[data-requirecontext]').remove();
                }
                return document.title;
            });
            //console.log('Page title: '+title);
            var src = page.evaluate(function () {
                return document.documentElement.outerHTML;
            });
            console.log(src);
            phantom.exit(0);
        }, 5000);
    }
});
