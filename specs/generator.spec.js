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

  it('should be non-deterministic (should not create identical sets after 3 runs)', function() {
    expect(genSets(3, 7)).not.toEqual(genSets(3, 7));
    //expect(genSets(3, 8)).not.toEqual(genSets(3, 8));
    expect(genSets(3, 9)).not.toEqual(genSets(3, 9));
  });

  it('should not repeat identical sets, even with twenty runs', function() {
    var sets = genSets(20, 7);
    expect(sets.length).toEqual(20);
    sets.forEach(function(set) {
      var other_sets = _(sets).without(set);
      other_sets.forEach(function(other_set) {
        expect(other_set).not.toEqual(set);
      });
    });
  });

  // this fails occasionally... and shouldn't
  // with 6 rounds and 7 teams, most teams play each-other twice
  it('should have every team play each-other at least once with 6 rounds and 7 teams', function() {
    genSets(6, 7);
    expect(_(getCompetitionMatrix()).flatten()).not.toContain(0);
  });

  it('should have every team play every other team once with 4 rounds and 9 teams', function() {
    genSets(4, 9);
    expect(getUniqNumTimesPlayed()).toEqual([1]);
  });

  // this has failed on the rare occasion
  it('should have every team play every other team twice with 8 rounds and 9 teams', function() {
    genSets(8, 9);
    expect(getUniqNumTimesPlayed()).toEqual([2]);
  });

  function getUniqNumTimesPlayed() {
    var comp_matrix = getCompetitionMatrix();
    return _(comp_matrix).chain().flatten().compact().uniq().value();
  }
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
    var sets = [];
    _.range(num_sets).forEach(function() {
      sets.push(genSet(teams, combos, sets));
    });
    return sets;
  }
  function genSet(teams, combos, prev_sets) {
    var set;
    generator.genRound({'teams': teams, 'combos': combos, 'prev_sets': prev_sets}, function(result) {
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