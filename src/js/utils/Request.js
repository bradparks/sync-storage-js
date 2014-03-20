define([
"jquery",
"q"
], function($, Q) {
    var classe = function(method, url, data) {
        this.method = method;
        this.url = url;
        this.data = data;
    }

    classe.prototype.call = function() {
        console.log("calling "+this.url);
        var self = this;
        var defer = Q.defer();
        var req = {
            type:self.method.toUpperCase(),
            url:self.url,
            data:self.data
        };
        if (!req.data) {
            delete req.data;
        }
        $.ajax(req).done(function(result, status, xhr) {
            defer.resolve({
                data:result,
                status:status,
                statusCode:xhr.status
            });
        }).fail(function(xhr, status) {
            var result = {
                status:status,
                statusCode:xhr.status
            }
            if (result.statusCode == 404) {
                defer.resolve(result);
            } else {
                defer.reject(result);
            }
        });
        return defer.promise;
    }

    return classe;
});