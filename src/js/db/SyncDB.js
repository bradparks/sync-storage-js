define([
    "PouchDB",
    "jquery",
    "utils/StringUtils",
    "underscore",
    "q"
],
function (PouchDB, $, StringUtils, _, Q) {
    console.log("loading SyncDB");

    var classe = function (url) {
        this.name = url;
        this.isLocal = !StringUtils.startsWith(url, "http");
    }

    classe.prototype.save = function(object) {
        var resultObject = $.extend({}, object);
        if (!resultObject._id) {
            resultObject._id = new Date().getTime() + "";
        }

        return resultObject;
    }

    return classe;
});