/*
2011 Regionals Round Robin

[[0,2,8],[1,4,6],[3,5,7],[9]]
[[0,6,9],[1,5,8],[2,3,4],[7]]
[[1,3,9],[2,5,6],[4,7,8],[0]]
[[0,4,5],[2,7,9],[3,6,8],[1]]
[[0,6,7],[1,2,3],[5,8,9],[4]]
[[0,3,8],[1,6,7],[4,5,9],[2]]
[[0,1,9],[2,7,8],[3,4,6],[5]]
[[0,5,7],[1,2,4],[6,8,9],[3]]
[[0,1,4],[2,5,6],[3,7,9],[8]]
[[0,3,5],[1,7,8],[2,4,9],[6]]
[[0,2,9],[1,5,8],[4,6,7],[3]]
[[1,7,9],[2,5,6],[3,4,8],[0]]
[[0,1,6],[2,3,7],[4,5,9],[8]]
[[0,4,7],[1,3,5],[6,8,9],[2]]
[[0,2,8],[1,5,7],[3,6,9],[4]]

*/

var g_aTeams, g_aSites, g_nSites, g_nTeams;
var g_aCombos = [];
var g_num_combos = 0;
var g_current_combo_num = 0;
var g_aSets = [];
var g_two_team_site;
if (!window.Worker)
  alert('This page will not work in your web browser because it does not support Web Workers. Try Firefox 3.5+ or Chrome.');

function GlobalSetup(team_names, team_index_to_remove) {
	g_nTeams = team_names.length;
	
	// hydrate the teams
	var nTeam = 0;
	g_aTeams = _(team_names).map(function(strName) {
	  var timesPlayedTeam = [];
	  for (var nTime = 0; nTime < team_names.length; ++nTime)
	    timesPlayedTeam.push(0);
		return { team: strName, nTeam: nTeam++, timesPlayedTeam: timesPlayedTeam, nByes: 0, nTwoTeamSite: 0 };
	});
	
	var num_teams_playing = g_aTeams.length;
	if (team_index_to_remove != null)
	  num_teams_playing--;
	
	// guard clauses (enforcing the limits of the program);
	var err_msg = '';
	if (num_teams_playing < 7)
		err_msg = "Error: The round-robin generator isn't programmed to generate a round-robin schedule with fewer than 7 teams."
	if (num_teams_playing > 12)
		err_msg = "Error: The round-robin generator isn't programmed to generate a round-robin schedule with more than 12 teams.";
	if (err_msg) {
		alert(err_msg);
		throw new Error(err_msg);
	}
	
	// TODO: encode these rules into optional preferences in the UI
	if (num_teams_playing == 7) {
		g_aSites = ["Site 1", "Site 2", "Bye"];
		g_two_team_site = null;
	}
	if (num_teams_playing == 8) {
		g_aSites = ["Site 1", "Site 2", "Site 3"];
		g_two_team_site = 3;
	}
	if (num_teams_playing == 9) {
		g_aSites = ["Site 1", "Site 2", "Site 3"];
		g_two_team_site = null;
	}
	if (num_teams_playing == 10) {
		g_aSites = ["Site 1", "Site 2", "Site 3", "Bye"];
		g_two_team_site = null;
	}
	if (num_teams_playing == 11) {
		g_aSites = ["Site 1", "Site 2", "Site 3", "Site 4"];
		g_two_team_site = 4;
	}
	if (num_teams_playing == 12) {
		g_aSites = ["Site 1", "Site 2", "Site 3", "Site 4"];
		g_two_team_site = null;
	}
	
	g_nSites = g_aSites.length;
	
	// hydrate the sites
	var nSite = 0;
	g_aSites = _(g_aSites).map(function(strName) {
		return { site: strName, nSite: nSite++, aTeams: new Array(), nMaxTeams: strName != "Bye" && strName != "Site 4" ? 3 : g_aTeams.length - 9 };
	});
	
	var team_numbers = _(g_aTeams).pluck("nTeam");
	if (team_index_to_remove != null)
	  team_numbers.splice(team_index_to_remove, 1);
	CreateAllCombos(team_numbers);
}

function round(num) {
  var num_parts = num.toString().split('.');
  if (num_parts.length == 2) {
    var fraction = num_parts[1];
    num_parts[1] = fraction.substr(0, fraction.length < 3 ? fraction.length : 3);
    return num_parts.join('.');
  }
  else {
    return num_parts[0];
  }
}

function Assert(bool, msg) {
  if (!bool)
    throw new Error(msg);
}

function teamWithMultipleByes(team) { return team.nByes > 1; }

function ApplySet(set) {
	var nSites = set.length;
	for(var nSite = 0; nSite < nSites; ++nSite) {
		var combo = set[nSite];
		
		// this is IDENTICAL to above, see if we can't make it a function?
		// and pass in "+1" or "-1" for increment and decrement?
		// setup teams
    var nTeams = combo.length;
    var team1 = g_aTeams[combo[0]];
    var team2 = nTeams > 1 ? g_aTeams[combo[1]] : null;
    var team3 = nTeams > 2 ? g_aTeams[combo[2]] : null;
    
    // setup team #s
    var team1_nTeam = team1.nTeam;
    var team2_nTeam = team2 ? team2.nTeam : -1;
    var team3_nTeam = team3 ? team3.nTeam : -1;
    
    // increment everything
    if (team2) {
      ++team1.timesPlayedTeam[team2_nTeam];
      ++team2.timesPlayedTeam[team1_nTeam];
  	  if (team3) {
  	    ++team1.timesPlayedTeam[team3_nTeam];
  	    ++team2.timesPlayedTeam[team3_nTeam];
  	    ++team3.timesPlayedTeam[team1_nTeam];
  	    ++team3.timesPlayedTeam[team2_nTeam];
  	  }
  	}
  	else {
  	  ++team1.nByes;
  	}
		
		if (nTeams == 2) {
			++team1.nTwoTeamSite;
			++team2.nTwoTeamSite;
		}
	}
}

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
function CreateAllCombos(team_numbers) {
  g_aCombos = [];
	AddToCombo([], team_numbers, g_aCombos);
}

function AddToCombo(aTeamsUsed, aTeamsLeft, combos) {
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
			if ((aTeamsUsed.length != 3 || team > aTeamsUsed[0]) && (aTeamsUsed.length != 6 || team > aTeamsUsed[3] || g_two_team_site == 3 || g_aTeams.length == 7))
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
				  AddToCombo(newTeamsUsed, newTeamsLeft, nested_site || combos);
				// otherwise, increment the # of combos (b/c this is a leaf)
				else
				  ++g_num_combos;
			}
		}
	}
}

function GetTeamByNum(num_team_searched_for) {
  return g_aTeams[num_team_searched_for];
}

// emulates all of Python's List slice functionality (with the "list[]" notation)
// http://docs.python.org/library/stdtypes.html#sequence-types-str-unicode-list-tuple-buffer-xrange
Array.prototype.slice = function(start, stop, step) {
  var len = this.length;
  if (step == null) step = 1;

  // if start or stop are omitted, they become "end" values
  if (start == null)
    start = step > 0 ? 0 : len;
  if (stop == null)
    stop = step > 0 ? len : 0;

  // if start or stop are greater than the length, use the length
  if (start > len) start = len;
  if (stop > len) stop = len;

  // if start or stop are negative, they are relative to the length
  if (start < 0) start = len + start;
  if (stop < 0) stop = len + stop;

  var result = [];
  for (var index = start; index < stop; index = index + step)
    result.push(this[index]);

  return result;
}