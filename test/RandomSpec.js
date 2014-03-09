define([
    "Random"
],
function (Random) {
    describe('Random', function () {
        var random = new Random();
        var loops = 50;
        beforeEach(function () {
        });

        it('returns a random alpha', function () {
            expect(random.alphaDic.length).toBe(26 * 2 + 10);
            for (var i=0;i<loops;i++) {
                expect(random.nextAlpha()).toMatch(new RegExp("["+random.alphaDic+"]"));
            }
        });

        it('return a number between 0 inclusive and 1 exclusive', function () {
            for (var i=0;i<loops;i++) {
                expect(random.nextNumber() < 1).toBe(true);
                expect(random.nextNumber() >= 0).toBe(true);
            }
        });
    })
});