define([
"underscore",
"utils/FunctionUtils"
], function(_, FunctionUtils) {
    var classe = function(storage) {
        this.storage = storage;
        this.buffer = {};
        this.lock = false;
    }

    var checkBuffer = function(self) {
        if (_.size(self.buffer) == 0) {
            return;
        }
        return self.getAll().then(function(result) {
            if (_.size(self.buffer) == 0) {
                return;
            }
            FunctionUtils.onCondition(function() {
                return !self.lock;
            }, function() {
                self.lock = true;
                var array = result;
                if (!array) {
                    array = {};
                }
                for (var key in self.buffer) {
                    value = self.buffer[key];
                    //console.log("adding key "+key);
                    array[key] = value;
                }
                self.buffer = {};
                //console.log("save _all="+JSON.stringify(array));
                return self.storage.save("_all", array).then(function() {
                    self.lock = false;
                });
            });
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
            //console.log("result _all="+JSON.stringify(result));
            return result ? result : {};
        });
    }
    
    return classe;
});