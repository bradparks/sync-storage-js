define([
    "bridge/RemoteFacadeBridge"
],
function (Bridge) {
    describe('Bridge', function () {

        var waitPromise = function(promise) {
            var resolved = false;
            promise.then(function() {
                resolved = true;
            }).fail(function(err) {
                console.error(JSON.stringify(err));
            });
            waitsFor(function() {
                return resolved;
            });
        };
        var log = function(object) {
            console.log(JSON.stringify(object));
        };
        var object;

        beforeEach(function () {
            storage = new Bridge({
                host:"http://localhost:5984",
                name:"test"
            });
            waitPromise(
                storage.init().then(function() {
                    return storage.destroy();
                })
            );
            object = {value: "test"};
        });

        it('isSupported should return true', function () {
            waitPromise(
                storage.isSupported().then(function(result) {
                    expect(result).toBe(true);
                })
            );
        });

        it('isSupported should return false', function () {
            storage = new Bridge("http://localhost:1000", "test");
            waitPromise(
                storage.isSupported().then(function(result) {
                    expect(result).toBe(false);
                })
            );
        });

        it('exists should return false', function () {
            waitPromise(
                storage.exists().then(function(result) {
                    expect(result).toBe(false);
                })
            );
        });

        it('exists should return true', function () {
            waitPromise(
                storage.create().then(function() {
                    return storage.exists();
                }).then(function(result) {
                    expect(result).toBe(true);
                })
            );
        });

        it('should store key/value and then delete it', function () {
            waitPromise(
                storage.create().then(function() {
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

    });
});