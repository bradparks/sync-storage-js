define([
"jquery",
"q",
"utils/Logger",
"underscore"
], function($, Q, Logger, _) {
    var classe = function(method, url, data) {
        this.method = method;
        this.url = url;
        this.data = data;
        this.retry = 0;
    }

    var logger = new Logger("Request", Logger.INFO);

    classe.prototype.call = function() {
        var self = this;
        var defer = Q.defer();
        var req = {
            type:self.method.toUpperCase(),
            url:self.url,
            data:self.data
        };
        if (!req.data) {
            delete req.data;
        } else {
            logger.debug(req.data);
        }
        if (req.type == "GET") {
            req.url += "?";
            _.each(req.data, function(value, key) {
                if (typeof value == "string") {
                    value = '"'+value+'"';
                }
                req.url += key + "=" + value + "&";
            });
            req.url = req.url.substring(0, req.url.length-1);
            delete req.data;
        }
        logger.debug(req.type + " " + req.url);
        $.ajax(req).done(function(result, status, xhr) {
            defer.resolve({
                data:result,
                status:status,
                statusCode:xhr.status
            });
        }).fail(function(xhr, status, error) {
            var result = {
                status:status,
                statusCode:xhr.status,
                xhr:xhr,
                error:error
            }
            if (result.statusCode == 404) {
                defer.reject(result);
            } else {
                if (!result.statusCode && self.retry < 5) {
                    self.retry++;
                    logger.info("retry "+self.retry);
                    return self.call().then(function(result) {
                        defer.resolve(result);
                    }).fail(function(result) {
                        defer.reject(result);
                    });
                } else {
                    logger.debug("a request failed : ");
                    logger.debug(result);
                    logger.debug(req);
                    if (req.data) {
                        logger.debug("data length : "+JSON.stringify(req.data).length);
                    }
                    defer.reject(result);
                }
            }
        });
        return defer.promise;
    }

    return classe;
});