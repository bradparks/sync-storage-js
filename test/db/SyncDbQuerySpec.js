define([
    "db/SyncDB",
    "q",
    "underscore",
    "utils/StringUtils",
],
    function (SyncDB, Q, _, StringUtils) {
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