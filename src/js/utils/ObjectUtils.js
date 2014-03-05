define([], function() {
    var classe = function ObjectUtils() {}

    function addFunction(classe, functionName, fonction) {
        if (classe.prototype[functionName] !== undefined) {
            throw "function "+functionName+" already defined on "+classe;
        } else {
            classe.prototype[functionName] = fonction;
        }
    }

    addFunction(classe, 'addFunction', addFunction);

    addFunction(classe, 'override', function(object, functionName, fonction) {
        if (object.prototype[functionName] === undefined) {
            throw functionName+" is not defined on "+object;
        }
        object.prototype[functionName] = fonction;
    });

    var abstractMethod = function(methodName, classe) {
                return function() {
                    throw "Abstract method '"+methodName+"' on class "+classe.constructor+" : Not implemented !";
                }
             }
    addFunction(classe, 'addAbstractMethod', function(classe, methodName) {
var abstractMethod = function(methodName, classe) {
                return function() {
                    throw "Abstract method '"+methodName+"' on class "+classe.constructor+" : Not implemented !";
                }
             }
        classe.prototype[methodName] = abstractMethod(methodName, classe);
    });

    addFunction(classe, 'implement', function(classe, methodName, method) {
        if (classe.prototype[methodName]+"" == abstractMethod(methodName, classe)+"") {
            classe.prototype[methodName] = method;
        } else {
            throw methodName+" on "+classe+" is not an abstract method. This is : "+classe.prototype[methodName];
        }
    });

    addFunction(classe, "extend", function(dest, src) {
        dest.prototype = new src();
    });

    classe.prototype.instanceOf = function(object, constructor) {
       while (object != null) {
          if (object == constructor.prototype) {
             return true;
          }
          object = object.__proto__;
       }
       return false;
    }

    return new classe();
});