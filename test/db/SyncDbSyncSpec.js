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

            it('sync with other syncDb', function() {

                db.save(object).then(function(result) {
                    object = result;
                    return db.syncWith(remoteDb);
                }).then(function(syncResult) {
                    expect(syncResult.to.ok).toBe(true);
                    expect(syncResult.from.ok).toBe(true);
                    expect(syncResult.to.size).toBe(1);
                    expect(syncResult.from.size).toBe(0);
                    return remoteDb.get(request(object));
                }).then(function(result) {
                    expect(result).toEqual(object);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('sync with other syncDb (both ways, several objects)', function() {
                // save 4 objects
                Q.all(create(db, 4)).then(function(result) {
                    // change the value of the 1st object
                    object = result[0];
                    object.value = "plop";
                    // save object
                    var promises = [db.save(object)];
                    // add 2 new objects on remoteDb
                    promises = promises.concat(create(remoteDb, 2));
                    return Q.all(promises);
                }).then(function(result) {
                    object = result[0];
                    // expect 3 objects saved
                    expect(result.length).toBe(3);
                    return db.syncWith(remoteDb);
                }).then(function(result) {
                    var syncResult = result;
                    expect(syncResult.to.ok).toBe(true);
                    expect(syncResult.from.ok).toBe(true);
                    // expect 4 objects synchronized
                    expect(syncResult.to.size).toBe(5);
                    expect(syncResult.from.size).toBe(2);
                    return remoteDb.get(object);
                }).then(function(result) {
                    expect(result).toEqual(object);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('sync with other syncDb (conflicts)', function() {
                var object1;
                var object2;
                 // save 1 object
                Q.all(create(db, 1)).then(function(result) {
                    object = result[0];
                    return db.syncWith(remoteDb);
                }).then(function() {
                    return db.get(request(object));
                }).then(function(object) {
                    object.value = "local value";
                    return db.save(object);
                }).then(function(result) {
                    object1 = result;
                    return remoteDb.get(request(object));
                }).then(function(object) {
                    object.value = "remote value";
                    return remoteDb.save(object);
                }).then(function(result) {
                    object2 = result;
                    return db.syncWith(remoteDb);
                }).then(function() {
                    return Q.all([
                        db.waitIndex(),
                        remoteDb.waitIndex()
                    ]);
                }).then(function() {
                    var query = request(object);
                    return Q.all([
                        db.get(query),
                        remoteDb.get(query)
                    ]);
                }).then(function(result) {
                    expect(StringUtils.startsWith(result[0]._rev, "2-")).toBe(true);
                    expect(StringUtils.startsWith(result[1]._rev, "2-")).toBe(true);
                    expect(StringUtils.startsWith(object1._rev, "2-")).toBe(true);
                    expect(StringUtils.startsWith(object2._rev, "2-")).toBe(true);
                    expect(result[0]).toEqual(result[1]);
                    expect(object1).not.toEqual(object2);

                    return Q.all([
                        db.get({_id:object1._id, _rev:object1._rev}),
                        db.get({_id:object2._id, _rev:object2._rev}),
                    ]);
                }).then(function(array) {
                    expect(array[0]).not.toBe(null);
                    expect(array[1]).not.toBe(null);
                    stringify(array);


                    expect(array[0]).not.toEqual(array[1]);
                    var conflicted = array[0]._rev < array[1]._rev ? array[0] : array[1];
                    expect(conflicted._conflict).toBe(true);
                    delete array[1]._conflict;
                    delete array[0]._conflict;
                    delete array[1]._timestamp;
                    delete array[0]._timestamp;
                    delete object1._timestamp;
                    delete object2._timestamp;
                    expect(array[0]).toEqual(object1);
                    expect(array[1]).toEqual(object2);

                    return db.queryHistory({
                        mapFunction:function(emit, doc) {
                            if (doc._conflict) {
                                emit(doc._id, doc);
                            }
                        },
                        indexDef:"_conflict"
                    });
                }).then(function(result) {
                    expect(result.total_rows).toBe(1);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('sync with other syncDb (onConflict method)', function() {
                db.onConflict = function(doc1, doc2) {
                    return doc1._rev > doc2._rev ? doc1 : doc2;
                }
                 // save 1 object
                Q.all(create(db, 1)).then(function(result) {
                    object = result[0];
                    return db.syncWith(remoteDb);
                }).then(function() {
                    return db.get(request(object));
                }).then(function(object) {
                    object.value = "local value";
                    return db.save(object);
                }).then(function(result) {
                    return remoteDb.get(request(object));
                }).then(function(object) {
                    object.value = "remote value";
                    return remoteDb.save(object);
                }).then(function(result) {
                    return db.syncWith(remoteDb);
                }).then(function() {
                    return db.queryHistory({
                        mapFunction:function(emit, doc) {
                            if (doc._conflict) {
                                emit(doc._id, doc);
                            }
                        },
                        indexDef:"_conflict"
                    });
                }).then(function(result) {
                    expect(result.total_rows).toBe(0);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });
        });
    });