define([
    "localForage",
    "q"
], function (localForage, Q) {
    var classe = function () {
    }

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        localForage.setItem(key, object);
        defer.resolve($.extend({}, object));
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var val = localForage.getItem(key);
        var result = val ? $.extend({}, val) : null;
        defer.resolve(result);
        return defer.promise;
    }

    classe.prototype.del = function (key) {
        var defer = Q.defer();
        defer.resolve(this.save(key, undefined));
        return defer.promise;
    }

    return classe;
});