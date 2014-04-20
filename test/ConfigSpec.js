define([
    "basicStorage/InMemoryStorage",
    "bridge/RemoteFacadeBridge"
],
function (InMemoryStorage, RemoteFacadeBridge) {
    var memory = function() {
        return new InMemoryStorage();
    };
    var couch = function() {
        return new RemoteFacadeBridge({
            host:"http://localhost:5984",
            name:"sync_test"
        });
    };
    return {
        storageImpl: couch
    }
});