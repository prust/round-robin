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
        addSetIfNotThere(new_set, all_sets);
      }
    });
  }

  function addSetIfNotThere(new_set, all_sets) {
    new_set = breakInto3TeamCombos(new_set);
    new_set = sortCombos(new_set);
    var sorted_ix = getSortedIx(new_set, all_sets);

    if (!_(all_sets[sorted_ix]).isEqual(new_set))
      all_sets.splice(sorted_ix, 0, new_set);
  }

  function getSortedIx(set, all_sets) {
    return _.sortedIndex(all_sets, set, function(set) {
      return _(set).flatten().join(',');
    });
  }

  function breakInto3TeamCombos(set) {
    var num_combos = Math.ceil(set.length / 3);
    return _.range(num_combos).map(function(combo_num) {
      var start_ix = combo_num * 3;
      var combo = set.slice(start_ix, start_ix + 3);
      combo.sort();
      return combo;
    });
  }

  function sortCombos(set) {
    var small_combo = _(set).find(function(combo) {
      return combo.length < 3;
    });
    
    if (small_combo)
      set = _(set).without(small_combo);
    
    set = _(set).sortBy(0);
    
    if (small_combo)
      set.push(small_combo);

    return set;
  }

  function getActiveTeamIDs(teams) {
    var active_teams = _(teams).filter(function(team) { 
      return team.active;
    });
    return _(active_teams).pluck('nTeam');
  }
})(this);