define([
    "db/SyncDB"
],
    function (SyncDB) {
    describe('SyncDB', function () {
        beforeEach(function () {
        });

        it('stores and retrieve an object', function () {
            var db = new SyncDB("local");

            var object = {value:"test"};
            object = db.save(object);
            expect(object._id).not.toBe(undefined);
            expect(object._rev).not.toBe(undefined);
            expect(object._rev).toMatch(/[0-9]+-[0-9a-zA-Z]+/);
        });

    })
});