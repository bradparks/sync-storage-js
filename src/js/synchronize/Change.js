// contains a synchronize change
define(["utils/ObjectUtils", "utils/Utils"], function(ObjectUtils, Utils) {

    var classe = function Change(key, oldValue, newValue, type) {
        this.key = key;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.type = type;
    }

    classe.CREATE = "CREATE";
    classe.UPDATE = "UPDATE";
    classe.DELETE = "DELETE";

    classe.prototype.apply = function(object) {
        var type = this.type;
        if (type == classe.UPDATE) {
            if (Utils.equalsGeneric(object[this.key], this.oldValue)) {
                object[this.key] = this.newValue;
            } else {
                throw "Impossible to apply "+JSON.stringify(this)+" on "+JSON.stringify(object)+". "
                +"oldValue is "+JSON.stringify(object[this.key])+" and should be "+JSON.stringify(this.oldValue);
            }
        } else if (type == classe.CREATE) {
            if (object[this.key] !== undefined) {
                throw "Impossible to apply "+JSON.stringify(this)+" on "+JSON.stringify(object)+". "
                +"key "+this.key+" already exists with value "+JSON.stringify(object[this.key]);
            }
            object[this.key] = this.newValue;
        } else if (type == classe.DELETE) {
            if (object[this.key] === undefined) {
                throw "Impossible to apply "+JSON.stringify(this)+" on "+JSON.stringify(object)+". "
                    +"key "+this.key+" has no value : "+object[this.key];
            }
            delete object[this.key];
        } else {
            throw "unknown type of change : "+type;
        }
        return object;
    }

    classe.prototype.revert = function(object) {
        var type = this.type;
        if (type == classe.UPDATE || type == classe.DELETE) {
            object[this.key] = this.oldValue;
        } else if (type == classe.CREATE) {
            delete object[this.key];
        } else {
            throw "unknown type of change : "+type;
        }
        return object;
    }


    classe.prototype.applyToArray = function(object) {
        var type = this.type;
        if (type == classe.CREATE) {
            object.push(this.newValue);
        } else if (type == classe.DELETE) {
            object.removeByValue(this.oldValue);
        } else {
            throw "unknown type of change : "+type;
        }
        return object;
    }

    classe.prototype.revertFromArray = function(object) {
        var type = this.type;
        if (type == classe.CREATE) {
            object.removeByValue(this.newValue);
        } else if (type == classe.DELETE) {
            object.push(this.oldValue);
        } else {
            throw "unknown type of change : "+type;
        }
        return object;
    }

    return classe;
});