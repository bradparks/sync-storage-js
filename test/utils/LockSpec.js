define([
    "utils/Lock",
    "q",
    "utils/Logger"
],
function (Lock, Q, Logger) {
    describe('Lock', function () {
        var logger = new Logger("LockSpec");
        var testOk;
        var log = function(object) {
            logger.info(JSON.stringify(object));
        }
        var asyncTest = function() {
            return testOk;
        }

        beforeEach(function () {
            logger.info("start test");
            testOk = false;
        });

        it('init with number of resources', function () {
            var lock = new Lock();
            expect(lock.resources).toBe(1);
            lock = new Lock(6);
            expect(lock.resources).toBe(6);
        });

        it('authorize only one function at a time', function () {
            var lock = new Lock();
            var value = 0;
            var promise1 = lock.synchronize().then(function() {
                value++;
            }).then(function() {
                expect(value).toBe(1);
            }).then(function() {
                value--;
            }).then(function() {
                expect(value).toBe(0);
            }).then(function() {
                return lock.release();
            });

            var promise2 = lock.synchronize().then(function() {
                value++;
            }).then(function() {
                expect(value).toBe(1);
            }).then(function() {
                value--;
            }).then(function() {
                expect(value).toBe(0);
            }).then(function() {
                return lock.release();
            });

            Q.all([promise1, promise2]).then(function() {
                testOk = true;
            });
            waitsFor(asyncTest);
        });

        it('can be retrieved via static method', function () {
            var lock = Lock.get("test", 6);
            var lock2 = Lock.get("test");
            expect(lock).toBe(lock2);
            expect(lock.resources).toBe(6);
            expect(lock2.resources).toBe(6);
        });
    });
});