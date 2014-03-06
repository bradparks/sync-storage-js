define([
    "db/SyncDB",
    "jquery"
],
    function (SyncDB, $) {
        describe('SyncDB', function () {
            var db;
            var object;
            var testOk;
            var asyncTest = function () {
                return testOk;
            }
            var log = function (object) {
                console.log("error");
                console.log(object);
            }

            beforeEach(function () {
                db = new SyncDB("local");
                object = {value: "test"};
                testOk = false;
            });

            it('stores an object and return an object with _id and _rev fields', function () {

                db.save(object).then(function (object) {
                    expect(object._id).not.toBe(undefined);
                    expect(object._rev).not.toBe(undefined);
                    expect(object._rev).not.toBe(undefined);
                    expect(object._rev).toMatch(/[0-9]+-[0-9a-zA-Z]+/);
                    expect(object.value).toBe("test");
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('finds an object from its _id or its _id and _rev', function () {
                var object2;
                db.save(object)
                    .then(function(result) {
                        object = result;
                        return db.get(result);
                    })
                    .then(function (result) {
                        object2 = result;
                        expect(result).toEqual(object);
                    })
                    .then(function() {return db.get({_id: object._id})}).then(function(result) {expect(result).toEqual(object)})
                      .then(function() {return db.get({_id: object._id, _rev: object2._rev})}).then(function(result) {expect(result).toEqual(object)})
                      .then(function() {
                        console.log("OK !");
                        testOk = true;
                    }).fail(log);
                waitsFor(asyncTest);
            });

            it('finds an object from its _id or its _id and _rev (2 versions)', function () {
                db.save(object)
                    .then(function (object) {
                        var object2 = $.extend({}, object);
                        object2.value = "test2";
                        db.save(object2).then(function (object2) {
                            expect(object).not.toEqual(object2);

                            expectPromiseEqual(db.get(object2), object2);
                            expectPromiseEqual(db.get({_id: object._id}), object2);
                            expectPromiseEqual(db.get({_id: object._id, _rev: object._rev}), object);
                            expectPromiseEqual(db.get({_id: object._id, _rev: object2._rev}), object2);
                            testOk = true;
                        });
                    }).fail(log);
                waitsFor(asyncTest);
            });
        })
    });