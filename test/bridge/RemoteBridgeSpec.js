define([
    "bridge/RemoteFacadeBridge",
    "q",
    "utils/Logger"
],
function (Bridge, Q, Logger) {
    describe('Bridge', function () {
        var logger = new Logger("RemoteBridgeSpec", Logger.INFO)

        var waitPromise = function(promise) {
            var resolved = false;
            promise.then(function() {
                resolved = true;
            }).fail(function(err) {
                console.error(JSON.stringify(err));
            });
            waitsFor(function() {
                if (resolved) {
                    logger.debug("end test");
                }
                return resolved;
            });
        };
        var log = function(object) {
            console.log(JSON.stringify(object));
        };
        var object;
        var startPromise;

        beforeEach(function () {
            logger.info("start test...");
            storage = new Bridge({
                host:"http://localhost:5984",
                name:"test"
            });
            startPromise = storage.init().then(function() {
                return storage.destroy();
            });
            object = {value: "test"};
        });

        it('isSupported should return true', function () {
            waitPromise(
                startPromise.then(function() {
                    return storage.isSupported();
                }).then(function(result) {
                    expect(result).toBe(true);
                })
            );
        });

        it('isSupported should return false', function () {
            var storage2 = new Bridge("http://localhost:1000", "test");
            waitPromise(
                startPromise.then(function() {
                    return storage2.isSupported();
                }).then(function(result) {
                    expect(result).toBe(false);
                })
            );
        });

        it('exists should return false', function () {
            waitPromise(
                startPromise.then(function() {
                    return storage.exists();
                }).then(function(result) {
                    expect(result).toBe(false);
                })
            );
        });

        it('exists should return true', function () {
            waitPromise(
                startPromise.then(function() {
                    return storage.create()
                }).then(function() {
                    return storage.exists();
                }).then(function(result) {
                    expect(result).toBe(true);
                })
            )
        });

        it('should store key/value and then delete it', function () {
            waitPromise(
                startPromise.then(function() {
                    return storage.create()
                }).then(function() {
                    return storage.save("key", object);
                }).then(function() {
                    return storage.get("key");
                }).then(function(result) {
                    expect(result).toEqual(object);
                }).then(function() {
                    return storage.del("key");
                }).then(function() {
                    return storage.get("key");
                }).then(function(result) {
                    expect(result).toBe(null);
                })
            );
        });

        it('should store key/value and then delete it', function () {
            waitPromise(
                startPromise.then(function() {
                    return storage.create()
                }).then(function() {
                    return Q.all([
                        storage.save("key1", object),
                        storage.save("key2", object),
                        storage.save("key3", object)
                    ]);
                }).then(function() {
                    return storage.query({
                        mapFunction:function(emit, doc) {
                            emit(doc.data, doc)
                        }
                    });
                }).then(function(result) {
                    expect(result).toBe(null);
                })
            );
        });

    });
});