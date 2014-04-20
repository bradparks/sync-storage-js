define([
"utils/Request",
"utils/Logger",
"utils/Lock",
"q",
"underscore",
"utils/StringUtils"
], function(Request, Logger, Lock, Q, _, StringUtils) {
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

    classe.prototype.initDb = function() {
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
        return this.initDb();
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

    var prefix = "couchFix";

    var replacePrefix = function(object, prefix, replace) {
        var result = _.extend({}, object);
        _.each(result, function(value, key) {
            if (StringUtils.startsWith(key, prefix)) {
                delete result[key];
                key = replace + key.substring(prefix.length);
                result[key] = value;
            }
        });
        return result;
    }

    var box = function(object) {
        return replacePrefix(object, "_", prefix);
    }

    var unbox = function(object) {
        return replacePrefix(_.omit(object, "_id", "_rev"), prefix, "_");
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
            var storedObject = box(object);
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
                return unbox(result);
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

    var isDefined = function(value) {
        return value !== null && value !== undefined;
    }

    var filterToString = function(filter) {
        var toValue = function(value) {
            var result = value;
            if (typeof value == "string") {
                result = "\"" + result + "\"";
            }
            return result;
        }
        var toComp = function(value1, value2, inclusive) {
            var result = "&& (" + value1 + "<";
            result += inclusive ? "=" : "";
            result += value2 + ")";
            return result;
        }

        var result = "";
        var keyName = filter.keyName;
        if (keyName.substring(0, 1) == "_") {
            keyName = prefix + keyName.substring(1);
        }
        result += "var value = doc."+keyName+";\n";
        result += "flag &= (true ";
        if (isDefined(filter.lowBound)) {
            result += toComp(toValue(filter.lowBound), "value", filter.lowInclusive);
        }
        if (isDefined(filter.highBound)) {
            result += toComp("value", toValue(filter.highBound), filter.highInclusive);
        }
        result += ");\n";
        return result;
    }

    classe.prototype.query = function(query) {
        var sortKey = "_id";
        if (query.sorts && query.sorts.length > 0) {
            if (query.sorts.length > 1) {
                throw "only 1 sort at the same time is supported";
            }
            sortKey = query.sorts[0].keyName;
        }
        var self = this;
        var strFunc = "function (doc) {\n";
        strFunc += "var flag = true;\n";
        _.each(query.filters, function(filter) {
            strFunc += filterToString(filter);
        });
        strFunc += "if (flag) {emit(doc."+sortKey+", doc);}}";
        var view = {
            "_id":"_design/exemple",
            "views": {
                "viewName": {
                    "map": strFunc
                }
            }
        };
        logger.debug("creating view:" + JSON.stringify(view));
        return new Request("put", self.url + view._id, JSON.stringify(view)).call().then(function(result) {
            logger.debug("result view:" + JSON.stringify(result));
            var couchQuery = _.omit(query, "mapFunction");
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
                        return unbox(line.value);
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

    classe.prototype.isAdvanced = function() {
        return true;
    }

    return classe;
});