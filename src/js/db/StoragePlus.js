define([
], function() {
    var classe = function(name, storage) {
        this.name = name;
        this.storage = storage;
    }

    var getNewKey = function(self, key) {
        return self.name + "/" + key;
    }

    classe.prototype.save = function(key, object) {
        return this.storage.save(getNewKey(this, key), object);
    };

    classe.prototype.get = function(key) {
        return this.storage.get(getNewKey(this, key));
    };

    classe.prototype.query = function(query) {
        // TODO create index to fasten search
    };

    return classe;
});