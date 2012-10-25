var generator = require('../generator_worker.js');
var combo_generator = require('../combo_generator.js');
var _ = require('underscore.js');

var num_teams = 7;
var combos = combo_generator.createAllCombos(_.range(0, num_teams + 1))

describe('round-robin generator', function() {
  it('should pass', function() {
  	expect(generator.genRound).toBeTruthy();
  	expect(combos.length).toEqual(56);
  });
});