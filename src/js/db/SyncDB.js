define([
    "PouchDB",
    "jquery",
    "utils/StringUtils",
    "underscore",
    "q",
    "db/InMemoryStorage"
],
function (PouchDB, $, StringUtils, _, Q, Storage) {
    console.log("loading SyncDB");

    var classe = function (url) {
        this.name = url;
        this.isLocal = !StringUtils.startsWith(url, "http");
        this.storage = new Storage(url);
    }

    var generateHash = function() {
        var dic = "0987654321azertyuiopqsdfghjklmwxcvbnAZERTYUIOPQSDFGHJKLMWXCVBN";
        var hash = "";
        for (var i=0;i<30;i++) {
            hash += dic.charAt(_.random(0, dic.length-1));
        }
    }

    classe.prototype.save = function(object) {
        var resultObject = $.extend({}, object);
        if (!resultObject._id) {
            resultObject._id = new Date().getTime() + "";
        }
        var version = 1;
        if (resultObject._rev) {
            var rev = resultObject._rev;
            var version = rev.substring(0, rev.indexOf('-'));
            version++;
        }
        resultObject._rev = version+"-"+generateHash();
        this.storage.save(resultObject);
        return resultObject;
    }

    classe.prototype.get = function(query) {
        if (!query._id) {
            throw "get method : _id must be filled";
        }
        return this.storage.get(query);
    }

    return classe;
});