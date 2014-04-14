define([
    "query/Filter",
    "utils/Logger"
],
function (Filter, Logger) {
    describe('Filter', function () {
        var logger = new Logger("FilterSpec");
        var filter;

        beforeEach(function () {
            logger.info("start test");

        });

        it('low bound filter exclusive', function () {
            filter = new Filter("key", 10, null, false, false);
            expect(filter.toFunction()({key:9})).toBe(false);
            expect(filter.toFunction()({key:10})).toBe(false);
            expect(filter.toFunction()({key:11})).toBe(true);
        });

        it('low bound filter exclusive', function () {
            filter = new Filter("key", 10, null, true, false);
            expect(filter.toFunction()({key:9})).toBe(false);
            expect(filter.toFunction()({key:10})).toBe(true);
            expect(filter.toFunction()({key:11})).toBe(true);
        });

        it('high bound filter exclusive', function () {
            filter = new Filter("key", null, 10, false, false);
            expect(filter.toFunction()({key:9})).toBe(true);
            expect(filter.toFunction()({key:10})).toBe(false);
            expect(filter.toFunction()({key:11})).toBe(false);
        });

        it('high bound filter inclusive', function () {
            filter = new Filter("key", null, 10, false, true);
            expect(filter.toFunction()({key:-1})).toBe(true);
            expect(filter.toFunction()({key:0})).toBe(true);
            expect(filter.toFunction()({key:9})).toBe(true);
            expect(filter.toFunction()({key:10})).toBe(true);
            expect(filter.toFunction()({key:11})).toBe(false);
        });

        it('low high bound filter exclusive', function () {
            filter = new Filter("key", 8, 10, false, false);
            expect(filter.toFunction()({key:7})).toBe(false);
            expect(filter.toFunction()({key:8})).toBe(false);
            expect(filter.toFunction()({key:9})).toBe(true);
            expect(filter.toFunction()({key:10})).toBe(false);
            expect(filter.toFunction()({key:11})).toBe(false);
        });

        it('low high bound filter inclusive', function () {
            filter = new Filter("key", 8, 10, true, true);
            expect(filter.toFunction()({key:7})).toBe(false);
            expect(filter.toFunction()({key:8})).toBe(true);
            expect(filter.toFunction()({key:9})).toBe(true);
            expect(filter.toFunction()({key:10})).toBe(true);
            expect(filter.toFunction()({key:11})).toBe(false);
        });
    });
});