var generator = require('../generator_worker.js');
var ComboCollection = require('../combo_collection.js');
var Team = require('../team.js');
var _ = require('underscore.js');

describe('round-robin generator', function() {
  var teams, cached_combos = {};
  it('should return a nested array with all teams', function() {
    var set = genSets(1, 7)[0];
    expect(set.length).toEqual(3);
    expect(_.flatten(set).length).toEqual(7);
  });
  it('should not repeat identical sets on the first run', function() {
    expect(genSets(1, 7)).not.toEqual(genSets(1, 7));
  });
  it('should not create identical sets after multiple runs', function() {
    expect(genSets(3, 7)).not.toEqual(genSets(3, 7));
    expect(genSets(6, 7)).not.toEqual(genSets(6, 7));
  });
  it('should have every team play each-other at least once with 6 rounds and 7 teams', function() {
    genSets(6, 7);
    expect(_(getCompetitionMatrix()).flatten()).not.toContain(0);
  })

  function getCompetitionMatrix() {
    var competition_matrix = _(teams).pluck('timesPlayedTeam');
    nullOutTimesTeamPlayedItself(competition_matrix);
    return competition_matrix;
  }
  function nullOutTimesTeamPlayedItself(comp_matrix) {
    comp_matrix.forEach(function(timesPlayedTeam, team_ix) {
      timesPlayedTeam[team_ix] = null;
    });
  }
  function genSets(num_sets, num_teams) {
    teams = createTeams(num_teams);
    var combos = createCombos(teams);
    return _.range(num_sets).map(function() {
      return genSet(teams, combos);
    });
  }
  function genSet(teams, combos) {
    var set;
    generator.genRound({'teams': teams, 'combos': combos}, function(result) {
      set = result.best_set;
      _(teams).invoke('applySet', set);
    });
    return set;
  }
  function createTeams(num_teams) {
    var team_names = _.range(1, num_teams + 1).map(function(team_num) {
      return 'Team ' + team_num;
    });
    return Team.createFromNames(team_names);
  }
  function createCombos(teams) {
    var num_teams = teams.length; // sufficient until we start dealing w/ inactive teams
    if (!cached_combos[num_teams])
      cached_combos[num_teams] = ComboCollection.createCombos(teams);
    return cached_combos[num_teams];
  }
});