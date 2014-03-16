define([
"q",
"underscore",
"utils/FunctionUtils"
], function(Q, _, FunctionUtils) {
    var classe = function(storage) {
        this.storage = storage;
        init(this);
    }

    var emptyPromise = function() {
        var defer = Q.defer();
        defer.resolve();
        return defer.promise;
    }

    var checkBuffer = function(self) {
        if (_.size(self.buffer) == 0) {
            return emptyPromise();
        }
        return self.getAll().then(function(result) {
            if (_.size(self.buffer) == 0) {
                return emptyPromise();
            }
            FunctionUtils.onCondition(function() {
                var pass = false;
                if (!self.lock) {
                    self.lock = true;
                    pass = true;
                }
                return pass;
            }, function() {
                var array = result;
                if (!array) {
                    array = {};
                }
                console.log("adding buffer...")
                for (var key in self.buffer) {
                    var value = self.buffer[key];
                    //console.log("adding key "+key+", value="+JSON.stringify(value));
                    array[key] = value;
                }
                //console.log("saving array="+JSON.stringify(array));
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

    classe.prototype.waitIndex = function() {
        return checkBuffer(this);
    }

    var init = function(self) {
        self.buffer = {};
        self.lock = false;
    }

    classe.prototype.destroy = function() {
        var self = this;
        return this.storage.destroy().then(function() {
            init(self);
        });
    }
    
    return classe;
});