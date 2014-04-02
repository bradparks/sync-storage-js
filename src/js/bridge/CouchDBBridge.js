define([
"utils/Request",
"utils/Logger",
"utils/Lock",
"q"
], function(Request, Logger, Lock, Q) {
    var classe = function(config) {
        var self = this;
        this.host = config.host;
        this.name = config.name;
        this.url = this.host + "/" + this.name + "/";
    }

    classe.className = "CouchDB";

    var logger = new Logger("CouchDBBridge", Logger.DEBUG);

    classe.prototype.exists = function() {
        var defer = Q.defer();
        logger.debug("exists call");
        new Request("get", this.url).call().then(function(result) {
            logger.info("exists ok");
            defer.resolve(result.statusCode == 200);
        }).fail(function(err) {
            logger.info("exists false");
            defer.resolve(false);
        });
        return defer.promise;
    }

    classe.prototype.create = function() {
        var self = this;
        var defer = Q.defer();
        new Request("put", self.url).call().then(function() {
            logger.info("creating database "+self.url);
            defer.resolve(true);
        }).fail(function(req) {
            if (req.statusCode != 412) {
                logger.error("error when creating database "+self.url);
                defer.reject(req);
            } else {
                logger.warn(self.url+" already exists");
                defer.resolve(req);
            }
        });
        return defer.promise;
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
            var storedObject = _.omit(object, "_id", "_rev")
            if (result && result._rev) {
                storedObject._rev = result._rev;
            }
            storedObject._id = key;
            logger.debug("saving at key "+key+" : "+JSON.stringify(storedObject));
            return new Request("put", self.url+transformKey(key), JSON.stringify(storedObject)).call();
        }).then(function() {
            return lock.release().then(function() {
                return object;
            });
        });
    }

    classe.prototype.get = function(key) {
        var defer = Q.defer();
        new Request("get", this.url+transformKey(key)).call().then(function(result) {
            logger.debug("result");
            logger.debug(result);
            if (result && result.data) {
                var object = JSON.parse(result.data)
                defer.resolve(_.omit(object, "_id", "_rev"));
            } else {
                defer.reject(result);
            }
        }).fail(function(err) {
            if (err.statusCode == 404) {
                defer.resolve(null);
            } else {
                defer.reject(err);
            }
        });
        return defer.promise;
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

    classe.prototype.query = function(query) {
        var view = {
            _id:"_design/myView",
            language:"javascript",
            views: {
                viewName:query.mapFunction
            }
        };
        return new Request("put", self.url + view._id, view).call().then(function() {
            return new Request("get", self.url + view._id + "/viewName", query);
        });
    }

    return classe;
});