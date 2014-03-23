define([
    "q",
    "underscore",
    "utils/Logger"
], function (Q, _, Logger) {
    var classe = function () {
    }

    var logger = new Logger("InMemoryStorage");

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        this[key] = JSON.stringify(object);
        defer.resolve(object);
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var val = this[key];
        var result = val ? JSON.parse(val) : null;
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

    classe.prototype.destroy = function() {
        var defer = Q.defer();
        _.each(this, function(value, key) {
            logger.debug("delete "+key);
            delete this[key];
        });
        defer.resolve();
        return defer.promise;
    }

    classe.prototype.create = classe.prototype.destroy;
    classe.prototype.init = classe.prototype.destroy;

    return classe;
});