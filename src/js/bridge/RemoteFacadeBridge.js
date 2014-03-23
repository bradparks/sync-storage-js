define([
"utils/Logger",
"db/FacadeStorage",
"bridge/CouchDBBridge"
], function(Logger, FacadeStorage, CouchDBBridge) {
    var classe = function(config) {
        this.config = config;
        this.impls = [CouchDBBridge];
    }
    var realConstructor = classe;

    var logger = new Logger("RemoteFacadeBridge");

    classe.prototype = new FacadeStorage();

    classe.prototype.constructor = realConstructor;

    return classe;
});