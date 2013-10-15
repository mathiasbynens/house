var jqueryURI = "http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js";
var page = require('webpage').create(),
    system = require('system'),
    address, output, size;
page.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.66 Safari/537.36';
address = system.args[1];
output = system.args[2];
var outputTwo = output;
outputTwo = outputTwo.substr(0, outputTwo.lastIndexOf('.'))+'Twao.png';
user = system.args[3];
pass = system.args[4];
page.viewportSize = { width: 1000, height: 1000 };
page.onUrlChanged = function(targetUrl) {
    console.log('New URL: ' + targetUrl);
}
console.log('phantom about to open page...');
page.open(address, function (status) {
    console.log('page opened...');
    console.log(status);
    if (status !== 'success') {
        console.log('error');
        //console.log(address);
        //console.log(status);
        phantom.exit();
    } else {
        ///window.setTimeout(function () {
            page.includeJs(jqueryURI, function(){
                var pos = page.evaluate(function(u, p){
                    $("input[type=email]").val(u);
                    $("input[type=password]").val(p);
                    //$("input[type=submit]").click();
                    var btnOffset = $("input[type=submit]").first().offset(); // top: left:
                    var btnH = $("input[type=submit]").first().height();
                    var btnW = $("input[type=submit]").first().width();
                    
                    return {
                        x: Math.round(btnOffset.left + btnW/2),
                        y: Math.round(btnOffset.top + btnH/2)
                    }
                }, user, pass);
                //page.render(output);
                window.setTimeout(function () {
                    console.log(pos);
                    console.log('end');
                    page.sendEvent('click', pos.x, pos.y);
                    window.setTimeout(function () {
                        page.render(output);
                        phantom.exit();
                    }, 35000);
                }, 1000);
            });
        //}, 1000);
    }
});
