define([
], function() {
    var classe = function() {
    }

    classe.prototype.save = function(object) {
        this[object._id] = object;
    }

    classe.prototype.get = function(query) {
        return this[query._id];
    }

    return classe;
});