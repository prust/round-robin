(function(root) {

  if (root.importScripts)
    importScripts('underscore.js');
  var _ = root._ || require('underscore.js');

  if (typeof require != 'undefined')
    module.exports = Team;
  else
    root.Team = Team;

  function Team(name, ix, num_teams) {
    this.team = name;
    this.nTeam = ix;
    this.timesPlayedTeam = _.range(num_teams).map(function() { return 0; });
    this.nByes = 0;
    this.nTwoTeamSite = 0;
    this.active = true;
  }

  Team.createFromNames = function createFromNames(team_names) {
    var num_teams = team_names.length;
    return team_names.map(function(name, ix) {
      return new Team(name, ix, num_teams);
    });
  };

  Team.deserialize = function deserialize(obj) {
    if (_.isString(obj))
      obj = JSON.parse(obj);
    return _.extend(new Team(), obj);
  };

  Team.prototype.toJSON = function toJSON() {
    return {
      'team': this.team,
      'nTeam': this.nTeam,
      'timesPlayedTeam': this.timesPlayedTeam,
      'nByes': this.nByes,
      'nTwoTeamSite': this.nTwoTeamSite,
      'active': this.active
    };
  };

  Team.prototype.applySet = function applySet(set, unapply) {
    var num_combos = set.length;
    for (var combo_num = 0; combo_num < num_combos; ++combo_num) {
      var combo = set[combo_num];
      this.applyCombo(combo, unapply);
    }
  };

  Team.prototype.applyCombo = function applyCombo(combo, unapply) {
    if (combo[0] != this.nTeam && combo[1] != this.nTeam && combo[2] != this.nTeam)
      return;

    var incr_or_decr = unapply ? -1 : 1;
    
    if (combo.length == 1)
      this.nByes = this.nByes + incr_or_decr;
    if (combo.length == 2)
      this.nTwoTeamSite = this.nTwoTeamSite + incr_or_decr;

    var num_positions = combo.length;
    for (var position_num = 0; position_num < num_positions; ++position_num) {
      var team_ix = combo[position_num];
      if (team_ix != this.nTeam)
        this.timesPlayedTeam[team_ix] = this.timesPlayedTeam[team_ix] + incr_or_decr;
    }
  };

  Team.prototype.clone = function clone() {
    return Team.deserialize(JSON.stringify(this));
  };

})(this);