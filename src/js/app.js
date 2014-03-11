define([
"db/SyncDB",
"db/LocalForageBridge",
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
            for (var i=0;i<100;i++) {
                var promise = db.save({
                    value:"plop"
                });
                promises.push(promise);
            }
            Q.all(promises).then(function() {
                var startQuery = new Date().getTime();
                db.query({
                    mapFunction:function(emit, doc) {
                        emit(doc._id, doc);
                    },
                    startkey:input+"",
                    endkey:startQuery+""
                }).then(function(result) {
                    var endQuery = new Date().getTime();
                    alert("elapsed time = "+(endQuery - startQuery));
                    console.log(result);
                });
            });

        });
    };
});