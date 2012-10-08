$(function() {
  window.AppView = Backbone.View.extend({
    el: $('#round-robin-app'),
    events: {
      'click #create_meet': 'createMeet',
      'click #clear_data': 'clearData'
    },
    'initialize': function initialize() {
      _.bindAll(this, 'addOne', 'addLots');

      var team_names = _(this.$('#teams').val().split(",")).map($.trim);
      GlobalSetup(team_names);

      Meets.bind('add', this.addOne);
      Meets.bind('refresh', this.addLots);
      Meets.fetch();
    },
    'render': function render() {
      
    },
    'createMeet': function createMeet() {      
      var new_attributes = {'id': guid()};
      Meets.create(new_attributes);
    },
    'addOne': function addOne(meet) {
      var view = new MeetView({model: meet});
      this.$('#meets').append(view.render().el);
    },
    'addLots': function addLots() {
      Meets.each(_.bind(this.addOne));
    },
    'clearData': function clearData() {
      localStorage.clear();
    }
  });
  window.App = new AppView;
});