define([
    "utils/StringUtils",
    "underscore",
    "q",
    "db/StoragePlus",
    "browserStorage/InMemoryStorage",
    "Random",
    "utils/Logger",
    "query/Query",
    "query/Filter",
    "bridge/RemoteFacadeBridge",
    "browserStorage/IndexedDbStorage"
],
    function (StringUtils, _, Q, StoragePlus, InMemoryStorage, Random, Logger, Query, Filter, RemoteFacadeBridge, IndexedDbStorage) {
        var getFinalStorage = function(name, storage) {
            return storage.isAdvanced && storage.isAdvanced() ? storage.create(name) : new StoragePlus(name, storage);
        }

        var classe = function (name, simpleStorage) {
            var self = this;
            this.name = name;
            if (!simpleStorage) {
                simpleStorage = new InMemoryStorage();
            }
            this.simpleStorage = simpleStorage;
            this.onConflict = function(doc1, doc2) {
                logger.error("Conflict detected on "+self.name+". This method should be overriden. doc1 and doc2 in conflicts :");
                logger.error(doc1);
                logger.error(doc2);
            }
        };

        classe.prototype.init = function() {
            var self = this;
            return self.simpleStorage.init().then(function() {
                var nameVersion = "version$$"+self.name;
                var nameMeta = "metadata$$"+self.name;
                self.storage = getFinalStorage(self.name, self.simpleStorage);
                self.storageVersion = getFinalStorage(nameVersion, self.simpleStorage);
                self.storageMeta = getFinalStorage(nameMeta, self.simpleStorage);
                return Q.all([
                    self.storage.init(),
                    self.storageVersion.init(),
                    self.storageMeta.init()
                ]);
            }).then(function() {
                return self.storageMeta.get("repId");
            }).then(function(result) {
                if (result && result.value) {
                    self.repId = result.value;
                } else {
                    self.repId = new Random().nextAlpha(30);
                    self.storageMeta.save("repId", {value:self.repId});
                }
            });
        }

        var logger = new Logger("SyncStorage");

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

        var saveVersion = function(self, object) {
            return self.storageVersion.save(getCombinedKey(object), object).fail(function(err) {
                logger.error("error when saving in version storage : "+JSON.stringify(object));
                logger.error("error: "+JSON.stringify(err));
            });
        }

        var saveForce = function(self, resultObject) {
            var parsedRev = parseRev(resultObject._rev);
            var version = parsedRev.version;
            // TODO put lock on write
            return self.get({_id:resultObject._id}).then(function (lastObject) {
                var promises = [];
                var shouldStore = !lastObject;
                if (!shouldStore) {
                    var lastRev = parseRev(lastObject._rev);
                    shouldStore = lastRev.version < version || lastRev.version === version && lastRev.hash < parsedRev.hash;
                    if (lastRev.version > version || lastRev.version === version && lastRev.hash !== parsedRev.hash) {
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
                                var promise = saveVersion(self, lastObject);
                                promises.push(promise);
                            }
                        } else {
                            var cleanObject = function(object) {
                                object._timestamp = new Date().getTime();
                                delete object._conflict;
                                var promise = saveVersion(self, object);
                                promises.push(promise);
                            }
                            logger.info("conflict solved with onConflict function : "+JSON.stringify(result));
                            cleanObject(lastObject);
                            cleanObject(resultObject);
                            promises.push(self.save(result));
                        }
                    }
                }
                var promise = saveVersion(self, resultObject);
                promises.push(promise);
                if (shouldStore) {
                    logger.info("store object on "+self.name+" : "+JSON.stringify(resultObject));
                    promises.push(self.storage.save(resultObject._id, resultObject));
                }
                return Q.all(promises).then(function() {
                    return shouldStore;
                });
            });
        }

        // object should contains _rev field, being the _rev field of the last version of object in the database
        // if object is a new object, object should not contain a _rev field
        classe.prototype.save = function (object) {
            var self = this;
            var resultObject = _.extend({}, object);
            var now = new Date().getTime();
            if (!resultObject._id) {
                resultObject._id = now + self.random.nextAlpha(10);
            }
            var version = 1;
            if (resultObject._rev) {
                var version = parseRev(resultObject._rev).version;
                version++;
            }
            resultObject._rev = version + "-" + self.random.nextAlpha(30);
            resultObject._timestamp = now;
            delete resultObject._conflict;
            return saveForce(self, resultObject).then(function() {
                return resultObject;
            });
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
            logger.info("query="+JSON.stringify(query));
            return this.storage.query(query).then(function(result) {
                logger.info("result query="+JSON.stringify(result));
                return result;
            });
        }

        classe.prototype.queryHistory = function(query) {
            logger.info("query history="+JSON.stringify(query));
            return this.storageVersion.query(query).then(function(result) {
                logger.info("result query history="+JSON.stringify(result));
                return result;
            });
        }

        var replicateTo = function(self, destDb) {
            var repKey = "$repTo$"+destDb.name+"$"+destDb.repId;
            var endRep;
            return self.storageMeta.get(repKey).then(function(result) {
                var lastRep = result ? result._timestamp : undefined;
                endRep = new Date().getTime();
                logger.info("start replicating from "+self.name+" to "+destDb.name+". startTimestamp="+lastRep+", endTimestamp="+endRep);
                return self.storageVersion.waitIndex().then(function() {
                    var filter = new Filter("_timestamp", lastRep, endRep, true, true);
                    var query = new Query(null, [filter], null);
                    return self.storage.query(query);
                });
            }).then(function(result) {
                if (result.total_rows === 0) {
                    return 0;
                }
                logger.debug(JSON.stringify(result, null, 2));
                var promises = [];
                for (var key in result.rows) {
                    // docs attached to a timestamp
                    _.each(result.rows[key], function(doc) {
                        if (doc._id == "repId") {
                            return;
                        }
                        var resultDoc = doc;
                        promises.push(saveForce(destDb, resultDoc));
                    });
                }
                return Q.all(promises).then(function(result) {
                    var total = 0;
                    _.each(result, function(value) {
                        if (value === true) {
                            total++;
                        }
                    });
                    return total;
                });
            }).then(function(size) {
                var result = {
                    ok:true,
                    size:size
                };
                return result;
            }).then(function(result) {
                return self.storageMeta.save(repKey, {
                    _timestamp:endRep
                }).then(function() {
                    logger.info("rep "+self.name+" to "+destDb.name+" ended : "+JSON.stringify(result));
                    return result;
                });
            }).fail(function(err) {
                logger.error("rep "+self.name+" to "+destDb.name+" ended with error : "+JSON.stringify(err));
                // TODO rollback rep
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
            return self.storage.waitIndex().then(function() {
                return self.storageVersion.waitIndex();
            }).then(function() {
                return Q.all([
                    self.storage.destroy(),
                    self.storageVersion.destroy(),
                    self.storageMeta.destroy()
                ]);
            });
        }

        return classe;
    });