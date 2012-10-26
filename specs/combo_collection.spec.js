var generator = require('../generator_worker.js');
var ComboCollection = require('../combo_collection.js');
var Team = require('../team.js');
var _ = require('underscore.js');

describe('round-robin generator', function() {
  var teams = createTeams(7);
  var combos = ComboCollection.createCombos(teams);
  
   it('should not repeat identical results', function() {
     expect(combos.length).toEqual(35);
   });
});

function createTeams(num_teams) {
  var num_teams = 7;
  var team_names = _.range(1, num_teams + 1).map(function(team_num) {
    return 'Team ' + team_num;
  });
  return Team.createFromNames(team_names);
}