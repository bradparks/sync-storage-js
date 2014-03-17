define('utils/StringUtils',[], function() {
    var classe = function() {}

    classe.prototype.startsWith = function(chaine, start) {
        return chaine.substring(0, start.length) == start;
    }

    return new classe();
});
define('utils/FunctionUtils',[], function() {
    var classe = function() {}

    classe.prototype.onCondition = function(testFunction, fonction) {
        if (testFunction()) {
            fonction();
        } else {
            setTimeout(function() {
                classe.prototype.onCondition(testFunction, fonction);
            }, 50);
        }
    }

    classe.prototype.cron = function(duration, fonction) {
        var self = this;
        setTimeout(function() {
            self.cron(duration, fonction);
            fonction();
        }, duration);
    }

    return new classe();
});
define('db/IndexStorage',[
"q",
"underscore",
"utils/FunctionUtils"
], function(Q, _, FunctionUtils) {
    var classe = function(storage) {
        this.storage = storage;
        init(this);
    }

    var emptyPromise = function() {
        var defer = Q.defer();
        defer.resolve();
        return defer.promise;
    }

    var checkBuffer = function(self) {
        if (_.size(self.buffer) == 0) {
            return emptyPromise();
        }
        return self.getAll().then(function(result) {
            if (_.size(self.buffer) == 0) {
                return emptyPromise();
            }
            FunctionUtils.onCondition(function() {
                var pass = false;
                if (!self.lock) {
                    self.lock = true;
                    pass = true;
                }
                return pass;
            }, function() {
                var array = result;
                if (!array) {
                    array = {};
                }
                console.log("adding buffer...")
                for (var key in self.buffer) {
                    var value = self.buffer[key];
                    //console.log("adding key "+key+", value="+JSON.stringify(value));
                    array[key] = value;
                }
                //console.log("saving array="+JSON.stringify(array));
                self.buffer = {};
                //console.log("save _all="+JSON.stringify(array));
                return self.storage.save("_all", array).then(function() {
                    self.lock = false;
                });
            });
        }).then(function() {
            return checkBuffer(self);
        });
    }
    
    classe.prototype.addIndexKey = function(key, value) {
        this.buffer[key] = value;
        return checkBuffer(this);
    }

    classe.prototype.getAll = function() {
        return this.storage.get("_all").then(function(result) {
            //console.log("result _all="+JSON.stringify(result));
            return result ? result : {};
        });
    }

    classe.prototype.waitIndex = function() {
        return checkBuffer(this);
    }

    var init = function(self) {
        self.buffer = {};
        self.lock = false;
    }

    classe.prototype.destroy = function() {
        var self = this;
        return this.storage.del("_all").then(function() {
            init(self);
        });
    }
    
    return classe;
});
define('db/StoragePlus',[
    "q",
    "utils/StringUtils",
    "db/IndexStorage",
    "underscore"
], function(Q, StringUtils, IndexStorage, _) {
    var classe = function(name, basicStorage, indexStorage) {
        this.name = name;
        this.storage = basicStorage;
        if (!indexStorage) {
            this.indexStorage = new IndexStorage(new classe("__index__"+name, this.storage, true));
        }
    }

    var getPrefix = function(self) {
        return self.name + "/";
    }

    var getNewKey = function(self, key) {
        return getPrefix(self) + key;
    }

    classe.prototype.save = function(key, object) {
        var newKey = getNewKey(this, key);
        if (this.indexStorage) {
            this.indexStorage.addIndexKey(key, object);
        }
        return this.storage.save(newKey, object);
    };

    classe.prototype.get = function(key) {
        return this.storage.get(getNewKey(this, key));
    };

    classe.prototype.del = function(key) {
        return this.storage.del(getNewKey(this, key));
    }

    classe.prototype.query = function(query) {
        if (!this.indexStorage) {
            throw "not supported : this is an index storage";
        }
        if (!query.mapFunction) {
            throw "mapFunction must be defined in the query";
        }
        if (!query.indexDef) {
            throw "indexDef must be defined in the query";
        }
        // TODO create index to fasten search
        var self = this;
        var rows = {};
        var total = 0;
        var totalKeys = 0;
        var emit = function(key, value) {
            if (query.startkey && key < query.startkey || query.endkey && key > query.endkey) {
                return;
            }
            var array = rows[key];
            if (!array) {
                array = [];
                rows[key] = array;
                totalKeys++;
            }
            array.push(_.extend({}, value));
            total++;
        }
        return this.indexStorage.getAll().then(function(indexes) {
            var promises = _.map(indexes, function(value, key) {
                return self.get(key).then(function(doc) {
                    if (doc) {
                        query.mapFunction(emit, doc);
                    }
                });
            });

            return Q.all(promises).then(function() {
                return {
                    total_keys:totalKeys,
                    total_rows:total,
                    rows:rows
                };
            });
        });
    }

    classe.prototype.getAll = function() {
        return this.query({
            mapFunction:function(emit, doc) {
                emit(doc._id, doc);
            },
            indexDef:"_id"
        });
    }

    classe.prototype.waitIndex = function() {
        if (this.indexStorage) {
            return this.indexStorage.waitIndex();
        } else {
            var defer = Q.defer();
            defer.resolve();
            return defer.promise;
        }
    }

    classe.prototype.destroy = function() {
        if (!this.indexStorage) {
            // case of internal storage for IndexStorage
            var defer = Q.defer();
            defer.resolve();
            return defer.promise;
        }
        var self = this;
        return self.waitIndex().then(function() {
            return self.indexStorage.getAll();
        }).then(function(result) {
            console.log("result=");
            console.log(result);
            return Q.all(_.map(result, function(value, key) {
                console.log("deleting "+key);
                return self.del(key);
            }));
        }).then(function() {
            if (self.indexStorage) {
                return self.indexStorage.destroy();
            }
            return true;
        });
    }

    return classe;
});
define('basicStorage/InMemoryStorage',[
    "q",
    "underscore"
], function (Q, _) {
    var classe = function () {
    }

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        this[key] = JSON.stringify(object);
        defer.resolve(object);
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var val = this[key];
        var result = val ? JSON.parse(val) : null;
        defer.resolve(result);
        return defer.promise;
    }

    classe.prototype.del = function (key) {
        var defer = Q.defer();
        var exists = this[key] ? true : false;
        delete this[key];
        defer.resolve(exists);
        return defer.promise;
    }

    classe.prototype.destroy = function() {
        var defer = Q.defer();
        _.each(this, function(value, key) {
            console.log("delete "+key);
            delete this[key];
        });
        defer.resolve();
        return defer.promise;
    }

    return classe;
});
define('Random',[
], function() {

    var classe = function() {
    }

    // min inclusive, max exclusive
    classe.prototype.nextNumber = function(min, max) {
        if (!min) {
            min = 0;
        }
        if (!max) {
            max = 1;
        }
        if (min > max) {
            throw "min > max !";
        }
        return Math.random() * (max - min) + min;
    }

    // min and max inclusive
    classe.prototype.nextInt = function(min, max) {
        return Math.floor(this.nextNumber(min, max + 1));
    }

    classe.prototype.alphaDic = "0987654321POIUYTREZAMLKJHGFDSQNBVCXWpoiuytrezamlkjhgfdsqnbvcxw";

    classe.prototype.nextAlpha = function(size) {
        if (!size) {
            size = 1;
        }
        var result = "";
        for (var i=0;i<size;i++) {
            result += this.alphaDic.charAt(this.nextInt(0, this.alphaDic.length-1));
        }
        return result;
    }

    return classe;
});
define('SyncStorage',[
    "utils/StringUtils",
    "underscore",
    "q",
    "db/StoragePlus",
    "basicStorage/InMemoryStorage",
    "Random"
],
    function (StringUtils, _, Q, StoragePlus, Storage, Random) {
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
                                self.storageVersion.save(getCombinedKey(lastObject), lastObject);
                            }
                        } else {
                            var cleanObject = function(object) {
                                object._timstamp = new Date().getTime();
                                delete object._synced;
                                delete object._conflict;
                                self.storageVersion.save(getCombinedKey(object), object);
                            }
                            console.log("conflict solved with onConflict function : "+JSON.stringify(result));
                            cleanObject(lastObject);
                            cleanObject(resultObject);
                            promises.push(self.save(result));
                        }
                    }
                }
                self.storageVersion.save(getCombinedKey(resultObject), resultObject);
                if (shouldStore) {
                    console.log("store object on "+self.name+" : "+JSON.stringify(resultObject));
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
