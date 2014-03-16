define([
    "q",
    "underscore"
], function (Q, _) {
    var classe = function () {
        this.keys = {};
    }

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        this.keys[key] = 1;
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
        delete this.keys[key];
        defer.resolve(this.save(key, undefined));
        return defer.promise;
    }

    classe.prototype.destroy = function() {
        var self = this;
        Q.all(_.map(keys, function(key) {
            return self.del(key);
        }));
    }

    classe.isSupported = function() {
        return true;
    }

    return classe;
});