define([
    "SyncStorage",
    "q",
    "underscore",
    "utils/StringUtils",
    "bridge/RemoteFacadeBridge",
    "basicStorage/InMemoryStorage"
],
    function (SyncStorage, Q, _, StringUtils, RemoteFacadeBridge, InMemoryStorage) {
        describe('SyncStorage', function () {
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
                var simpleStorage = new RemoteFacadeBridge({
                    host:"http://localhost:5984",
                    name:"sync_test"
                });
                //simpleStorage = new InMemoryStorage();
                db = new SyncStorage("local", simpleStorage);
                remoteDb = new SyncStorage("remote", simpleStorage);
                object = {value: "test"};
                testOk = false;
                startPromise = simpleStorage.init().then(function() {
                    return simpleStorage.destroy();
                }).then(function() {
                    return simpleStorage.create();
                });
            });

            it('query docs by value', function () {
                var promises = create(db, 10);
                promises.push(db.save({
                    plop:"not queried"
                }));
                var objects = [];
                startPromise.then(function() {
                    return Q.all(promises);
                }).then(function(result) {
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