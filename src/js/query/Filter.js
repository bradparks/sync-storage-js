define([
], function() {
   var classe = function(keyName, lowBound, highBound, lowInclusive, highInclusive) {
        this.keyName = keyName;
        this.lowBound = lowBound;
        this.highBound = highBound;
        this.lowInclusive = lowInclusive ? true : false;
        this.highInclusive = highInclusive ? true : false;
   }

   var isDefined = function(value) {
        return value !== null && value !== undefined;
   }

   var getCompFunction = function(ref, inclusive, low) {
        if (!isDefined(ref)) {
            return function(value) {
                return true;
            }
        } else {
            if (low && inclusive) {
                return function(value) {
                    return ref <= value;
                }
            } else if (low && !inclusive) {
                return function(value) {
                    return ref < value;
                }
            } else if (!low && inclusive) {
                return function(value) {
                    return value <= ref;
                }
            } else {
                return function(value) {
                    return value < ref;
                }
            }
        }
   }

   classe.prototype.toFunction = function() {
        var self = this;
        var fonctionLow = getCompFunction(self.lowBound, self.lowInclusive, true);
        var fonctionHigh = getCompFunction(self.highBound, self.highInclusive, false);
        return function(doc) {
            var value = doc[self.keyName];
            return fonctionLow(value) && fonctionHigh(value);
        }
   }

   classe.prototype.toStringFunction = function() {
        var self = this;
        var fonctionLow = getCompFunction(self.lowBound, self.lowInclusive, true);
        var fonctionHigh = getCompFunction(self.highBound, self.highInclusive, false);
        return (fonction + "").replace("fonctionLow")
   }

   return classe;
});