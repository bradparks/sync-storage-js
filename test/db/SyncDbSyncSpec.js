define([
    "SyncStorage",
    "q",
    "underscore",
    "utils/StringUtils",
    "bridge/RemoteFacadeBridge",
    "browserStorage/InMemoryStorage",
    "utils/Logger",
    "query/Query",
    "query/Filter",
    "ConfigSpec"
],
    function (SyncStorage, Q, _, StringUtils, RemoteFacadeBridge, InMemoryStorage, Logger, Query, Filter, ConfigSpec) {
        describe('SyncStorage', function () {
            var logger = new Logger("SyncDbSyncSpec");
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
            };
            var request = function(object) {
                return {_id:object._id};
            };
            var asyncTest = function () {
                return testOk;
            };
            var log = function (object) {
                console.error(object);
            };

            var stringify = function(object) {
                console.log(JSON.stringify(object));
            };
            var startPromise;

            beforeEach(function () {
                console.log("");
                console.log("starting test...");
                var simpleStorage = ConfigSpec.storageImpl();
                db = new SyncStorage("local", simpleStorage);
                remoteDb = new SyncStorage("remote", simpleStorage);
                object = {value: "test"};
                testOk = false;
                startPromise = Q.all([
                    db.init(),
                    remoteDb.init()
                ]).then(function() {
                    return Q.all([
                        db.destroy(),
                        remoteDb.destroy()
                    ]);
                }).then(function() {
                    return Q.all([
                        db.init(),
                        remoteDb.init()
                    ]);
                });
            });

            afterEach(function() {
                Q.all([
                    db.destroy(),
                    remoteDb.destroy()
                ]);
            });

            it('sync with other SyncStorage', function() {
                startPromise.then(function() {
                    return db.save(object);
                }).then(function(result) {
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

            it('sync with other SyncStorage (both ways, several objects)', function() {
                startPromise.then(function() {
                    // save 4 objects
                    return Q.all(create(db, 4));
                }).then(function(result) {
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
                    expect(syncResult.to.size).toBe(4);
                    expect(syncResult.from.size).toBe(2);
                    return remoteDb.get(object);
                }).then(function(result) {
                    expect(result).toEqual(object);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('sync with other SyncStorage (conflicts)', function() {
                var object1;
                var object2;
                startPromise.then(function() {
                    return Q.all(create(db, 1));
                }).then(function(result) {
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

                    var filter = new Filter("_conflict", true, true, true, true);
                    var query = new Query(null, [filter], null);
                    return Q.all([
                        db.queryHistory(query),
                        remoteDb.queryHistory(query)
                    ]);
                }).then(function(result) {
                    var total = result[0].total_rows + result[1].total_rows;
                    expect(total).toBe(1);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('sync with other SyncStorage (onConflict method)', function() {
                db.onConflict = function(doc1, doc2) {
                    return doc1._rev > doc2._rev ? doc1 : doc2;
                };
                startPromise.then(function() {
                    return Q.all(create(db, 1));
                }).then(function(result) {
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
                    var filter = new Filter("_conflict", true, true, true, true);
                    var query = new Query(null, [filter], null);
                    return db.queryHistory(query);
                }).then(function(result) {
                    expect(result.total_rows).toBe(0);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });
        });
    });