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
        var classe = function (url, simpleStorage) {
            this.name = url;
            this.isLocal = !StringUtils.startsWith(url, "http");
            if (!simpleStorage) {
                simpleStorage = new Storage();
            }
            this.storage = new StoragePlus(url, simpleStorage);
            this.storageVersion = new StoragePlus("version$$"+url, simpleStorage);
        };

        var randomAlpha = function (size) {
            var dic = "0987654321azertyuiopqsdfghjklmwxcvbnAZERTYUIOPQSDFGHJKLMWXCVBN";
            var hash = "";
            for (var i = 0; i < size; i++) {
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

        var getCombinedKey = function(object) {
            if (!object._id) {
                throw JSON.stringify(object)+ " should have an _id field";
            }
            var key = object._id;
            if (object._rev) {
                key += "/" + object._rev;
            }
            return key;
        }

        var saveForce = function(self, resultObject) {
            var version = parseRev(resultObject._rev).version;
            self.storageVersion.save(getCombinedKey(resultObject), resultObject);
            // TODO put lock on write
            return self.storage.get(resultObject._id).then(function (lastObject) {
                if (!lastObject || parseRev(lastObject._rev).version < version) {
                    return self.storage.save(resultObject._id, resultObject);
                }
                return resultObject;
            });
        }

        classe.prototype.save = function (object) {
            var self = this;
            var resultObject = $.extend({}, object);
            var now = new Date().getTime();
            if (!resultObject._id) {
                resultObject._id = now + randomAlpha(10);
            }
            var version = 1;
            if (resultObject._rev) {
                var version = parseRev(resultObject._rev).version;
                version++;
            }
            resultObject._rev = version + "-" + randomAlpha(30);
            resultObject._timestamp = now;
            return saveForce(self, resultObject);
        };

        classe.prototype.get = function (query) {
            var lookingStorage = query._rev ? this.storageVersion : this.storage;
            return lookingStorage.get(getCombinedKey(query));
        };

        classe.prototype.del = function(query) {
            var lookingStorage = query._rev ? this.storageVersion : this.storage;
            return lookingStorage.del(getCombinedKey(query));
        }

        classe.prototype.query = function(query) {
            if (!query.mapFunction) {
                throw "mapFunction must be defined in the query";
            }
            return this.storage.query(query);
        }

        var replicateTo = function(self, destDb) {
            return self.storage.get({
                _id:"$repTo$"+destDb.name
            }).then(function(result) {
                var lastRep = result ? result._timestamp : undefined;
                var endRep = new Date().getTime();
                return self.query({
                    mapFunction:function(emit, doc) {
                        if (!doc._synced) {
                            emit(doc._timestamp, doc);
                        }
                    },
                    startkey:lastRep,
                    endkey:endRep
                });
            }).then(function(result) {
                if (result.total_rows === 0) {
                    return 0;
                }
                var promises = [];
                for (var key in result.rows) {
                    // docs attached to a timestamp
                    _.each(result.rows[key], function(doc) {
                        doc._synced = true;
                        promises.push(saveForce(destDb, doc));
                    });
                }
                return Q.all(promises).then(function(result) {
                    return result.length;
                });
            }).then(function(size) {
                var result = {
                    ok:true,
                    size:size
                };
                console.log("rep "+self.name+" to "+destDb.name+" ended : "+JSON.stringify(result));
                return result;
            }).fail(function(err) {
                console.log("rep "+self.name+" to "+destDb.name+" ended : "+JSON.stringify(err));
                // rollback rep
                return {
                    error:true,
                    message:"Something went bad when updating objects"
                };
            });
        }

        classe.prototype.syncWith = function(destDb) {
            var self = this;
            return replicateTo(self, destDb).then(function(result) {
                return replicateTo(destDb, self);
            });
        }

        return classe;
    });