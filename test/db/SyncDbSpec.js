define([
    "SyncStorage",
    "q",
    "underscore",
    "utils/StringUtils",
    "bridge/CouchDBBridge",
    "utils/Logger",
    "basicStorage/InMemoryStorage"
],
    function (SyncStorage, Q, _, StringUtils, CouchDBBridge, Logger, InMemoryStorage) {
        describe('SyncStorage', function () {
            var logger = new Logger("SyncDbSpec");
            //logger.root.level = Logger.DEBUG;

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
                logger.error(object);
            };

            var stringify = function(object) {
                logger.info(JSON.stringify(object));
            };
            var waitPromise = function(promise) {
                var resolved = false;
                promise.then(function() {
                    resolved = true;
                }).fail(function(err) {
                    logger.error(err);
                });
                waitsFor(function() {
                    return resolved;
                });
            };

            beforeEach(function () {
                logger.info("");
                logger.info("starting test...");
                var simpleStorage = new CouchDBBridge({
                    host:"http://localhost:5984",
                    name:"sync_test"
                });
                simpleStorage = new InMemoryStorage();
                db = new SyncStorage("local", simpleStorage);
                remoteDb = new SyncStorage("remote", simpleStorage);
                object = {value: "test"};
                testOk = false;
                waitPromise(
                    simpleStorage.init().then(function() {
                        return simpleStorage.destroy();
                    }).then(function() {
                        return simpleStorage.create();
                    })
                );
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
                db.save(object).then(function(result) {
                    object = result;
                    return db.get(request(result));
                }).then(function (result) {
                    object2 = result;
                    expect(result).toEqual(object);
                }).then(function() {
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
                db.save(object).then(function (result) {
                    object = result;
                    var object2 = _.extend({}, object);
                    object2.value = "test2";
                    return db.save(object2)
                }).then(function (object2) {
                    expect(object).not.toEqual(object2);
                    return Q.all([
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
                var copy = _.extend({}, object);
                db.save(object)
                .then(function (result) {
                    expect(object).toEqual(copy);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('deletes an object', function () {
                db.save(object).then(function (result) {
                    object = result;
                    return db.del(object)
                }).then(function() {
                    return db.get(object)
                }).then(function(result) {
                    expect(result).toBe(null);
                    testOk = true;
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
        });
    });