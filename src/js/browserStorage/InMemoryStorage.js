define([
    "q",
    "underscore",
    "utils/Logger"
], function (Q, _, Logger) {
    var classe = function () {
    }

    var logger = new Logger("InMemoryStorage");

    var empty = function() {
        return Q.fcall(function() {});
    }

    classe.prototype.init = empty;
    classe.prototype.waitIndex = empty;

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

    classe.prototype.query = function(query) {
        var self = this;
        return Q.fcall(function() {
            var result = {};
            result.rows = [];
            _.each(self, function(data, key) {
                var doc = JSON.parse(data);
                var ok = _.every(query.filters, function(filter) {
                    var retour = filter.toFunction()(doc);
                    return retour;
                });
                if (ok) {
                    result.rows.push(doc);
                }
            });
            result.total_rows = _.size(result.rows);
            result.total_keys = _.size(result.rows);
            var sortKey = query.sorts && query.sorts.length > 0 ? query.sorts[0].keyName : null;
            result.rows = _.groupBy(result.rows, function(doc, key) {
                return sortKey ? doc[sortKey] : key;
            });
            return result;
        });
    }

    classe.prototype.isAdvanced = function() {
        return true;
    }

    classe.prototype.create = function(name) {
        return new classe();
    }

    return classe;
});