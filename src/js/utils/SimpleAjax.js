define([
    "q"
], function (Q) {

    var classe = function (method, url, data) {
        this.method = method.toUpperCase();
        this.url = url;
        if (!this.url) {
            throw "url should be defined";
        }
        this.data = data;
    };

    function getXMLHttpRequest() {
        var xhr = null;
        if (window.XMLHttpRequest || window.ActiveXObject) {
            if (window.ActiveXObject) {
                try {
                    xhr = new ActiveXObject("Msxml2.XMLHTTP");
                } catch (e) {
                    xhr = new ActiveXObject("Microsoft.XMLHTTP");
                }
            } else {
                xhr = new XMLHttpRequest();
            }
        } else {
            alert("Votre navigateur ne supporte pas l'objet XMLHTTPRequest...");
            return null;
        }

        return xhr;
    }

    classe.prototype.call = function () {
        var defer = new Q.defer();
        var self = this;
        var req = getXMLHttpRequest();
        req.onreadystatechange = function () {
            if (req.readyState == 4) {
                if (req.status < 400) {
                    defer.resolve({
                        data: req.responseText,
                        statusCode: req.status,
                        req:req
                    });
                } else {
                    defer.reject({
                        statusCode: req.status,
                        error: req.responseText,
                        req:req
                    });
                }

            }
        };
        req.open(self.method, self.url, true);
        if (self.data !== undefined) {
            req.send(self.data);
        } else {
            req.send();
        }
        return defer.promise;
    };

    return classe;
});