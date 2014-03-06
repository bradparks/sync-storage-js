define([
    "db/InMemoryStorage"
],
    function (Storage) {
        describe('Storage', function () {
            var testOk;
            var storage;
            var object;
            var asyncTest = function () {
                return testOk;
            }

            beforeEach(function () {
                storage = new Storage();
                object = {value: "test"};
                testOk = false;
            });

            it('stores an object and retrieve an object', function () {
                var key = "clef";
                var objectOrigin = object;
                storage.save(key, objectOrigin).then(function () {
                    return storage.get(key);
                }).then(function (object) {
                    expect(object).toBe(objectOrigin);
                    testOk = true;
                });
                waitsFor(asyncTest);
            });
        })
    });