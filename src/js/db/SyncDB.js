define([
    "PouchDB",
    "jquery",
    "utils/StringUtils",
    "underscore",
    "q",
    "db/StoragePlus",
    "db/InMemoryStorage"
],
    function (PouchDB, $, StringUtils, _, Q, StoragePlus, Storage) {
        console.log("loading SyncDB");

        var classe = function (url, simpleStorage) {
            this.name = url;
            this.isLocal = !StringUtils.startsWith(url, "http");
            if (!simpleStorage) {
                simpleStorage = new Storage();
            }
            this.storage = new StoragePlus(url, simpleStorage);
            this.storageVersion = new StoragePlus("version$$"+url, simpleStorage);
        };

        var generateHash = function () {
            var dic = "0987654321azertyuiopqsdfghjklmwxcvbnAZERTYUIOPQSDFGHJKLMWXCVBN";
            var hash = "";
            for (var i = 0; i < 30; i++) {
                hash += dic.charAt(_.random(0, dic.length - 1));
            }
            return hash;
        };

        var parseRev = function (revString) {
            var split = revString.split('-');
            return {
                version: split[0],
                hash: split[1]
            }
        };

        classe.prototype.save = function (object) {
            var self = this;
            var resultObject = $.extend({}, object);
            if (!resultObject._id) {
                resultObject._id = new Date().getTime() + "";
            }
            var version = 1;
            if (resultObject._rev) {
                var version = parseRev(resultObject._rev).version;
                version++;
            }
            resultObject._rev = version + "-" + generateHash();
            var combinedKey = resultObject._id + "/" + resultObject._rev;
            self.storageVersion.save(combinedKey, resultObject);
            // TODO put lock on write
            return self.storage.get(resultObject._id).then(function (lastObject) {
                console.log("last=" + JSON.stringify(lastObject));
                if (!lastObject || parseRev(lastObject._rev).version < version) {
                    return self.storage.save(resultObject._id, resultObject);
                }
                return resultObject;
            });
        };

        classe.prototype.get = function (query) {
            if (!query._id) {
                throw "get method : _id must be filled";
            }
            var lookingStorage = this.storage;
            var key = query._id;
            if (query._rev) {
                key += "/" + query._rev;
                lookingStorage = this.storageVersion;
            }
            console.log("looking for "+key);
            return lookingStorage.get(key);
        };

        classe.prototype.query = function(query) {
            if (!query.mapFunction) {
                throw "mapFunction must be defined in the query";
            }
            return this.storage.query(query);
        }

        return classe;
    });