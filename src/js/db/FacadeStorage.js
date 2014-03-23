define([
"q",
"underscore",
"utils/Logger"
], function(Q, _, Logger) {
    var classe = function(impls, config) {
        this.impls = impls;
        this.config = config;
    }

    var logger = new Logger("FacadeBridge", Logger.INFO);

    classe.prototype.init = function() {
        var self = this;
        logger.debug("looking for implementation in "+self.impls);
        return Q.all(_.map(self.impls, function(impl) {
            var defer = Q.defer();
            var impl = new impl(self.config);
            if (!impl.isSupported) {
                logger.warn("isSupported method not implemented in "+impl);
                defer.resolve(false);
            } else {
                impl.isSupported().then(function(result) {
                    defer.resolve(result);
                });
            }
            return defer.promise;
        })).then(function(result) {
            var index = -1;
            var isSupported = _.find(result, function(support) {
                index++;
                return support ? true : false;
            });
            if (isSupported) {
                self.implClasse = self.impls[index];
                logger.debug("class "+self.implClasse+" will be used");
                self.impl = new self.implClasse(self.config);
                logger.debug(self.impl);
                return self.impl.init();
            } else {
                throw "no implementation found";
            }
        });
    }

    classe.prototype.exists = function() {
        return this.impl.exists();
    }

    classe.prototype.create = function() {
        return this.impl.create();
    }

    classe.prototype.isSupported = function() {
        var self = this;
        return Q.fcall(function() {
            return self.impl != undefined;
        });
    }

    classe.prototype.save = function(key, object) {
        return this.impl.save(key, object);
    }

    classe.prototype.get = function(key) {
        return this.impl.get(key);
    }

    classe.prototype.del = function(key) {
        return this.impl.del(key);
    }

    classe.prototype.destroy = function() {
        return this.impl.destroy();
    }

    return classe;
});