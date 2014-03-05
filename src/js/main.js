// Require.js allows us to configure shortcut alias
require.config({
    baseUrl:"js",
    paths: {
        "jquery":"../lib/jquery/jquery",
        "PouchDB":"../lib/PouchDb/PouchDb",
        "bootstrap":"../lib/bootstrap/js/bootstrap.min",
        "q":"../lib/q/q",
        "underscore":"../lib/underscore/underscore.min"
    },
    shim: {
        "bootstrap":["jquery"],
        "underscore": {
            // exports underscore as a global variable named '_'
            exports:"_"
        }
    }
});
require(["app"], function(app) {
    app();
});