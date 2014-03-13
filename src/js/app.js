define([
"db/SyncDB",
"basicStorage/LocalForageBridge",
"utils/FunctionUtils",
"localForage",
"q"
], function(SyncDB, LocalForageBridge, FunctionUtils, localForage, Q) {
    return function() {
        // hack to fix localForage init bug
        // https://github.com/mozilla/localForage/issues/65
        FunctionUtils.onCondition(function() {
            return localForage.driver ? true : false;
        }, function() {
            var db = new SyncDB("test", new LocalForageBridge());
            db.save({
                value:"plop"
            });
            var input = new Date().getTime();
            var promises = [];
            for (var i=0;i<50;i++) {
                var promise = db.save({
                    value:"plop"
                });
                promises.push(promise);
            }
            Q.all(promises).then(function() {
                var startQuery = new Date().getTime();
                db.waitIndex().then(function() {
                    return db.query({
                        mapFunction:function(emit, doc) {
                            emit(doc._timestamp, doc);
                        },
                        startkey:input+"",
                        endkey:startQuery+"",
                        indexDef:"_timestamp"
                    });
                }).then(function(result) {
                    var endQuery = new Date().getTime();
                    console.log("elapsed time = "+(endQuery - startQuery));
                    console.log(result);
                });
            });

        });
    };
});