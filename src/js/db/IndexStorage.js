define([
"q",
"underscore",
"utils/FunctionUtils",
"utils/Logger"
], function(Q, _, FunctionUtils, Logger) {

    var allKey = "$ALL";

    var classe = function(storage) {
        this.storage = storage;
        init(this);
    }

    var emptyPromise = function() {
        var defer = Q.defer();
        defer.resolve();
        return defer.promise;
    }

    var logger = new Logger("IndexStorage", Logger.INFO);

    var checkBuffer = function(self) {
        if (_.size(self.buffer) == 0) {
            return emptyPromise();
        }
        return self.getAll().then(function(result) {
            if (_.size(self.buffer) == 0) {
                return emptyPromise();
            }
            var defer = Q.defer();
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
                logger.debug("adding buffer...")
                for (var key in self.buffer) {
                    var value = self.buffer[key];
                    logger.debug("adding key "+key+", value="+JSON.stringify(value));
                    array[key] = value;
                }
                logger.debug("saving array="+JSON.stringify(array));
                self.buffer = {};
                return self.storage.save(allKey, array).then(function() {
                    self.lock = false;
                    defer.resolve();
                });
            });
            return defer.promise;
        }).then(function() {
            return checkBuffer(self);
        });
    }

    classe.prototype.addIndexKey = function(key, value) {
        this.buffer[key] = value;
        return checkBuffer(this);
    }

    classe.prototype.getAll = function() {
        return this.storage.get(allKey).then(function(result) {
            logger.debug("result _all="+JSON.stringify(result));
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
        return this.storage.del(allKey).then(function() {
            init(self);
        });
    }
    
    return classe;
});