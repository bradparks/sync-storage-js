define([
"utils/Request",
"utils/Logger",
"utils/Lock",
"q",
"underscore"
], function(Request, Logger, Lock, Q, _) {
    var classe = function(config) {
        var self = this;
        this.host = config.host;
        this.name = config.name;
        this.url = this.host + "/" + this.name + "/";
    }

    classe.className = "CouchDB";

    var logger = new Logger("CouchDBBridge", Logger.INFO);

    classe.prototype.exists = function() {
        var defer = Q.defer();
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
        var defer = Q.defer();
        new Request("get", self.url+transformKey(key)).call().then(function(result) {
            if (result && result.data) {
                var object = JSON.parse(result.data)
                defer.resolve(object);
            } else {
                defer.reject(result);
            }
        }).fail(function(err) {
            if (err.statusCode == 404) {
                defer.resolve(null);
            } else {
                logger.error("error when getting couch object : "+JSON.stringify(err));
                defer.reject(err);
            }
        });
        return defer.promise;
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
        var self = this;
        return getCouchObject(self, key).then(function(result) {
            if (result) {
                return _.omit(result, "_id", "_rev");
            } else {
                return result;
            }
        });
    }

    classe.prototype.del = function(key) {
        var self = this;
        var defer = Q.defer();
        getCouchObject(self, key).then(function(result) {
            if (result && result._rev) {
                new Request("delete", self.url+transformKey(key)+"?rev="+result._rev).call().then(function() {
                    defer.resolve(true);
                }).fail(function(err) {
                    defer.reject(err);
                });
            } else {
                defer.reject("result object should have a _rev field : "+JSON.stringify(result));
            }
        }).fail(function() {
            defer.reject("fail to retrieve object from key : "+key);
        });
        return defer.promise;
    }

    classe.prototype.destroy = function() {
        var self = this;
        return new Request("delete", self.url).call().then(function(result) {
            logger.info("destroying database "+self.url);
            logger.debug(result);
        });
    }

    classe.prototype.query = function(query) {
        var self = this;
        var view = {
            "_id":"_design/exemple",
            "views": {
                "viewName": {
                    "map": query.mapFunction+""
                }
            }
        };
        logger.debug("creating view:" + JSON.stringify(view));
        return new Request("put", self.url + view._id, JSON.stringify(view)).call().then(function(result) {
            logger.debug("result view:" + JSON.stringify(result));
            var couchQuery = _.omit(query, "mapFunction");
            //couchQuery = JSON.stringify(couchQuery);
            return new Request("get", self.url + view._id + "/_view/viewName", couchQuery).call().then(function(result) {
                var raw = JSON.parse(result.data);
                var total = 0;
                var groupBy = _.groupBy(raw.rows, function(row) {
                    total++;
                    return row.key;
                });
                var rows = {};
                _.each(groupBy, function(lines, key) {
                    rows[key] = _.map(lines, function(line) {
                        return _.omit(line.value, "_id", "_rev");
                    });
                });
                var result = {
                    total_rows:total,
                    total_keys:_.size(rows),
                    rows: rows
                };
                logger.debug("result query "+JSON.stringify(query)+" : ");
                logger.debug(result);
                return result;
            });
        });
    }

    return classe;
});