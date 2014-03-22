define([
], function() {
    var classe = function(name, level) {
        this.name = name;
        if (level !== undefined) {
            this.level = level;
        }
    }

    var formatInt = function(integer, size) {
        var result = integer + "";
        while (result.length < size) {
            result = "0" + result;
        }
        return result;
    }

    var getLevel = function(self) {
        if (self.level !== undefined) {
            return self.level;
        } else {
            return self.root.level;
        }
    }

    var log = function(self, level, message) {
        if (level.priority >= getLevel(self).priority) {
            var date = new Date();
            var header = formatInt(date.getHours())+":"+formatInt(date.getMinutes())+":"+formatInt(date.getSeconds());
            header += ", " + self.name + ", " + level.name + " : ";
            if (typeof message == "object") {
                message = JSON.stringify(message);
            }
            console.log(header + message);
        }
    }

    var levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    for (var i=0;i<levels.length;i++) {
        var levelName = levels[i];
        var level = {
            priority : i,
            name:levelName
        };
        classe.prototype[levelName] = level;
        classe[levelName] = level;

        classe.prototype[levelName.toLowerCase()] = function(level) {
            return function(message) {
                log(this, level, message);
            }
        }(level);
    }

    classe.prototype.debug = function(message) {
        log(this, classe.DEBUG, message);
    }

    classe.prototype.debug = function(message) {
        log(this, classe.DEBUG, message);
    }

    classe.prototype.debug = function(message) {
        log(this, classe.DEBUG, message);
    }

    classe.prototype.debug = function(message) {
        log(this, classe.DEBUG, message);
    }

    classe.prototype.root = new classe("ROOT", classe.INFO);

    return classe;
});