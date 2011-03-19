$(function() {
  window.Meet = Backbone.Model.extend({
    initialize: function() {
      
    },
    clear: function() {
      this.destroy();
      this.view.remove();
    }
  });
  
  window.MeetList = Backbone.Collection.extend({
    model: Meet,
    localStorage: new Store('todos')
  });
  window.Meets = new MeetList;
});