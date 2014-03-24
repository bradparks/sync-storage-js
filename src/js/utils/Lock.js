define([
"q",
"utils/FunctionUtils",
"utils/Logger"
], function(Q, FunctionUtils, Logger) {
    var classe = function(resources) {
        this.resources = 1;
        if (resources) {
            this.resources = resources;
        }
    }

    var logger = new Logger("Lock", Logger.INFO);

    var isPromise = function(object) {
        return object.then ? true : false;
    }

    classe.prototype.synchronize = function() {
        var defer = Q.defer();
        var self = this;
        logger.debug("enter synchronize");
        FunctionUtils.onCondition(function() {
            var pass = false;
            logger.debug("check condition : "+self.resources);
            if (self.resources >= 1) {
                logger.debug("taking lock");
                self.resources--;
                logger.debug("resources : "+self.resources);
                pass = true;
            }
            return pass;
        }, function() {
            logger.debug("resolving promise");
            defer.resolve();
        });
        return defer.promise;
    }

    classe.prototype.release = function() {
        var self = this;
        logger.debug("release call");
        return Q.fcall(function() {
             self.resources += 1;
             logger.debug("releasing lock : "+self.resources);
        });
    }

    classe.locks = {};

    classe.get = function(object, size) {
        var lock = classe.locks[object];
        if (!lock) {
            lock = new classe(size);
            classe.locks[object] = lock;
        }
        return lock;
    }

    return classe;
});