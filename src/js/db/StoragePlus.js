define([
    "q",
    "utils/StringUtils",
    "db/IndexStorage",
    "underscore",
    "utils/Logger"
], function(Q, StringUtils, IndexStorage, _, Logger) {
    var classe = function(name, basicStorage, indexStorage) {
        this.name = name;
        this.storage = basicStorage;
        if (!indexStorage) {
            this.indexStorage = new IndexStorage(new classe("__index__"+name, this.storage, true));
        }
    }

    var logger = new Logger("StoragePlus");

    var getPrefix = function(self) {
        return self.name + "/";
    }

    var getNewKey = function(self, key) {
        return getPrefix(self) + key;
    }

    classe.prototype.save = function(key, object) {
        logger.debug("saving key "+key);
        var newKey = getNewKey(this, key);
        if (this.indexStorage) {
            this.indexStorage.addIndexKey(key, object).fail(function() {
                logger.error("impossible to add index "+key);
            });
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
            logger.debug("destroy result=");
            logger.debug(result);
            return Q.all(_.map(result, function(value, key) {
                logger.debug("deleting "+key);
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