$(function() {
  window.AppView = Backbone.View.extend({
    el: $('#round-robin-app'),
    events: {
      'click #create_meet': 'createMeet'
    },
    initialize: function() {
      _.bindAll(this, 'addOne');
      Meets.bind('add', this.addOne);
      Meets.fetch();
    },
    render: function() {
      
    },
    createMeet: function() {
      // do necessary setup first
      if (!g_aTeams) {
        var team_names = _(this.$('#teams').val().split(",")).map($.trim);
        GlobalSetup(team_names);
      }
      
      var new_attributes = {};
      Meets.create(new_attributes);
    },
    addOne: function(meet) {
      var view = new MeetView({model: meet});
      this.$('#meets').append(view.render().el);
    }
  });
  window.App = new AppView;
});