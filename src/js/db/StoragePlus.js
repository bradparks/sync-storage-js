define([
    "q",
    "jquery",
    "utils/StringUtils",
    "db/IndexStorage",
    "underscore"
], function(Q, $, StringUtils, IndexStorage, _) {
    var classe = function(name, storage, indexStorage) {
        this.name = name;
        this.storage = storage;
        if (!indexStorage) {
            this.indexStorage = new IndexStorage(new classe("__index__"+name, storage, true));
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
            array.push($.extend({}, value));
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

    return classe;
});