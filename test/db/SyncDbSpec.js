define([
    "db/SyncDB",
    "jquery",
    "q",
    "underscore"
],
    function (SyncDB, $, Q, _) {
        describe('SyncDB', function () {
            var db;
            var object;
            var testOk;
            var asyncTest = function () {
                return testOk;
            }
            var log = function (object) {
                console.error(object);
            }

            var stringify = function(object) {
                console.log(JSON.stringify(object));
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
                            Q.all([
                                db.get(object2),
                                db.get({_id: object._id}),
                                db.get({_id: object._id, _rev: object._rev}),
                                db.get({_id: object._id, _rev: object2._rev})
                            ]).then(function(array) {
                                expect(array[0]).toEqual(object2);
                                expect(array[1]).toEqual(object2);
                                expect(array[2]).toEqual(object);
                                expect(array[3]).toEqual(object2);
                                testOk = true;
                            });
                        });
                    }).fail(log);
                waitsFor(asyncTest);
            });

            it('deletes an object', function () {
                db.save(object)
                    .then(function (object) {
                        db.del(object).then(function() {
                            db.get(object).then(function(result) {
                                expect(result).toBe(null);
                                testOk = true;
                            });
                        }).fail(log);
                    }).fail(log);
                waitsFor(asyncTest);
            });

            it('throw an exception if get is called without _id field', function () {
                try {
                db.get({}).then(function() {
                    expect("an expection to throwned").toBe(true);
                }).fail(function() {
                    testOk = true;
                });
                }catch(e) {
                    testOk = true;
                }
                waitsFor(asyncTest);
            });

            it('get function return null if no doc is found', function () {
                db.get({_id:"plop"}).then(function(result) {
                    expect(result).toBe(null);
                    testOk = true;
                });
                waitsFor(asyncTest);
            });

            it('query docs by value', function () {
                var promises = [];
                for (var i=0;i<10;i++) {
                    promises.push(db.save({
                        value: "test"+i
                    }));
                }
                promises.push(db.save({
                    plop:"not queried"
                }));
                var objects = [];
                Q.all(promises).then(function(result) {
                    _.each(result, function(object) {
                        if (object.value) {
                            objects.push(object);
                        }
                    });
                    return db.query({
                        mapFunction:function(emit, doc) {
                            if (doc.value) {
                                emit(doc._id, doc);
                            }
                        },
                        startkey:undefined,
                        endkey:undefined
                    });
                }).then(function(result) {
                    var map = {};
                    for (var i = 0;i < objects.length;i++) {
                        map[objects[i]._id] = [objects[i]];
                    }
                    var expected = {
                       total_keys:10,
                       total_rows:10,
                       rows: map
                    };
                    expect(result).toEqual(expected);
                    testOk = true;
                })
                waitsFor(asyncTest);
            });

            it('sync with other syncDb', function() {
                var remoteDb = new SyncDB("remote");
                db.save(object).then(function(result) {
                    object = result;
                    return db.syncWith(remoteDb);
                }).then(function(syncResult) {
                    expect(syncResult.to.ok).toBe(true);
                    expect(syncResult.from.ok).toBe(true);
                    expect(syncResult.to.size).toBe(1);
                    expect(syncResult.from.size).toBe(0);
                    return remoteDb.get(object);
                }).then(function(result) {
                    expect(result).toEqual(object);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });
        })
    });