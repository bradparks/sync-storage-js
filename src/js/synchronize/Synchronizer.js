define([
"utils/ObjectUtils",
"synchronize/Change",
"utils/ArrayUtils"
], function(ObjectUtils, Change) {

   var classe = function Synchronizer() {
        this.equalsFunction = function(object1, object2) {
            return object1 === object2;
        }
        this.isNotDefinedFunction = function(object) {
            return object === undefined;
        }
   }

    /*
    return a list of change
    */
    classe.prototype.synchronize = function(object1, object2) {
        var result = new Array();
        var keys1 = new Array();
        var synchronizer = this;
        object1.pourChaque(function(value, key) {
            keys1.push(key);
            var value2 = object2[key];
            var change;
            if (synchronizer.isNotDefinedFunction(value)) {
                change = new Change(key, value, value2, Change.CREATE);
            } else {
                if (synchronizer.isNotDefinedFunction(value2)) {
                    change = new Change(key, value, value2, Change.DELETE);
                } else if (!synchronizer.equalsFunction(value, value2)) {
                    change = new Change(key, value, value2, Change.UPDATE);
                }
            }
            if (change !== undefined) {
                result.push(change);
            }
        });
        object2.pourChaque(function(value, key) {
            if (!keys1.containsValue(key)) {
                result.push(new Change(key, undefined, value, Change.CREATE));
            }
        });
        return result;
    }

    classe.prototype.synchronizeSet = function(object1, object2) {
        var array2 = new Array().concat(object2);
        var deletes = [];
        var synchronizer = this;
        object1.pourChaque(function(value, key) {
            var result = array2.pourChaque(function(value2, key2) {
                if (synchronizer.equalsFunction(value, value2)) {
                    array2.removeByIndex(key2);
                    return 1;
                }
            });
            if (result === undefined) {
                deletes.push(new Change(undefined, value, undefined, Change.DELETE));
            }
        });

        var creates = array2.transform(function(value) {
            return new Change(undefined, undefined, value, Change.CREATE);
        });

        return creates.concat(deletes);
    }

    return classe;
});