(function(root) {

  // pull in underscore if we're running in a worker or in node
  if (root.importScripts)
    importScripts('underscore.js');
  var _ = root._ || require('underscore.js');

  if (root.exports)
    root.exports.createCombos = createCombos;
  else
    root.createCombos = createCombos;

  // Creates all possible site combinations
  // in nested arrays to minimize duplication
  // For instance:
  // [0, 1, 2, [
  //   [3, 4, 5, [
  //      [6, 7, 8, [9]],
  //      [6, 7, 9, [8]],
  //      [6, 8, 9, [7]],
  //      [7, 8, 9, [6]]],
  //   [3, 4, 6, [
  //      [ ...
  var two_team_site, num_teams;
  function createCombos(teams, num_two_team_site) {
    var team_ids = _(_(teams).filter(function(team) { return team.active; })).pluck('nTeam');

    two_team_site = num_two_team_site;
    num_teams = team_ids.length;

    var combos = [];
    addToCombo([], team_ids, combos);
    return combos;
  }

  function addToCombo(aTeamsUsed, aTeamsLeft, combos) {
    // loop through aTeamsLeft until we find one that works
    var nTeams = aTeamsLeft.length;
    for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
      var team = aTeamsLeft[nTeam];
      
      // force ascending order within a triad to eliminate duplicates
      if ((aTeamsUsed.length % 3 == 0) || (team > aTeamsUsed[aTeamsUsed.length - 1]))
      {
        // force ascending order between triads to eliminate duplicate triads
        // CAREFUL: only force ascending order between sites if the last site is full
        // && (aTeamsUsed.length != 9 || team > aTeamsUsed[6])
        if ((aTeamsUsed.length != 3 || team > aTeamsUsed[0]) && (aTeamsUsed.length != 6 || team > aTeamsUsed[3] || two_team_site == 3 || num_teams == 7))
        {
          // clone and push this team on
          var newTeamsUsed = [].concat(aTeamsUsed);
          newTeamsUsed.push(team);
          
          // clone and remove this team
          var newTeamsLeft = [].concat(aTeamsLeft);
          newTeamsLeft.splice(nTeam, 1);
          
          var num_teams_in_site = (newTeamsUsed.length % 3) || 3;
          
          var this_entry;
          if (!newTeamsLeft.length || num_teams_in_site == 3)
            this_entry = newTeamsUsed.slice(-num_teams_in_site);
          
          var nested_site;
          if (this_entry && newTeamsLeft.length) {
            nested_site = [];
            this_entry.push(nested_site);
          }
          
          if (this_entry)
            combos.push(this_entry);
          
          // if there are teams left, keep recursing
          if (newTeamsLeft.length)
            addToCombo(newTeamsUsed, newTeamsLeft, nested_site || combos);
        }
      }
    }
  }
})(this);