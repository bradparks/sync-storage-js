define([
], function() {
   var classe = function(keyName, descendant) {
        this.keyName = keyName;
        this.descendant = descendant ? true : false;
   }

   return classe;
});