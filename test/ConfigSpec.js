define([
    "basicStorage/InMemoryStorage",
    "bridge/RemoteFacadeBridge",
    "basicStorage/IndexedDbStorage"
],
function (InMemoryStorage, RemoteFacadeBridge, IndexedDbStorage) {
    var memory = function() {
        return new InMemoryStorage();
    };
    var couch = function() {
        return new RemoteFacadeBridge({
            host:"http://localhost:5984",
            name:"sync_test"
        });
    };
    var indexed = function() {
        return new IndexedDbStorage({
            name: "indexedDB",
            indexes: ["_id", "_rev", "_timestamp", "value", "_conflict"]
        });
    }
    return {
        storageImpl: memory
    }
});