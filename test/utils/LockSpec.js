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
            Lock.locks = {};
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
            var size = 6;
            var lock = Lock.get("test", size);
            var lock2 = Lock.get("test");
            expect(lock).toBe(lock2);
            expect(lock.resources).toBe(size);
            expect(lock2.resources).toBe(size);

            size = 1;
            lock = Lock.get("test2");
            lock2 = Lock.get("test2");
            expect(lock).toBe(lock2);
            expect(lock.resources).toBe(size);
            expect(lock2.resources).toBe(size);
        });

        it('can be retrieved via static method or simple constructor', function () {
            var lock = new Lock();
            var lock2 = Lock.get("test");
            expect(lock).toEqual(lock2);
        });
    });
});