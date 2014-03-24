define([
    "utils/StringUtils",
    "underscore",
    "q",
    "db/StoragePlus",
    "basicStorage/InMemoryStorage",
    "Random",
    "utils/Logger"
],
    function (StringUtils, _, Q, StoragePlus, Storage, Random, Logger) {
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
                logger.error("Conflict detected on "+self.name+". This method should be overriden. doc1 and doc2 in conflicts :");
                logger.error(doc1);
                logger.error(doc2);
            }
        };

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
            self.storageVersion.save(getCombinedKey(object), object).fail(function(err) {
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
                                saveVersion(self, lastObject);
                            }
                        } else {
                            var cleanObject = function(object) {
                                object._timstamp = new Date().getTime();
                                delete object._synced;
                                delete object._conflict;
                                saveVersion(self, object);
                            }
                            logger.info("conflict solved with onConflict function : "+JSON.stringify(result));
                            cleanObject(lastObject);
                            cleanObject(resultObject);
                            promises.push(self.save(result));
                        }
                    }
                }
                saveVersion(self, resultObject);
                if (shouldStore) {
                    logger.info("store object on "+self.name+" : "+JSON.stringify(resultObject));
                    promises.push(self.storage.save(resultObject._id, resultObject));
                }
                return Q.all(promises).then(function() {
                    return resultObject;
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
            delete resultObject._synced;
            delete resultObject._conflict;
            return saveForce(self, resultObject);
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
            var repKey = "$repTo$"+destDb.name;
            var endRep;
            return self.storage.get(repKey
            ).then(function(result) {
                var lastRep = result ? result._timestamp : undefined;
                endRep = new Date().getTime();
                logger.info("start replicating from "+self.name+" to "+destDb.name+". startTimestamp="+lastRep+", endTimestamp="+endRep);
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
                logger.debug(JSON.stringify(result, null, 2));
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
                    logger.info("rep "+self.name+" to "+destDb.name+" ended : "+JSON.stringify(result));
                    return result;
                });
            }).fail(function(err) {
                logger.info("rep "+self.name+" to "+destDb.name+" ended with error : "+JSON.stringify(err));
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
            return Q.all([
                self.storage.destroy(),
                self.storageVersion.destroy()
            ]);
        }

        return classe;
    });