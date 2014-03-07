define([
], function() {
    var classe = function(name, storage) {
        this.name = name;
        this.storage = storage;
        this.indexStorage = null;
    }

    var getNewKey = function(self, key) {
        return self.name + "/" + key;
    }

    classe.prototype.save = function(key, object) {
        return this.storage.save(getNewKey(this, key), object);
    };

    classe.prototype.get = function(key) {
        return this.storage.get(getNewKey(this, key));
    };

    classe.prototype.query = function(query) {
        // TODO create index to fasten search
        var defer = Q.defer();
        var rows = {};
        var total = 0;
        var emit = function(key, value) {
            var array = rows[key];
            if (!array) {
                array = [];
                rows[key] = array;
            }
            array.push(value);
            total++;
        }
        console.log(JSON.stringify(this, null, 2));
        for (var key in this) {
            var doc = this[key];
            if (typeof doc != 'function') {
                query.mapFunction(emit)(doc);
            }
        }
        defer.resolve({
            total_rows:total,
            rows:rows
        });
        return defer.promise;
    }

    return classe;
});