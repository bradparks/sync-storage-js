define([], function() {
    var classe = function() {}

    classe.prototype.startsWith = function(chaine, start) {
        return chaine.substring(0, start.length) == start;
    }

    return new classe();
});