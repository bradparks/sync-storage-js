define([
"db/SyncDB",
"db/LocalForageBridge",
"utils/FunctionUtils",
"localForage"
], function(SyncDB, LocalForageBridge, FunctionUtils, localForage) {
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
            for (var i=0;i<100;i++) {
                setTimeout(function() {
                    var j = i;
                    db.save({

                        value:"plop"+j
                    });
                }, i);
            }
        });
    };
});