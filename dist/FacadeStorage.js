define('basicStorage/IndexedDbStorage',[
    "q"
], function (Q) {
    var classe = function () {
        if (!classe.isSupported()) {
            throw "IndexedDB is not supported by your browser";
        }
        init(this);
    }

    var reqToDefer = function(req, defer) {
        req.onsuccess = function(event) {
            defer.resolve(event.target.result);
        };
        req.onerror = function(event) {
            defer.reject(event);
        }
    }

    classe.prototype.save = function (key, object) {
        var self = this;
        var objectStore = getObjectStore(self);
        var req = objectStore.put(object);
        reqToDefer(req, defer);
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var index = getObjectStore(this).index("_id");
        var req = index.get(key);
        reqToDefer(req, defer);
        return defer.promise;
    }

    classe.prototype.del = function (key) {
        var defer = Q.defer();
        var req = getObjectStore(this).delete(key);
        reqToDefer(req, defer);
        return defer.promise;
    }

    classe.prototype.destroy = function() {
        var self = this;
        var defer = Q.defer();
        var req = this.indexedDB.deleteDatabase("indexedDbStorage");
        req.onsuccess = function(event) {
            defer.resolve();
            init(self);
        };
        req.onerror = function(event) {
            defer.reject(event);
        }
        return defer.promise;
    }

    var init = function(self) {
        // In the following line, you should include the prefixes of implementations you want to test.
        self.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        // DON'T use "var indexedDB = ..." if you're not in a function.
        // Moreover, you may need references to some window.IDB* objects:
        self.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        self.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
        // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

        var defer = Q.defer();
        var req = self.indexedDB.open("indexedDbStorage", 1);
        req.onsuccess = function() {
            self.db = req.result;
            defer.resolve(req.result);
        }
        req.onerror = function(event) {
            defer.reject(event);
        }
        req.onupgradeneeded = function(event) {
          var db = event.target.result;

          var objectStore = db.createObjectStore("data", { keyPath: "_id" });

          objectStore.createIndex("_rev", "_rev", { unique: false });
          objectStore.createIndex("_id", "_id", { unique: true });
        };
        return defer.promise;
    }

    var getObjectStore = function(self) {
        return self.db.transaction(["data"], "readwrite").objectStore("data");
    }

    classe.isSupported = function() {
        var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        return indexedDB ? true : false;
    }

    return classe;
});
define('basicStorage/LocalStorageBridge',[
    "q",
    "underscore"
], function (Q, _) {
    var classe = function () {
    }

    classe.prototype.save = function (key, object) {
        var defer = Q.defer();
        localStorage.setItem(key, JSON.stringify(object));
        defer.resolve(object);
        return defer.promise;
    }

    classe.prototype.get = function (key) {
        var defer = Q.defer();
        var val = localStorage.getItem(key);
        var result = val ? JSON.parse(val) : null;
        defer.resolve(result);
        return defer.promise;
    }

    classe.prototype.del = function (key) {
        var defer = Q.defer();
        localStorage.removeItem(key);
        defer.resolve();
        return defer.promise;
    }

    classe.prototype.destroy = function() {
        var defer = Q.defer();
        localStorage.clear();
        defer.resolve();
        return defer.promise;
    }

    classe.isSupported = function() {
        return true;
    }

    return classe;
});
define('basicStorage/FacadeStorage',[
    "q",
    "underscore",
    "basicStorage/IndexedDbStorage",
    "basicStorage/LocalStorageBridge"
], function (Q, _, IndexedDbStorage, LocalStorageBridge) {
    var impls = [
        LocalStorageBridge,
        IndexedDbStorage
    ];
    var usedImpl = _.find(impls, function(impl) {
        return impl.isSupported && impl.isSupported();
    });
    if (!usedImpl) {
        throw "no impl is supported for FacadeStorage";
    }

    var classe = function () {
        this.storage = new usedImpl();
    }

    classe.prototype.save = function (key, object) {
        return this.storage.save(key, object);
    }

    classe.prototype.get = function (key) {
        return this.storage.get(key);
    }

    classe.prototype.del = function (key) {
        return this.storage.del(key);
    }

    classe.prototype.destroy = function() {
        return this.storage.destroy();
    }

    return classe;
});
