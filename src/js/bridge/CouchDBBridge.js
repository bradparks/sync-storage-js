define([
"utils/Request",
"utils/Logger"
], function(Request, Logger) {
    var classe = function(host, collectionName) {
        var self = this;
        this.host = host;
        this.name = collectionName;
        this.url = host + "/" + this.name + "/";
    }

    var logger = new Logger("CouchDBBridge");

    classe.prototype.exists = function() {
        return new Request("get", this.url).call().then(function(result) {
            return result.statusCode == 200;
        });
    }

    classe.prototype.create = function() {
        return new Request("put", this.url).call().fail(function(req) {
            if (req.statusCode != 412) {
                return req;
            }
        })
    }

    classe.prototype.isSupported = function() {
        return new Request("get", this.host).call().then(function(result) {
            try {
                var data = JSON.parse(result.data)
                return data.couchdb ? true : false;
            } catch(e) {
                return false;
            }
        }).fail(function() {
            return false;
        });
    }

    var transformKey = function(key) {
        var result = key.toLowerCase().replace("/", "$");
        return result;
    }

    var getCouchObject = function(self, key) {
        return new Request("get", self.url+transformKey(key)).call();
    }

    classe.prototype.save = function(key, object) {
        var self = this;
        return getCouchObject(self, key).then(function(result) {
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
            return new Request("put", self.url+transformKey(key), JSON.stringify(storedObject)).call().then(function() {
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
        return new Request("delete", this.url).call();
    }

    return classe;
});