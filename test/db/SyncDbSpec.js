define([
    "db/SyncDB",
    "jquery"
],
    function (SyncDB, $) {
    describe('SyncDB', function () {
        var db;
        var object;

        beforeEach(function () {
            db = new SyncDB("local");
            object = {value:"test"};
        });

        it('stores an object and return an object with _id and _rev fields', function () {
            object = db.save(object);
            expect(object._id).not.toBe(undefined);
            expect(object._rev).not.toBe(undefined);
            expect(object._rev).not.toBe(undefined);
            expect(object._rev).toMatch(/[0-9]+-[0-9a-zA-Z]+/);
            expect(object.value).toBe("test");
        });

        it('finds an object from its _id or its _id and _rev', function () {
            object = db.save(object);
            expect(db.get(object)).toEqual(object);
            expect(db.get({_id:object._id})).toEqual(object);
            expect(db.get({_id:object._id, _rev:object._rev})).toEqual(object);
        });

        it('finds an object from its _id or its _id and _rev (2 versions)', function () {
            object = db.save(object);
            var object2 = $.extend({}, object);
            object2.value = "test2";
            object2 = db.save(object2);
            expect(object).not.toEqual(object2);
            expect(db.get(object2)).toEqual(object2);
            expect(db.get({_id:object._id})).toEqual(object2);
            expect(db.get({_id:object._id, _rev:object._rev})).toEqual(object);
            expect(db.get({_id:object._id, _rev:object2._rev})).toEqual(object2);
        });
    })
});