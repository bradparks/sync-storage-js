define([
    "jquery",
    "utils/StringUtils",
    "underscore",
    "q",
    "db/StoragePlus",
    "basicStorage/InMemoryStorage",
    "Random"
],
    function ($, StringUtils, _, Q, StoragePlus, Storage, Random) {
        var classe = function (url, simpleStorage) {
            var self = this;
            this.name = url;
            this.isLocal = !StringUtils.startsWith(url, "http");
            if (!simpleStorage) {
                simpleStorage = new Storage();
            }
            this.storage = new StoragePlus(url, simpleStorage);
            this.storageVersion = new StoragePlus("version$$"+url, simpleStorage);
            this.onConflict = function(doc1, doc2) {
                console.error("Conflict detected on "+self.name+". This method should be overriden. doc1 and doc2 in conflicts :");
                console.error(doc1);
                console.error(doc2);
            }
        };

        classe.prototype.random = new Random();

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

        var saveForce = function(self, resultObject, conflicts) {
            var parsedRev = parseRev(resultObject._rev);
            var version = parsedRev.version;
            // TODO put lock on write
            return self.get({_id:resultObject._id}).then(function (lastObject) {
                var shouldStore = !lastObject;
                if (!shouldStore) {
                    var lastRev = parseRev(lastObject._rev);
                    shouldStore = lastRev.version < version || lastRev.version === version && lastRev.hash < parsedRev.hash;
                    if (lastRev.version >= version) {
                        // case conflict
                        var result = self.onConflict(lastObject, resultObject);
                        if (!result) {
                            // no solution to conflict
                            var loseVersion = !shouldStore ? resultObject : lastObject;
                            loseVersion._conflict = true;
                            var logObject = {_id:loseVersion._id, _rev:loseVersion._rev};
                            console.warn(JSON.stringify(logObject)+" marked as conflicted on "+self.name);
                            if (loseVersion == lastObject) {
                                lastObject._timestamp = new Date().getTime();
                                delete lastObject._synced;
                                self.storageVersion.save(getCombinedKey(lastObject), lastObject);
                            }
                        }
                    }
                }
                self.storageVersion.save(getCombinedKey(resultObject), resultObject);
                if (shouldStore) {
                    console.log("store object on "+self.name+" : "+JSON.stringify(resultObject));
                    return self.storage.save(resultObject._id, resultObject);
                }
                return resultObject;
            });
        }

        // object should contains _rev field, being the _rev field of the last version of object in the database
        // if object is a new object, object should not contain a _rev field
        classe.prototype.save = function (object) {
            var self = this;
            var resultObject = $.extend({}, object);
            var now = new Date().getTime();
            if (!resultObject._id) {
                resultObject._id = now + self.random.nextAlpha(10);
            }
            var version = 1;
            var conflicts;
            if (resultObject._rev) {
                var version = parseRev(resultObject._rev).version;
                version++;
                conflicts = resultObject._rev;
            }
            resultObject._rev = version + "-" + self.random.nextAlpha(30);
            resultObject._timestamp = now;
            delete resultObject._synced;
            delete resultObject._conflict;
            return saveForce(self, resultObject, conflicts);
        };

        // query should contain an _id field
        // if query contains a _rev field, this specific version will looked for
        // returns null if not found
        classe.prototype.get = function (query) {
            var lookingStorage = query._rev ? this.storageVersion : this.storage;
            return lookingStorage.get(getCombinedKey(query)).then(function(object) {
                if (!object) {
                    return object;
                }
                delete object._synced;
                return object;
            });
        };

        // query should contain an _id field
        // if query contains a _rev field, this specific version will looked for
        classe.prototype.del = function(query) {
            var lookingStorage = query._rev ? this.storageVersion : this.storage;
            return lookingStorage.del(getCombinedKey(query));
        }

        /*
         query.mapFunction : function to filter and map objects of the query
         signature :
         function(emit, doc) {
            //... your logic here
            emit(KEY, VALUE);
         }
         results will be grouped by KEY and only VALUE will be returned.

         query.startkey : lower bound for KEY (optional)
         query.endkey : higher bound for KEY (optional)
         */
        classe.prototype.query = function(query) {
            console.log("query="+JSON.stringify(query));
            return this.storage.query(query).then(function(result) {
                console.log("result query="+JSON.stringify(result));
                return result;
            });
        }

        classe.prototype.queryHistory = function(query) {
            console.log("query history="+JSON.stringify(query));
            return this.storageVersion.query(query).then(function(result) {
                console.log("result query history="+JSON.stringify(result));
                return result;
            });
        }

        var replicateTo = function(self, destDb) {
            var repKey = "$repTo$"+destDb.name;
            var endRep;
            return self.storage.get(repKey
            ).then(function(result) {
                var lastRep = result ? result._timestamp : undefined;
                endRep = new Date().getTime();
                console.log("start replicating from "+self.name+" to "+destDb.name+". startTimestamp="+lastRep+", endTimestamp="+endRep);
                return self.storageVersion.query({
                    mapFunction:function(emit, doc) {
                        if (!doc._synced) {
                            emit(doc._timestamp, doc);
                        }
                    },
                    startkey:lastRep,
                    endkey:endRep,
                    indexDef:"_timestamp"
                });
            }).then(function(result) {
                if (result.total_rows === 0) {
                    return 0;
                }
                //console.log(JSON.stringify(result, null, 2));
                var promises = [];
                for (var key in result.rows) {
                    // docs attached to a timestamp
                    _.each(result.rows[key], function(doc) {
                        var resultDoc = doc;
                        resultDoc._synced = true;
                        promises.push(saveForce(destDb, resultDoc));
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
                return result;
            }).then(function(result) {
                return self.storage.save(repKey, {
                    _timestamp:endRep
                }).then(function() {
                    console.log("rep "+self.name+" to "+destDb.name+" ended : "+JSON.stringify(result));
                    return result;
                });
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
                return replicateTo(destDb, self).then(function(result2) {
                    return {
                        to:result,
                        from:result2
                    };
                });
            });
        }

        classe.prototype.waitIndex = function() {
            return this.storage.waitIndex();
        }

        classe.prototype.destroy = function() {
            var self = this;
            return Q.all([
                self.storage.destroy(),
                self.storageVersion.destroy()
            ]);
        }

        return classe;
    });