#!/bin/sh

node node_modules/requirejs/bin/r.js -o require-build.js
node node_modules/requirejs/bin/r.js -o require-build.js optimize=none out=dist/SyncStorage.js