define([
    "q",
    "utils/StringUtils"
], function(Q, StringUtils) {
    var classe = function(name, storage) {
        this.name = name;
        this.storage = storage;
        this.indexStorage = null;
    }

    var getPrefix = function(self) {
        return self.name + "/";
    }

    var getNewKey = function(self, key) {
        return getPrefix(self) + key;
    }

    classe.prototype.save = function(key, object) {
        return this.storage.save(getNewKey(this, key), object);
    };

    classe.prototype.get = function(key) {
        return this.storage.get(getNewKey(this, key));
    };

    classe.prototype.del = function(key) {
        return this.storage.del(getNewKey(this, key));
    }

    classe.prototype.query = function(query) {
        // TODO create index to fasten search
        var self = this;
        var defer = Q.defer();
        var rows = {};
        var total = 0;
        var totalKeys = 0;
        var emit = function(key, value) {
            var array = rows[key];
            if (!array) {
                array = [];
                rows[key] = array;
                totalKeys++;
            }
            array.push(value);
            total++;
        }
        return this.storage.getMap().then(function(map) {
            for (var key in map) {
                if (!StringUtils.startsWith(key, getPrefix(self))) {
                    continue;
                }
                var doc = map[key];
                if (typeof doc != 'function') {
                    query.mapFunction(emit, doc);
                }
            }
            defer.resolve({
                total_keys:totalKeys,
                total_rows:total,
                rows:rows
            });
            return defer.promise;
        });
    }

    classe.prototype.getAll = function() {
        return this.query({
            mapFunction:function(emit, doc) {
                emit(doc._id, doc);
            }
        });
    }

    return classe;
});