define([
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
});