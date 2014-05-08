// Require.js allows us to configure shortcut alias
require.config({
    baseUrl:"js",
    paths: {
        "q":"../../bower_components/q/q",
        "underscore":"../../bower_components/underscore/underscore"
    },
    shim: {
        "underscore": {
            // exports underscore as a global variable named '_'
            exports:"_"
        }
    }
})