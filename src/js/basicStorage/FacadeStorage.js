define([
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