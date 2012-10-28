(function(root) {

  // pull in underscore if we're running in a worker or in node
  if (root.importScripts)
    importScripts('underscore.js');
  var _ = root._ || require('underscore.js');

  if (root.exports)
    root.exports.createSets = createSets;
  else
    root.createSets = createSets;

  function createSets(teams) {
    var all_sets = [];
    var team_ids = getActiveTeamIDs(teams);
    generateSets(team_ids, [], all_sets);
    return all_sets;
  }

  function generateSets(team_ids, set, all_sets) {
    team_ids.forEach(function(team_id) {
      var new_set = set.slice();
      new_set.push(team_id);

      if (team_ids.length > 1) {
        var other_team_ids = _(team_ids).without(team_id);
        generateSets(other_team_ids, new_set, all_sets);
      }
      else {
        addSetIfSorted(new_set, all_sets);
      }
    });
  }

  function addSetIfSorted(new_set, all_sets) {
    new_set = breakInto3TeamCombos(new_set);
    if (areCombosSorted(new_set))
      all_sets.push(new_set);
  }

  function getSortedIx(set, all_sets) {
    return _.sortedIndex(all_sets, set, function(set) {
      return _(set).flatten().join(',');
    });
  }

  function breakInto3TeamCombos(set) {
    var num_combos = Math.ceil(set.length / 3);
    var new_set = [];
    for (var combo_num = 0; combo_num < num_combos; ++combo_num) {
      var start_ix = combo_num * 3;
      new_set.push(set.slice(start_ix, start_ix + 3));
    }
    return new_set;
  }

  function areCombosSorted(set) {
    var num_combos = set.length;
    for (var combo_num = 0; combo_num < num_combos; ++combo_num) {
      var combo = set[combo_num];
      if (combo[1] != null) {
        if (combo[0] > combo[1])
          return false;
        if (combo[2] != null && combo[1] > combo[2])
          return false;
      }
      var prev_combo = set[combo_num - 1];
      if (prev_combo && combo.length == 3)
        if (combo[0] > prev_combo[0])
          return false;
    }

    return true;
  }

  function getActiveTeamIDs(teams) {
    var active_teams = _(teams).filter(function(team) { 
      return team.active;
    });
    return _(active_teams).pluck('nTeam');
  }
})(this);