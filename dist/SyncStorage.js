define([
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
});define([
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
    });;define([
"SyncStorage",
"basicStorage/LocalForageBridge",
"basicStorage/FacadeStorage",
"utils/FunctionUtils",
"localForage",
"q"
], function(SyncStorage, LocalForageBridge, FacadeStorage, FunctionUtils, localForage, Q) {
    return function() {
        // hack to fix localForage init bug
        // https://github.com/mozilla/localForage/issues/65
        FunctionUtils.onCondition(function() {
            return localForage.driver ? true : false;
        }, function() {
            var db = new SyncStorage("test", new FacadeStorage());
            var input = new Date().getTime();
            var promises = [];
            for (var i=0;i<5;i++) {
                var promise = db.save({
                    value:"plop"
                });
                promises.push(promise);
            }
            Q.all(promises).then(function() {
                var startQuery = new Date().getTime();
                db.waitIndex().then(function() {
                    return db.query({
                        mapFunction:function(emit, doc) {
                            emit(doc._timestamp, doc);
                        },
                        startkey:input+"",
                        endkey:startQuery+"",
                        indexDef:"_timestamp"
                    });
                }).then(function(result) {
                    var endQuery = new Date().getTime();
                    console.log("elapsed time = "+(endQuery - startQuery));
                    console.log(result);
                }).then(function() {
                    //db.destroy();
                });
            });

        });
    };
});;define([
    "q",
    "underscore",
    "basicStorage/IndexedDbStorage",
    "basicStorage/LocalStorageBridge"
], function (Q, _, IndexedDbStorage, LocalStorageBridge) {
    var impls = [
        LocalStorageBridge,
        IndexedDbStorage
    ];
    var usedImpl = _.find(impls, function(impl) {
        return impl.isSupported && impl.isSupported();
    });
    if (!usedImpl) {
        throw "no impl is supported for FacadeStorage";
    }

    var classe = function () {
        this.storage = new usedImpl();
    }

    classe.prototype.save = function (key, object) {
        return this.storage.save(key, object);
    }

    classe.prototype.get = function (key) {
        return this.storage.get(key);
    }

    classe.prototype.del = function (key) {
        return this.storage.del(key);
    }

    classe.prototype.destroy = function() {
        return this.storage.destroy();
    }

    return classe;
});;define([
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
});;define([
    "q"
], function (Q) {
    var classe = function () {
        if (!classe.isSupported()) {
            throw "IndexedDB is not supported by your browser";
        }
        init(this);
    }

    var reqToDefer = function(req, defer) {
        req.onsuccess = function(event) {
            defer.resolve(event.target.result);
        };
        req.onerror = function(event) {
            defer.reject(event);
        }
    }

    classe.prototype.save = function (key, object) {
        var self = this;
        var objectStore = getObjectStore(self);
        var req = objectStore.put(object);
        reqToDefer(req, defer);
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var index = getObjectStore(this).index("_id");
        var req = index.get(key);
        reqToDefer(req, defer);
        return defer.promise;
    }

    classe.prototype.del = function (key) {
        var defer = Q.defer();
        var req = getObjectStore(this).delete(key);
        reqToDefer(req, defer);
        return defer.promise;
    }

    classe.prototype.destroy = function() {
        var self = this;
        var defer = Q.defer();
        var req = this.indexedDB.deleteDatabase("indexedDbStorage");
        req.onsuccess = function(event) {
            defer.resolve();
            init(self);
        };
        req.onerror = function(event) {
            defer.reject(event);
        }
        return defer.promise;
    }

    var init = function(self) {
        // In the following line, you should include the prefixes of implementations you want to test.
        self.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        // DON'T use "var indexedDB = ..." if you're not in a function.
        // Moreover, you may need references to some window.IDB* objects:
        self.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        self.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
        // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

        var defer = Q.defer();
        var req = self.indexedDB.open("indexedDbStorage", 1);
        req.onsuccess = function() {
            self.db = req.result;
            defer.resolve(req.result);
        }
        req.onerror = function(event) {
            defer.reject(event);
        }
        req.onupgradeneeded = function(event) {
          var db = event.target.result;

          var objectStore = db.createObjectStore("data", { keyPath: "_id" });

          objectStore.createIndex("_rev", "_rev", { unique: false });
          objectStore.createIndex("_id", "_id", { unique: true });
        };
        return defer.promise;
    }

    var getObjectStore = function(self) {
        return self.db.transaction(["data"], "readwrite").objectStore("data");
    }

    classe.isSupported = function() {
        var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        return indexedDB ? true : false;
    }

    return classe;
});;define([
    "localForage",
    "q"
], function (localForage, Q) {
    var classe = function () {
    }

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        localForage.setItem(key, JSON.stringify(object));
        defer.resolve(object);
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var val = localForage.getItem(key);
        var result = val ? JSON.parse(val) : null;
        defer.resolve(result);
        return defer.promise;
    }

    classe.prototype.del = function (key) {
        var defer = Q.defer();
        defer.resolve(this.save(key, undefined));
        return defer.promise;
    }

    classe.prototype.destroy = function() {
        throw "not supported";
    }

    return classe;
});;define([
    "q",
    "underscore"
], function (Q, _) {
    var classe = function () {
    }

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        localStorage.setItem(key, JSON.stringify(object));
        defer.resolve(object);
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var val = localStorage.getItem(key);
        var result = val ? JSON.parse(val) : null;
        defer.resolve(result);
        return defer.promise;
    }

    classe.prototype.del = function (key) {
        var defer = Q.defer();
        localStorage.removeItem(key);
        defer.resolve();
        return defer.promise;
    }

    classe.prototype.destroy = function() {
        var defer = Q.defer();
        localStorage.clear();
        defer.resolve();
        return defer.promise;
    }

    classe.isSupported = function() {
        return true;
    }

    return classe;
});;define([
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
});;define([
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
});;// Require.js allows us to configure shortcut alias
require.config({
    baseUrl:"js",
    paths: {
        "PouchDB":"../../lib/PouchDb/PouchDb",
        "q":"../../lib/q/q",
        "underscore":"../../lib/underscore/underscore",
        "localForage":"../../lib/localForage/localForage.min"
    },
    shim: {
        "underscore": {
            // exports underscore as a global variable named '_'
            exports:"_"
        }
    }
});
require(["app"], function(app) {
    app();
});;// contains a synchronize change
define([
"utils/ObjectUtils",
"utils/Utils"
], function(ObjectUtils, Utils) {

    var classe = function Change(key, oldValue, newValue, type) {
        this.key = key;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.type = type;
    }

    classe.CREATE = "CREATE";
    classe.UPDATE = "UPDATE";
    classe.DELETE = "DELETE";

    classe.prototype.apply = function(object) {
        var type = this.type;
        if (type == classe.UPDATE) {
            if (Utils.equalsGeneric(object[this.key], this.oldValue)) {
                object[this.key] = this.newValue;
            } else {
                throw "Impossible to apply "+JSON.stringify(this)+" on "+JSON.stringify(object)+". "
                +"oldValue is "+JSON.stringify(object[this.key])+" and should be "+JSON.stringify(this.oldValue);
            }
        } else if (type == classe.CREATE) {
            if (object[this.key] !== undefined) {
                throw "Impossible to apply "+JSON.stringify(this)+" on "+JSON.stringify(object)+". "
                +"key "+this.key+" already exists with value "+JSON.stringify(object[this.key]);
            }
            object[this.key] = this.newValue;
        } else if (type == classe.DELETE) {
            if (object[this.key] === undefined) {
                throw "Impossible to apply "+JSON.stringify(this)+" on "+JSON.stringify(object)+". "
                    +"key "+this.key+" has no value : "+object[this.key];
            }
            delete object[this.key];
        } else {
            throw "unknown type of change : "+type;
        }
        return object;
    }

    classe.prototype.revert = function(object) {
        var type = this.type;
        if (type == classe.UPDATE || type == classe.DELETE) {
            object[this.key] = this.oldValue;
        } else if (type == classe.CREATE) {
            delete object[this.key];
        } else {
            throw "unknown type of change : "+type;
        }
        return object;
    }


    classe.prototype.applyToArray = function(object) {
        var type = this.type;
        if (type == classe.CREATE) {
            object.push(this.newValue);
        } else if (type == classe.DELETE) {
            object.removeByValue(this.oldValue);
        } else {
            throw "unknown type of change : "+type;
        }
        return object;
    }

    classe.prototype.revertFromArray = function(object) {
        var type = this.type;
        if (type == classe.CREATE) {
            object.removeByValue(this.newValue);
        } else if (type == classe.DELETE) {
            object.push(this.oldValue);
        } else {
            throw "unknown type of change : "+type;
        }
        return object;
    }

    return classe;
});;define([
"utils/ObjectUtils",
"synchronize/Change",
"utils/ArrayUtils"
], function(ObjectUtils, Change) {

   var classe = function Synchronizer() {
        this.equalsFunction = function(object1, object2) {
            return object1 === object2;
        }
        this.isNotDefinedFunction = function(object) {
            return object === undefined;
        }
   }

    /*
    return a list of change
    */
    classe.prototype.synchronize = function(object1, object2) {
        var result = new Array();
        var keys1 = new Array();
        var synchronizer = this;
        object1.pourChaque(function(value, key) {
            keys1.push(key);
            var value2 = object2[key];
            var change;
            if (synchronizer.isNotDefinedFunction(value)) {
                change = new Change(key, value, value2, Change.CREATE);
            } else {
                if (synchronizer.isNotDefinedFunction(value2)) {
                    change = new Change(key, value, value2, Change.DELETE);
                } else if (!synchronizer.equalsFunction(value, value2)) {
                    change = new Change(key, value, value2, Change.UPDATE);
                }
            }
            if (change !== undefined) {
                result.push(change);
            }
        });
        object2.pourChaque(function(value, key) {
            if (!keys1.containsValue(key)) {
                result.push(new Change(key, undefined, value, Change.CREATE));
            }
        });
        return result;
    }

    classe.prototype.synchronizeSet = function(object1, object2) {
        var array2 = new Array().concat(object2);
        var deletes = [];
        var synchronizer = this;
        object1.pourChaque(function(value, key) {
            var result = array2.pourChaque(function(value2, key2) {
                if (synchronizer.equalsFunction(value, value2)) {
                    array2.removeByIndex(key2);
                    return 1;
                }
            });
            if (result === undefined) {
                deletes.push(new Change(undefined, value, undefined, Change.DELETE));
            }
        });

        var creates = array2.transform(function(value) {
            return new Change(undefined, undefined, value, Change.CREATE);
        });

        return creates.concat(deletes);
    }

    return classe;
});;define(["utils/ObjectUtils"], function(ObjectUtils) {
    console.log("loading array utils");
    var classe = function ArrayUtils() {}
    
    var addFunction = function(clazz, functionName, fonction) {
        clazz.prototype[functionName] = fonction;
    }

    addFunction(Array, 'transform', function(fonction) {
        var result = new Array();
        this.pourChaque(function(value, key) {
            result[key] = fonction(value, key);
        });
        return result;
    });

    addFunction(Array, 'removeByIndex', function(index) {
        if (index < 0 || index >= this.length) {
            throw "index out of bounds : "+index+" out of "+0+" -> "+(this.length-1);
        }
        this.splice(index, 1);
        return this;
    });

    addFunction(Array, 'removeByValue', function(value) {
        var result = this.findFirstMatching(function(valueIte) {
            if (value === valueIte) {
                return true;
            }
            if (typeof value != "object") {
                return false;
            }
            return value.equals(valueIte);
        });
        if (result == undefined) {
            throw JSON.stringify(value) + " not found";
        }
        return this.removeByIndex(result[0]);
    });

    addFunction(Array, 'removeAll', function(object) {
        var array = this;
        object.pourChaque(function(value, key) {
            var key2 = array.keyOfValue(value);
            if (key2 !== false) {
                array.removeByIndex(key2);
            }
        });
        return this;
    });

    addFunction(Array, 'containsAll', function(object) {
        var clone = this.clone();
        var result = object.pourChaque(function(value, key) {
            var key2 = clone.keyOfValue(value);
            if (key2 === false) {
                return false;
            }
            clone.removeByIndex(key2);
        });
        if (result !== undefined) {
            return result;
        }
        return true;
    });

    addFunction(Array, 'equalsContains', function(object) {
        if (object.length != this.length) {
            return false;
        }
        return this.containsAll(object);
    });

    return new classe();
});

;define([], function() {
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
});;define([], function() {
    var classe = function ObjectUtils() {}

    function addFunction(classe, functionName, fonction) {
        if (classe.prototype[functionName] !== undefined) {
            throw "function "+functionName+" already defined on "+classe;
        } else {
            classe.prototype[functionName] = fonction;
        }
    }

    addFunction(classe, 'addFunction', addFunction);

    addFunction(classe, 'override', function(object, functionName, fonction) {
        if (object.prototype[functionName] === undefined) {
            throw functionName+" is not defined on "+object;
        }
        object.prototype[functionName] = fonction;
    });

    var abstractMethod = function(methodName, classe) {
                return function() {
                    throw "Abstract method '"+methodName+"' on class "+classe.constructor+" : Not implemented !";
                }
             }
    addFunction(classe, 'addAbstractMethod', function(classe, methodName) {
var abstractMethod = function(methodName, classe) {
                return function() {
                    throw "Abstract method '"+methodName+"' on class "+classe.constructor+" : Not implemented !";
                }
             }
        classe.prototype[methodName] = abstractMethod(methodName, classe);
    });

    addFunction(classe, 'implement', function(classe, methodName, method) {
        if (classe.prototype[methodName]+"" == abstractMethod(methodName, classe)+"") {
            classe.prototype[methodName] = method;
        } else {
            throw methodName+" on "+classe+" is not an abstract method. This is : "+classe.prototype[methodName];
        }
    });

    addFunction(classe, "extend", function(dest, src) {
        dest.prototype = new src();
    });

    classe.prototype.instanceOf = function(object, constructor) {
       while (object != null) {
          if (object == constructor.prototype) {
             return true;
          }
          object = object.__proto__;
       }
       return false;
    }

    return new classe();
});;define([], function() {
    var classe = function() {}

    classe.prototype.startsWith = function(chaine, start) {
        return chaine.substring(0, start.length) == start;
    }

    return new classe();
});;define([], function() {
    var classe = function TestUtils() {}

    classe.prototype.assertException = function(fonction) {
        try {
            fonction();
            expect(fonction+"").toBe("throwing exception");
        } catch(e) {
            console.log("exception expected has come : "+e);
        }
    }

    classe.prototype.expectEquals = function(expected, obtained) {
        var result = expected.equals(obtained);
        if (!result) {
            expect(expected).toBe("equals to "+JSON.stringify(obtained));
        }
    }

    classe.prototype.expectNotEquals = function(expected, obtained) {
        var result = expected.equals(obtained);
        if (result) {
            expect(expected).toBe(" not to be equals to "+JSON.stringify(obtained));
        }
    }

    classe.prototype.expectEqualsSet = function(expected, obtained) {
        var result = expected.equalsContains(obtained);
        if (!result) {
            expect(expected).toBe("equals unorderly to "+JSON.stringify(obtained));
        }
    }

    return new classe();
});;define(["utils/ObjectUtils"], function(ObjectUtils) {
    console.log("loading utils");
    var classe = function Utils() {}

    var addFunction = ObjectUtils.addFunction;

    addFunction(classe, 'forEach', function(object, fonction) {
           for (var key in object) {
               var value = object[key];
               if (typeof value === 'function') {
                   continue;
               }
               var result = fonction(value, key);
               if (result !== undefined) {
                return result;
               }
           }
       });

    addFunction(Object, 'pourChaque', function(fonction) {
        return classe.prototype.forEach(this, fonction);
    });

    addFunction(Object, 'size', function() {
        var cpt = 0;
        this.pourChaque(function(value, key) {
            cpt++;
        });
        return cpt;
    });

    var equalsGeneric = function(value, value2) {
        if (value == undefined || value2 == undefined) {
            return value === value2;
        }
        if (typeof value == 'object') {
            return value.equals(value2);
        } else if (typeof value2 == 'object') {
            return value2.equals(value);
        } else {
            return value2 === value;
        }
    };

    addFunction(classe, 'equalsGeneric', equalsGeneric);

    addFunction(Object, 'equals', function(object) {
        if (typeof object != 'object') {
            return false;
        }
        var cpt = 0;
        var result = this.pourChaque(function(value, key) {
            if (!equalsGeneric(value, object[key])) {
                return false;
            }
            cpt++;
        });
        if (result != undefined) {
            return result;
        }
        return cpt == object.size();
    });

    addFunction(Object, 'keyOfValue', function(object) {
        var result = this.pourChaque(function(value, key) {
            if (equalsGeneric(value, object)) {
                return key;
            }
        });
        if (result !== undefined) {
            return result;
        }
        return false;
    });

    addFunction(Object, 'containsValue', function(object) {
        return this.keyOfValue(object) !== false;
    });


    addFunction(Object, 'asString', function(separate, fonction) {
        if (separate == undefined) {
            separate = ",";
        }
        if (fonction == undefined) {
            fonction = function(value) {
                return value + "";
            }
        }
        var content = "";
        this.pourChaque(function(value, key) {
            content += separate + fonction(value, key);
        });
        return content.substring(separate.length);
    });

    addFunction(Object, 'transform', function(fonction) {
        var result = new Object();
        this.pourChaque(function(value, key) {
            result[key] = fonction(value, key);
        });
        return result;
    });

    addFunction(Object, 'filter', function(fonction) {
        var result = new Object();
        this.pourChaque(function(value, key) {
            if (fonction(value, key)) {
                result[key] = value;
            }
        });
        return result;
    });

    addFunction(Object, 'findFirstMatching', function(fonction) {
        return this.pourChaque(function(value, key) {
            if (fonction(value, key)) {
                return new Array(key, value);
            }
        });
    });

    addFunction(Object, 'clone', function(fonction) {
        var result = new this.constructor();
        this.pourChaque(function(value, key) {
            result[key] = value;
        });
        return result;
    });

    return new classe();
});

