define([
"underscore"
], function(_) {
    var classe = function(storage) {
        this.storage = storage;
        this.buffer = {};
    }

    var checkBuffer = function(self) {
        if (_.size(self.buffer) == 0) {
            return;
        }
        return self.getAll().then(function(result) {
            var array = result;
            if (!array) {
                array = {};
            }
            var key;
            var value;
            for (var key2 in self.buffer) {
                key = key2;
                value = self.buffer[key];
                break;
            }
            delete self.buffer[key];
            array[key] = value;
            return self.storage.save("_all", array);
        }).then(function() {
            return checkBuffer(self);
        });
    }
    
    classe.prototype.addIndexKey = function(key, value) {
        this.buffer[key] = value;
        return checkBuffer(this);
    }

    classe.prototype.getAll = function() {
        return this.storage.get("_all").then(function(result) {
            return result ? result : {};
        });
    }
    
    return classe;
});