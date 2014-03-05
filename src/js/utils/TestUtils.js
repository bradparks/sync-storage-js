define([], function() {
    var classe = function TestUtils() {}

    classe.prototype.assertException = function(fonction) {
        try {
            fonction();
            expect(fonction+"").toBe("throwing exception");
        } catch(e) {
            console.log("exception expected has come : "+e);
        }
    }

    classe.prototype.expectEquals = function(expected, obtained) {
        var result = expected.equals(obtained);
        if (!result) {
            expect(expected).toBe("equals to "+JSON.stringify(obtained));
        }
    }

    classe.prototype.expectNotEquals = function(expected, obtained) {
        var result = expected.equals(obtained);
        if (result) {
            expect(expected).toBe(" not to be equals to "+JSON.stringify(obtained));
        }
    }

    classe.prototype.expectEqualsSet = function(expected, obtained) {
        var result = expected.equalsContains(obtained);
        if (!result) {
            expect(expected).toBe("equals unorderly to "+JSON.stringify(obtained));
        }
    }

    return new classe();
});