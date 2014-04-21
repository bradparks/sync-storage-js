define([
    "q",
    "underscore",
    "utils/Logger"
], function (Q, _, Logger) {
    var classe = function (config) {
        if (!classe.isSupported()) {
            throw "IndexedDB is not supported by your browser";
        }
        this.name = config.name;
        this.indexes = config.indexes ? config.indexes : [];
    }

    var logger = new Logger("IndexedDbStorage", Logger.INFO);

    var getIndex = function(self, objectStore, indexName) {
        try {
            return objectStore.index(indexName);
        } catch(e) {
            logger.error("db "+self.name+" : could not get index "+indexName);
            throw e;
        }
    }

    var empty = function() {
        return Q.fcall(function() {});
    }

    classe.prototype.waitIndex = empty;

    var reqToPromise = function(req) {
        var defer = Q.defer();
        req.onsuccess = function(event) {
            defer.resolve(event.target.result);
        };
        req.onerror = function(event) {
            defer.reject(event);
        }
        return defer.promise;
    }

    var idKey = "_indexedId";

    classe.prototype.save = function (key, object) {
        var self = this;
        var objectStore = getObjectStore(self);
        logger.info("db "+self.name+" : saving "+key+"="+JSON.stringify(object));
        var storedObject = _.extend({}, object);
        storedObject[idKey] = key;
        var req = objectStore.put(storedObject);
        return reqToPromise(req);
    }

    classe.prototype.get = function (key) {
        var index = getIndex(this, getObjectStore(this), idKey);
        logger.info("db "+this.name+" : getting key "+key);
        var req = index.get(key);
        return reqToPromise(req).then(function(result) {
            if (!result) {
                return null;
            }
            var retour = _.omit(result, idKey);
            //logger.info("result="+JSON.stringify(result));
            //logger.info("retour="+JSON.stringify(retour));
            return retour;
        });
    }

    classe.prototype.del = function (key) {
        var req = getObjectStore(this).delete(key);
        return reqToPromise(req);
    }

    classe.prototype.destroy = function() {
        var self = this;
        self.db.close();
        var defer = Q.defer();
        logger.warn("destroying database "+self.name);
        var req = self.indexedDB.deleteDatabase(self.name);
        req.onsuccess = function(event) {
            defer.resolve();
        };
        req.onerror = function(event) {
            defer.reject(event);
        };
        req.onblocked = function(event) {
            logger.error("delete database "+self.name+" req blocked : ");
            logger.error(event);
        }
        return defer.promise;
    }

    classe.prototype.init = function() {
        var self = this;
        var indexes = self.indexes;
        // In the following line, you should include the prefixes of implementations you want to test.
        self.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        // DON'T use "var indexedDB = ..." if you're not in a function.
        // Moreover, you may need references to some window.IDB* objects:
        self.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        self.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
        // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

        var defer = Q.defer();
        logger.info("opening database : "+self.name);
        var req = self.indexedDB.open(self.name, 1);
        req.onsuccess = function() {
            self.db = req.result;
            defer.resolve(req.result);
        }
        req.onerror = function(event) {
            defer.reject(event);
        }
        req.onupgradeneeded = function(event) {
          logger.info("upgrading database "+self.name);
          var db = event.target.result;
          var objectStore = db.createObjectStore("data", { keyPath: idKey });

          // indexes can only be created during upgrades
          _.each(indexes, function(indexName) {
            logger.info("db "+self.name+" : adding index "+indexName);
            var index = objectStore.createIndex(indexName, indexName, { unique: false });
          });
          objectStore.createIndex(idKey, idKey, { unique: false })
        };
        return defer.promise;
    }

    var getObjectStore = function(self) {
        return self.db.transaction(["data"], "readwrite").objectStore("data");
    }

    classe.prototype.isAdvanced = function() {
        return true;
    }

    classe.prototype.create = function(name) {
        var config = _.omit(this, "name");
        config.name = name;
        return new classe(config);
    }

    classe.isSupported = function() {
        var indexedDB = window.indexedDB // || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        return indexedDB ? true : false;
    }

    var toKeyRange = function(self, filter) {
        var isDefined = function(object) {
            return object !== null && object !== undefined;
        }
        var isBoolean = function(object) {
            return object === true || object === false;
        }
        if (isBoolean(filter.lowBound) || isBoolean(filter.highBound)) {
            return;
        }
        if (isDefined(filter.lowBound) && isDefined(filter.highBound)) {
            if (filter.lowBound == filter.highBound && filter.lowInclusive && filter.highInclusive) {
                return self.IDBKeyRange.only(filter.lowBound);
            }
            return self.IDBKeyRange.bound(filter.lowBound, filter.highBound, !filter.lowInclusive, !filter.highInclusive);
        }
        if (isDefined(filter.lowBound)) {
            return self.IDBKeyRange.lowerBound(filter.lowBound, !filter.lowInclusive);
        }
        if (isDefined(filter.lowBound)) {
            return self.IDBKeyRange.upperBound(filter.highBound, !filter.highInclusive);
        }
    }

    classe.prototype.query = function(query) {
        var self = this;
        var counts = _.map(query.filters, function(filter) {
            var objectStore = getObjectStore(self);
            var index = getIndex(self, objectStore, filter.keyName);
            var keyRange = toKeyRange(self, filter);
            if (!keyRange) {
                return undefined;
            }
            var req = index.count(keyRange);
            return reqToPromise(req);
        });
        counts = _.filter(counts, function(count) {
            return count ? true : false;
        });
        return Q.all(counts).then(function(counts) {
            var req;
            var filter;
            if (_.size(counts) > 0) {
                var min = _.min(counts);
                var minIndex;
                _.each(counts, function(value, key) {
                    if (value == min) {
                        minIndex = key;
                    }
                });
                filter = query.filters[minIndex];
                var objectStore = getObjectStore(self);
                var index = getIndex(self, objectStore, filter.keyName);
                req = index.openCursor(toKeyRange(self, filter));
            } else {
                var objectStore = getObjectStore(self);
                req = objectStore.openCursor();
            }

            var totalRows = 0;
            var array = [];
            var sorts = query.sorts;
            var sortKey = sorts && sorts.length > 0 ? sorts[0].keyName : "_id";
            var defer = Q.defer();
            req.onsuccess = function(event) {
                var result = event.target.result;
                if (!result) {
                    defer.resolve({
                        total_rows: totalRows,
                        total_keys: totalRows,
                        rows: _.groupBy(array, function(doc) {
                            return doc[sortKey];
                        })
                    });
                    return;
                }
                var flag = true;
                for (var key in query.filters) {
                    var filterIte = query.filters[key];
                    if (filter == filterIte) {
                        continue;
                    }
                    flag &= filterIte.toFunction()(result.value);
                    if (!flag) {
                        break;
                    }
                }
                if (flag) {
                    totalRows++;
                    array.push(_.omit(result.value, idKey));
                }
                result.continue();
            };
            req.onerror = function(event) {
                defer.reject(event);
            }
            return defer.promise;
        });

    }

    return classe;
});