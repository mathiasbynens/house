var page = require('webpage').create(),
    system = require('system'),
    address, output, size;
page.settings.userAgent = 'HouseJs HTML Cacher/0.006';
address = system.args[1];
output = system.args[2];
page.viewportSize = { width: 1000, height: 1000 };
page.open(address, function (status) {
    if (status !== 'success') {
        console.log('error');
        console.log(address);
        console.log(status);
        phantom.exit();
    } else {
        window.setTimeout(function () {
            //page.render(output);
            //console.log('Page title: '+title);
            
            var checkIsLoading = function() {
                var isLoading = page.evaluate(function(){
                    if(window.$) {
                        return $('body.loading').length;
                    } else {
                        return 1;
                    }
                });
                return isLoading;
            }
            var tries = 0;
            var checkLoading = function() {
                if(tries > (4*120)) {
                    exportSrc();
                    return;
                }
                tries++;
                if(checkIsLoading()) {
                    window.setTimeout(function () {
                        checkLoading();
                    }, 250);
                } else {
                    window.setTimeout(function () {
                        exportSrc();
                    }, 1000);
                }
            }
            
            var exportSrc = function(){
                var title = page.evaluate(function () {
                    if($) {
                        $('script[data-requirecontext]').remove();
                        $('.post-viewer').siblings().remove();
                    }
                    return document.title;
                });
                var src = page.evaluate(function () {
                    var doctypeObj = document.doctype;
                    var docStr = '<!DOCTYPE '+doctypeObj.name+'>\n';
                    return docStr+document.documentElement.outerHTML;
                });
                console.log(src);
                phantom.exit(0);
            }
            
            checkLoading();
        }, 1000);
    }
});
