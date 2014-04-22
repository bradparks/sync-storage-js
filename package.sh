#!/bin/sh

rm -rf dist

node node_modules/requirejs/bin/r.js -o require-build.js optimize=none out=dist/BrowserBridge.js name=browserStorage/BrowserFacadeBridge
node node_modules/requirejs/bin/r.js -o require-build.js out=dist/BrowserBridge.min.js name=browserStorage/BrowserFacadeBridge

node node_modules/requirejs/bin/r.js -o require-build.js optimize=none out=dist/SyncStorage.js name=SyncStorage
node node_modules/requirejs/bin/r.js -o require-build.js out=dist/SyncStorage.min.js name=SyncStorage
