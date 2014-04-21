define([
    "SyncStorage",
    "q",
    "underscore",
    "utils/StringUtils",
    "bridge/CouchDBBridge",
    "utils/Logger",
    "basicStorage/InMemoryStorage",
    "bridge/RemoteFacadeBridge",
    "query/Filter",
    "query/Query",
    "query/Sort",
    "ConfigSpec"
],
    function (SyncStorage, Q, _, StringUtils, CouchDBBridge, Logger, InMemoryStorage, RemoteFacadeBridge, Filter, Query, Sort, ConfigSpec) {
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

            var startPromise;

            beforeEach(function () {
                logger.info("");
                logger.info("starting test...");
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

            it('stores an object and return an object with _id and _rev fields', function () {
                startPromise.then(function() {
                    return db.save(object);
                }).then(function (object) {
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
                startPromise.then(function() {
                    return db.save(object);
                }).then(function (result) {
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
                startPromise.then(function() {
                    return db.save(object);
                }).then(function (result) {
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
                startPromise.then(function() {
                    return db.save(object);
                }).then(function (result) {
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
                startPromise.then(function() {
                    return db.save(object);
                }).then(function (result) {
                    expect(object).toEqual(copy);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

            it('deletes an object', function () {
                startPromise.then(function() {
                    return db.save(object);
                }).then(function (result) {
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
                    startPromise.then(function() {
                        return db.get({});
                    }).then(function() {
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
                startPromise.then(function() {
                    return db.get({_id:"plop"});
                }).then(function(result) {
                    expect(result).toBe(null);
                    testOk = true;
                });
                waitsFor(asyncTest);
            });

            it('query docs by value', function () {
                var objects = [];
                startPromise.then(function() {
                    var promises = create(db, 10);
                    promises.push(db.save({
                        plop:"not queried"
                    }));
                    return Q.all(promises);
                }).then(function(result) {
                    objects = result;
                    expect(result.length).toBe(11);
                    var filter = new Filter("value", "test3", "test7", true, true);
                    var sort = new Sort("value");
                    var query = new Query(null, [filter], [sort]);
                    return db.query(query);
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
                    //logger.info(JSON.stringify(attendu, null, 2));
                    //logger.info(JSON.stringify(result, null, 2));
                    expect(result).toEqual(attendu);
                    testOk = true;
                }).fail(log);
                waitsFor(asyncTest);
            });

        });
    });