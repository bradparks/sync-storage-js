define([
    "db/SyncDB",
    "jquery",
    "q",
    "underscore",
    "utils/StringUtils",
],
    function (SyncDB, $, Q, _, StringUtils) {
        describe('SyncDB', function () {
            var db;
            var remoteDb;
            var object;
            var testOk;

            var create = function(db, number) {
                var result = [];
                for (var i=0;i<number;i++) {
                    result.push({
                        value:"test"+i
                    });
                }
                return _.map(result, function(object) {
                    return db.save(object);
                });
            }
            var request = function(object) {
                return {_id:object._id};
            }
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
                console.log("");
                console.log("starting test...");
                var simpleStorage = null;
                db = new SyncDB("local", simpleStorage);
                remoteDb = new SyncDB("remote", simpleStorage);
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
                .then(function() {
                    return db.get({_id: object._id});
                }).then(function(result) {
                    expect(result).toEqual(object);
                }).then(function() {
                    return db.get({_id: object._id, _rev: object2._rev});
                }).then(function(result) {
                    expect(result).toEqual(object);
                }).then(function() {
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

            it('modifying an object coming from the db should not modify the db', function () {
                db.save(object)
                .then(function (result) {
                    object = result;
                    object.value = "plop";
                    return db.get(request(object));
                }).then(function(result) {
                    expect(object).not.toEqual(result);
                    expect(object.value).not.toEqual(result.value);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('saving an object should not modify it', function () {
                var copy = $.extend({}, object);
                db.save(object)
                .then(function (result) {
                    expect(object).toEqual(copy);
                    testOk = true;
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
                var promises = create(db, 10);
                promises.push(db.save({
                    plop:"not queried"
                }));
                var objects = [];
                Q.all(promises).then(function(result) {
                    objects = result;
                    expect(result.length).toBe(11);
                    return db.query({
                        mapFunction:function(emit, doc) {
                            if (doc.value) {
                                emit(doc.value, doc);
                            }
                        },
                        startkey:"test3",
                        endkey:"test7",
                        indexDef:"value"
                    });
                }).then(function(result) {
                    var map = {};
                    var total = 0;
                    for (var i = 0;i < objects.length;i++) {
                        var object = objects[i];
                        if (object.value && object.value >= "test3" && object.value <= "test7") {
                            map[object.value] = [object];
                            total++;
                        }
                    }
                    var attendu = {
                       total_keys:total,
                       total_rows:total,
                       rows: map
                    };
                    expect(result).toEqual(attendu);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });
        });
    });