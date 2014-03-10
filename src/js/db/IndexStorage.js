define([
], function() {
    var classe = function(storage) {
        this.storage = storage;
    }
    
    classe.prototype.addIndexKey = function(key, value) {
        var self = this;
        return self.getAll().then(function(result) {
            var array = result;
            if (!array) {
                array = {};
            }
            console.log("adding to index : "+key);
            array[key] = value;
            return self.storage.save("_all", array);
        });
    }

    classe.prototype.getAll = function() {
        var self = this;
        return self.storage.get("_all").then(function(result) {
            return result ? result : [];
        });
    }
    
    return classe;
});