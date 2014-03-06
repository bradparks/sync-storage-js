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
        defer.resolve(this[key]);
        return defer.promise;
    }

    return classe;
});