define([
    "utils/Request"
],
function (Request) {
    describe('Request', function () {
        var testOk;
        var log = function(object) {
            console.log(JSON.stringify(object));
        }
        var asyncTest = function() {
            return testOk;
        }

        beforeEach(function () {
            testOk = false;
        });

        it('call an ajax request', function () {
            new Request("get", "http://localhost:5984").call().then(function(result) {
                expect(result.statusCode).toBe(200);
                testOk = true;
            }).fail(log);
            waitsFor(asyncTest);
        });
    });
});