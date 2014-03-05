define(["utils/ObjectUtils"], function(ObjectUtils) {
    console.log("loading utils");
    var classe = function Utils() {}

    var addFunction = ObjectUtils.addFunction;

    addFunction(classe, 'forEach', function(object, fonction) {
           for (var key in object) {
               var value = object[key];
               if (typeof value === 'function') {
                   continue;
               }
               var result = fonction(value, key);
               if (result !== undefined) {
                return result;
               }
           }
       });

    addFunction(Object, 'pourChaque', function(fonction) {
        return classe.prototype.forEach(this, fonction);
    });

    addFunction(Object, 'size', function() {
        var cpt = 0;
        this.pourChaque(function(value, key) {
            cpt++;
        });
        return cpt;
    });

    var equalsGeneric = function(value, value2) {
        if (value == undefined || value2 == undefined) {
            return value === value2;
        }
        if (typeof value == 'object') {
            return value.equals(value2);
        } else if (typeof value2 == 'object') {
            return value2.equals(value);
        } else {
            return value2 === value;
        }
    };

    addFunction(classe, 'equalsGeneric', equalsGeneric);

    addFunction(Object, 'equals', function(object) {
        if (typeof object != 'object') {
            return false;
        }
        var cpt = 0;
        var result = this.pourChaque(function(value, key) {
            if (!equalsGeneric(value, object[key])) {
                return false;
            }
            cpt++;
        });
        if (result != undefined) {
            return result;
        }
        return cpt == object.size();
    });

    addFunction(Object, 'keyOfValue', function(object) {
        var result = this.pourChaque(function(value, key) {
            if (equalsGeneric(value, object)) {
                return key;
            }
        });
        if (result !== undefined) {
            return result;
        }
        return false;
    });

    addFunction(Object, 'containsValue', function(object) {
        return this.keyOfValue(object) !== false;
    });


    addFunction(Object, 'asString', function(separate, fonction) {
        if (separate == undefined) {
            separate = ",";
        }
        if (fonction == undefined) {
            fonction = function(value) {
                return value + "";
            }
        }
        var content = "";
        this.pourChaque(function(value, key) {
            content += separate + fonction(value, key);
        });
        return content.substring(separate.length);
    });

    addFunction(Object, 'transform', function(fonction) {
        var result = new Object();
        this.pourChaque(function(value, key) {
            result[key] = fonction(value, key);
        });
        return result;
    });

    addFunction(Object, 'filter', function(fonction) {
        var result = new Object();
        this.pourChaque(function(value, key) {
            if (fonction(value, key)) {
                result[key] = value;
            }
        });
        return result;
    });

    addFunction(Object, 'findFirstMatching', function(fonction) {
        return this.pourChaque(function(value, key) {
            if (fonction(value, key)) {
                return new Array(key, value);
            }
        });
    });

    addFunction(Object, 'clone', function(fonction) {
        var result = new this.constructor();
        this.pourChaque(function(value, key) {
            result[key] = value;
        });
        return result;
    });

    return new classe();
});

