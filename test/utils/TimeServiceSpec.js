define([
    "utils/TimeService",
    "utils/Logger"
],
function (TimeService, Logger) {
    describe('TimeService', function () {
        var logger = new Logger("TimeServiceSpec");
        var log = function(object) {
            logger.info(JSON.stringify(object));
        }
        var initStamp = new Date().getTime();

        var testOk;
        var asyncTest = function() {
            return testOk;
        }

        beforeEach(function () {
            logger.info("start test");
            testOk = false;
        });

        it('give a new date', function () {
            var timeService2 = new TimeService(initStamp);
            setTimeout(function() {
                var timeService = new TimeService(initStamp);
                var date = timeService.getDate();
                var date2 = timeService2.getDate();
                expect(date.getTime()).toEqual(initStamp);
                expect(date2.getTime() - initStamp - 100 <= 5).toEqual(true);
                testOk = true;
            }, 100);
            waitsFor(asyncTest);
        });

        it('build from url', function () {
            TimeService.fromUrl().then(function() {
                testOk = true;
            });
            waitsFor(asyncTest);
        });
    });
});