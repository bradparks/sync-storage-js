// Karma configuration
// Generated on Thu Jan 09 2014 22:34:33 GMT+0100 (CET)

module.exports = function(config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '',


    // frameworks to use
    frameworks: ['jasmine', 'requirejs'],


    // list of files / patterns to load in the browser
        files :  [
          {pattern: 'bower_components/**/*.js', included: false},
          {pattern: 'lib/**/*.js', included: false},
          {pattern: 'src/**/*.js', included: false},
          {pattern: 'src/js/*.js', included: false},
          {pattern: 'src/partials/*.html', included: false},
          {pattern: 'test/**/*Spec.js', included: false},
          'test/test-main.js',
        ],

        // list of files to exclude
        exclude :[
            'src/main.js',
            'src/app/main.js'
        ],

        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit'
        reporters:['progress'],

         preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'src/js/**/*.js': ['coverage']
          },

          // optionally, configure the reporter
          coverageReporter: {
            type : 'html',
            dir : 'target/coverage/'
          },


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    // - PhantomJS
    // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
    browsers: ['Chrome'],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
