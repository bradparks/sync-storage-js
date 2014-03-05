define([], function() {
    var classe = function() {}

    classe.prototype.onCondition = function(testFunction, fonction) {
        if (testFunction()) {
            fonction();
        } else {
            setTimeout(function() {
                classe.prototype.onCondition(testFunction, fonction);
            }, 50);
        }
    }

    classe.prototype.cron = function(duration, fonction) {
        var self = this;
        setTimeout(function() {
            self.cron(duration, fonction);
            fonction();
        }, duration);
    }

    return new classe();
});