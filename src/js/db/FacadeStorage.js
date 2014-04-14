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
        var implNames = _.map(self.impls, function(impl) {
            return impl.className;
        });
        logger.info("looking for implementation in "+implNames);
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
                logger.info("class "+self.implClasse.className+" will be used");
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

    classe.prototype.create = function(name) {
        var newConfig = _.omit(this.config, "name");
        newConfig.name = name;
        return new classe(this.impls, newConfig);
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

    classe.prototype.query = function(query) {
        return this.impl.query(query);
    }

    classe.prototype.isAdvanced = function() {
        var impl = this.impl;
        return impl.isAdvanced && impl.isAdvanced();
    }

    classe.prototype.waitIndex = function() {
        if (!this.impl.waitIndex) {
            logger.debug("call waitIndex empty");
            return Q.fcall(function() {});
        } else {
            logger.debug("call waitIndex impl");
            return this.impl.waitIndex();
        }
    }

    return classe;
});