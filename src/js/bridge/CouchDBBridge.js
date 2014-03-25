define([
"utils/Request",
"utils/Logger",
"utils/Lock"
], function(Request, Logger, Lock) {
    var classe = function(config) {
        var self = this;
        this.host = config.host;
        this.name = config.name;
        this.url = this.host + "/" + this.name + "/";
    }

    var logger = new Logger("CouchDBBridge", Logger.INFO);

    classe.prototype.exists = function() {
        return new Request("get", this.url).call().then(function(result) {
            return result.statusCode == 200;
        });
    }

    classe.prototype.create = function() {
        var self = this;
        return new Request("put", self.url).call().then(function() {
            logger.info("creating database "+self.url);
        }).fail(function(req) {
            if (req.statusCode != 412) {
                logger.error("error when creating database "+self.url);
                return req;
            } else {
                logger.warn(self.url+" already exists");
            }
        })
    }

    classe.prototype.init = function() {
        return this.create();
    }

    classe.prototype.isSupported = function() {
        return new Request("get", this.host).call().then(function(result) {
            try {
                var data = JSON.parse(result.data);
                return data.couchdb ? true : false;
            } catch(e) {
                return false;
            }
        }).fail(function() {
            return false;
        });
    }

    var transformKey = function(key) {
        var result = key.toLowerCase();
        while (result.replace("/", "$") != result) {
            result = result.replace("/", "$");
        }
        return result;
    }

    var getCouchObject = function(self, key) {
        return new Request("get", self.url+transformKey(key)).call();
    }

    classe.prototype.save = function(key, object) {
        logger.debug("saving key "+key);
        var self = this;
        var lock = Lock.get("CouchDBBridge/"+key);
        return lock.synchronize().then(function() {
            return getCouchObject(self, key);
        }).then(function(result) {
            var storedObject = {
                data:JSON.stringify(object)
            }
            if (result && result.data) {
                var couchObject = JSON.parse(result.data);
                if (couchObject._rev) {
                    storedObject._rev = couchObject._rev;
                }
            }
            logger.debug("saving at key "+key+" : "+JSON.stringify(storedObject));
            return new Request("put", self.url+transformKey(key), JSON.stringify(storedObject)).call();
        }).then(function() {
            return lock.release().then(function() {
                return object;
            });
        });
    }

    classe.prototype.get = function(key) {
        return new Request("get", this.url+transformKey(key)).call().then(function(result) {
            return result.data ? JSON.parse(JSON.parse(result.data).data) : null;
        });
    }

    classe.prototype.del = function(key) {
        var self = this;
        return getCouchObject(self, key).then(function(result) {
            if (result && result.data) {
                var couchObject = JSON.parse(result.data);
                if (couchObject._rev) {
                    return new Request("delete", self.url+transformKey(key)+"?rev="+couchObject._rev).call();
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }).fail(function() {
            return false;
        });
    }

    classe.prototype.destroy = function() {
        var self = this;
        return new Request("delete", self.url).call().then(function(result) {
            logger.info("destroying database "+self.url);
            logger.debug(result);
        });
    }

    return classe;
});