define([
"jquery",
"q",
"utils/Logger"
], function($, Q, Logger) {
    var classe = function(method, url, data) {
        this.method = method;
        this.url = url;
        this.data = data;
        this.retry = 0;
    }

    var logger = new Logger("Request", Logger.INFO);

    classe.prototype.call = function() {
        logger.debug(this.method.toUpperCase() + " " + this.url);
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