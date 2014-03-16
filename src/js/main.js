// Require.js allows us to configure shortcut alias
require.config({
    baseUrl:"js",
    paths: {
        "PouchDB":"../../lib/PouchDb/PouchDb",
        "q":"../../lib/q/q",
        "underscore":"../../lib/underscore/underscore",
        "localForage":"../../lib/localForage/localForage.min"
    },
    shim: {
        "underscore": {
            // exports underscore as a global variable named '_'
            exports:"_"
        }
    }
});
require(["app"], function(app) {
    app();
});