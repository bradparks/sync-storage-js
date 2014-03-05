define(["utils/ObjectUtils"], function(ObjectUtils) {
    console.log("loading array utils");
    var classe = function ArrayUtils() {}
    
    var addFunction = function(clazz, functionName, fonction) {
        clazz.prototype[functionName] = fonction;
    }

    addFunction(Array, 'transform', function(fonction) {
        var result = new Array();
        this.pourChaque(function(value, key) {
            result[key] = fonction(value, key);
        });
        return result;
    });

    addFunction(Array, 'removeByIndex', function(index) {
        if (index < 0 || index >= this.length) {
            throw "index out of bounds : "+index+" out of "+0+" -> "+(this.length-1);
        }
        this.splice(index, 1);
        return this;
    });

    addFunction(Array, 'removeByValue', function(value) {
        var result = this.findFirstMatching(function(valueIte) {
            if (value === valueIte) {
                return true;
            }
            if (typeof value != "object") {
                return false;
            }
            return value.equals(valueIte);
        });
        if (result == undefined) {
            throw JSON.stringify(value) + " not found";
        }
        return this.removeByIndex(result[0]);
    });

    addFunction(Array, 'removeAll', function(object) {
        var array = this;
        object.pourChaque(function(value, key) {
            var key2 = array.keyOfValue(value);
            if (key2 !== false) {
                array.removeByIndex(key2);
            }
        });
        return this;
    });

    addFunction(Array, 'containsAll', function(object) {
        var clone = this.clone();
        var result = object.pourChaque(function(value, key) {
            var key2 = clone.keyOfValue(value);
            if (key2 === false) {
                return false;
            }
            clone.removeByIndex(key2);
        });
        if (result !== undefined) {
            return result;
        }
        return true;
    });

    addFunction(Array, 'equalsContains', function(object) {
        if (object.length != this.length) {
            return false;
        }
        return this.containsAll(object);
    });

    return new classe();
});

