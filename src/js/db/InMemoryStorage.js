define([
], function() {
    var classe = function() {
        this.byId = [];
        this.byIdRev = [];
    }

    var getKey = function(object) {
        return object._id + "/" + object._rev;
    }

    classe.prototype.save = function(object) {
        this.byIdRev[getKey(object)] = object;
        var stored = this.get(object);
        if (!stored || stored._rev == object._rev) {
            this.byId[object._id] = object;
        }
    }

    classe.prototype.get = function(query) {
        if (query._rev) {
            return this.byIdRev[getKey(query)];
        } else {
            return this.byId[query._id];
        }
    }

    return classe;
});