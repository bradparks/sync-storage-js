define([
    "q",
    "jquery"
], function (Q, $) {
    var classe = function () {
    }

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        this[key] = object;
        defer.resolve($.extend({}, object));
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var val = this[key];
        var result = val ? $.extend({}, val) : null;
        defer.resolve(result);
        return defer.promise;
    }

    classe.prototype.del = function (key) {
        var defer = Q.defer();
        var exists = this[key] ? true : false;
        delete this[key];
        defer.resolve(exists);
        return defer.promise;
    }

    classe.prototype.getMap = function() {
        var defer = Q.defer();
        defer.resolve(this);
        return defer.promise;
    }

    return classe;
});