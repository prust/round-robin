var generator = require('../generator_worker.js');
var ComboCollection = require('../combo_collection.js');
var Team = require('../team.js');
var _ = require('underscore.js');

describe('round-robin generator', function() {
  var teams, combos, num_teams = 7;
  beforeEach(function() {
    resetTeams();
    combos = ComboCollection.createCombos(teams);
  });
  
  it('should return a nested array with all teams', function() {
    var set = genSet();
    expect(set.length).toEqual(3);
    expect(_.flatten(set).length).toEqual(7);
  });
  it('should not repeat identical sets on the first run', function() {
    var first_set = genSet();
    resetTeams();
    var second_set = genSet();
    expect(first_set).not.toEqual(second_set);
  });
  it('should not create identical sets after multiple runs', function() {
    genSet();
    genSet();
    var third_run_1 = genSet();

    resetTeams();
    genSet();
    genSet();
    var third_run_2 = genSet();
    expect(third_run_1).not.toEqual(third_run_2);
  });
  function resetTeams() {
    teams = createTeams(num_teams);
  }
  function genSet() {
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