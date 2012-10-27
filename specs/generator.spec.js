var generator = require('../generator_worker.js');
var ComboCollection = require('../combo_collection.js');
var Team = require('../team.js');
var _ = require('underscore.js');

describe('round-robin generator', function() {
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

  function genSets(num_sets, num_teams) {
    var teams = createTeams(num_teams);
    var combos = ComboCollection.createCombos(teams);
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
});