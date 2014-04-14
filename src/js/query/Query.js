define([
], function() {
   var classe = function(projection, filters, sorts) {
        this.filters = filters ? filters : [];
        this.sorts = sorts ? sorts : [];
   }

   return classe;
});