define([
    "utils/SimpleAjax"
], function(SimpleAjax) {
    var classe = function(remoteTimestamp) {
        this.remoteTimestamp = remoteTimestamp;
        this.timestamp = new Date().getTime();
        this.diff = remoteTimestamp - this.timestamp;
    }

    classe.prototype.getDate = function() {
        var timestamp = new Date().getTime() + this.diff;
        var date = new Date();
        date.setTime(timestamp);
        return date;
    }

    classe.fromUrl = function() {
        return new SimpleAjax("GET", window.location).call().then(function(result) {
            var stringDate = result.req.getResponseHeader("Date");
            var date = new Date(Date.parse(stringDate));
            return new classe(date.getTime());
        });
    }

    return classe;
});