define([
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
});