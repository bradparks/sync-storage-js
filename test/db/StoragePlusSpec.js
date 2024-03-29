define([
    "db/StoragePlus",
    "browserStorage/InMemoryStorage"
],
    function (StoragePlus, Storage) {
        describe('StoragePlus', function () {
            var testOk;
            var storage;
            var object;
            var asyncTest = function () {
                return testOk;
            };

            beforeEach(function () {
                storage = new StoragePlus("storage", new Storage());
                object = {value: "test"};
                testOk = false;
            });

            it('stores an object and retrieve it', function () {
                var key = "clef";
                var objectOrigin = object;
                storage.save(key, objectOrigin).then(function () {
                    return storage.get(key);
                }).then(function (object) {
                    expect(object).toEqual(objectOrigin);
                    expect(object).not.toBe(objectOrigin);
                    testOk = true;
                });
                waitsFor(asyncTest);
            });
        });
    });