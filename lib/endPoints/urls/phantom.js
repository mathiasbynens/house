if (phantom.state.length === 0) {
  phantom.userAgent = 'Mozilla/5.0 (X11; U; Linux x86_64; en-US) AppleWebKit/533.3 (KHTML, like Gecko) Safari/533.3';
    if (phantom.args.length !== 2) {
        console.log('Usage: phantom.js URL filename');
        phantom.exit();
    } else {
        var address = phantom.args[0];
        phantom.state = 'rasterize';
        phantom.viewportSize = { width: 1000, height: 1000 };
        phantom.open(address);
    }
} else {
    var output = phantom.args[1];
    phantom.sleep(3300);
    phantom.render(output);
    console.log('Page Title: '+document.title);
    console.log(document.documentElement.outerHTML);
    phantom.exit();
}
