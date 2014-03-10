define([
    "db/IndexStorage",
    "db/InMemoryStorage"
],
    function (IndexStorage, Storage) {
        describe('IndexStorage', function () {
            var testOk;
            var storage;
            var object;
            var asyncTest = function () {
                return testOk;
            }

            beforeEach(function () {
                storage = new IndexStorage(new Storage());
            });

            it('adds an index and retrieve it', function () {
                storage.getAll().then(function(result) {
                    expect(result).toEqual({});
                }).then(function() {
                    return storage.addIndexKey("test", "value");
                })
                .then(function(result) {
                    return storage.getAll();
                }).then(function(result) {
                    expect(result["test"]).toEqual("value");
                    testOk = true;
                });
                waitsFor(asyncTest);
            });
        })
    });