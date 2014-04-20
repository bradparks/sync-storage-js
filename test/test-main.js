var tests = [];
for (var file in window.__karma__.files) {
    if (/Spec\.js$/.test(file)) {
        tests.push(file);
    }
}

requirejs.config({
    // Karma serves files from '/base'
    baseUrl: '/base/src/js',

    paths: {
        'underscore': '../../bower_components/underscore/underscore',
        'q': '../../bower_components/q/q',
        "localForage":"../../bower_components/localForage/localForage.min",
        "jquery":"../../bower_components/jquery/dist/jquery",
        "ConfigSpec": "../../test/ConfigSpec"
    },

    shim: {
        'underscore': {
            exports: '_'
        },
        'jquery': {
            exports: '$'
        }
    },

    // ask Require.js to load these files (all our tests)
    deps: tests,

    // start test run, once Require.js is done
    callback: window.__karma__.start
});





