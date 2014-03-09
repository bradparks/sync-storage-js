define([
], function() {

    var classe = function() {
    }

    // min inclusive, max exclusive
    classe.prototype.nextNumber = function(min, max) {
        if (!min) {
            min = 0;
        }
        if (!max) {
            max = 1;
        }
        if (min > max) {
            throw "min > max !";
        }
        return Math.random() * (max - min) + min;
    }

    // min and max inclusive
    classe.prototype.nextInt = function(min, max) {
        return Math.floor(this.nextNumber(min, max + 1));
    }

    classe.prototype.alphaDic = "0987654321POIUYTREZAMLKJHGFDSQNBVCXWpoiuytrezamlkjhgfdsqnbvcxw";

    classe.prototype.nextAlpha = function() {
        return this.alphaDic.charAt(this.nextInt(0, this.alphaDic.length-1));
    }

    return classe;
})