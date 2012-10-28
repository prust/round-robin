var generator = require('../generator_worker.js');
var ComboCollection = require('../combo_collection.js');
var Team = require('../team.js');
var _ = require('underscore.js');

describe('round-robin generator', function() {
  it('should generate the correct number of sets for each number of teams', function() {
    expect(getNumSets(4)).toEqual(4);
    expect(getNumSets(5)).toEqual(10);
    expect(getNumSets(6)).toEqual(10);
    expect(getNumSets(7)).toEqual(70);
    expect(getNumSets(8)).toEqual(280); // 2.2 sec
    // expect(getNumSets(9)).toEqual(280); // 17 sec
  });
});

function getNumSets(num_teams) {
  var teams = createTeams(num_teams);
  return ComboCollection.createSets(teams).length;
}
function createTeams(num_teams) {
  var team_names = _.range(1, num_teams + 1).map(function(team_num) {
    return 'Team ' + team_num;
  });
  return Team.createFromNames(team_names);
}