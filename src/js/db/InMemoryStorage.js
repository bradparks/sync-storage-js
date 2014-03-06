define([
    "q"
], function (Q) {
    var classe = function () {
    }

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        this[key] = object;
        defer.resolve(object);
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var val = this[key];
        var result = val ? val : null;
        defer.resolve(result);
        return defer.promise;
    }

    classe.prototype.query = function(query) {
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