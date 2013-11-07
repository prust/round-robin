$(function() {
  window.AppView = Backbone.View.extend({
    el: $('#round-robin-app'),
    events: {
      'click #create_meet': 'createMeet',
      'click #clear_data': 'clearData',
      'click #updateTeams': 'updateTeams'
    },
    'initialize': function initialize() {
      _.bindAll(this, 'addOne', 'addLots');

      var team_names = JSON.parse(localStorage.getItem('team_names')) || ['Sword Savers', 'The Odds', 'Wooturtles', 'Slo-Mo', 'UM', '7 Dwarves', 'Risers', 'Outnumbered', 'Peloponnesians', 'FBIQ'];
      this.$('#teams').val(team_names.join(', '));
      
      if (!window.Worker)
        alert('This page will not work in your web browser because it does not support Web Workers. Try Firefox 3.5+ or Chrome.');
      
      window.g_aTeams = Team.createFromNames(team_names);
      window.g_all_sets = createSets(g_aTeams);

      Meets.bind('add', this.addOne);
      Meets.bind('refresh', this.addLots);
      Meets.fetch();
    },
    'updateTeams': function updateTeams() {
      $('#updateTeams').attr('disabled', 'disabled');
      var team_names = _(this.$('#teams').val().split(",")).map($.trim);
      localStorage.setItem('team_names', JSON.stringify(team_names));
      location.reload();
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
      if (!confirm('Are you sure you want to delete all the meets and rounds?'))
        return;

      localStorage.removeItem('meets');
      localStorage.removeItem('rounds');
      location.reload();
    }
  });
});
