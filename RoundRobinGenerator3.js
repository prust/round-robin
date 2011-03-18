var $j = jQuery.noConflict();

var g_aTeams, g_aSites, g_nSites, g_nTeams;
var g_aCombos = [];
var g_num_combos = 0;
var g_current_combo_num = 0;
var g_aSets = [];
var g_two_team_site;
var fnZero = function() { return 0; }
var g_stop_time, g_cancel;
if (!window.Worker)
  alert('This page will not work in your web browser because it does not support Web Workers. Try Firefox 3.5+ or Chrome.');

$j(document).ready(function() {
  $j('#generate').click(GenerateRoundRobin);
  $j('#cancel').click(function() {
    g_cancel = true;
    alert('Calculation Cancelled.');
  });
});

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
	if (num_teams_playing < 8) throw new Error("Hey! You didn't enter enough teams. I haven't been programmed to generate a round-robin schedule with fewer than 9 teams.");
	if (num_teams_playing > 12) throw new Error("Hey! You entered too many teams! I haven't been programmed to generate a round-robin schedule with more than 12 teams.");
	
	// TODO: encode these rules into optional preferences in the UI
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

var g_num_rounds = -1;

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

function pushTimerBack() {
  if (!g_num_combos)
    $j('#progress').html('0%');
  else
    $j('#progress').html(round(g_current_combo_num / g_num_combos) + '%');
  g_stop_time.setSeconds(g_stop_time.getSeconds() + 10);
  setTimeout(pushTimerBack, 10 * 1000);
}

function GenerateRoundRobin() {
  var nRounds = parseInt($j('#rounds option:selected').val(), 10);
  // 10 seconds (1000ms in a sec)
  g_stop_time = new Date();
  var team_names = _($j('#teams').val().split(",")).map($j.trim);
  GlobalSetup(team_names);
  
	//Example:
  //ApplySetNew([[0,1,7],[3,5,9],[4,6,8],[2]]);
	
	//$j("#schedule").val($j("#schedule").val() + CompetitionReport(g_aTeams) + '\n\n' + TwoTeamSiteReport(g_aTeams) + "\n\n" + ByeReport(g_aTeams));
	
	g_num_rounds = nRounds;
  g_lastRoundSite = g_nSites * (g_num_rounds - 1);
  $j('#generate').attr('disabled', 'disabled');
  
  // TODO: balancing may be of minimal value, only look at it at the end
  
  // Initially, the user can just enter a # of sets (15, for instance)
  // and all get generated.
  // Eventually, the user *could* enter the # per day or per meet
  // and it could "balance" per day or meet
  
  // If there are 100+ best_sets, just pick one at random
  // Otherwise, try each of them & see which generates the lowest score
  
  // This script & the other should share the same score generator function
  // (this page can & should include the other page)
  
  // Eventually, it would present the results in an EditableTable
  // that prints as nicely as Excel
  // but is editable & saved via localStorage for subsequent runs
  // and the software could deal graciously with teams being added/deleted
  
  genBestSets(function(best_sets) {
    alert('Num Best Sets:' + best_sets.length);
    // instead of just picking one at random, we clear out the data & start
    // over with JUST THIS MEET, so we also have a well-balanced meet
    var balancedSets = pickBalancedSets(best_sets, team_names);
    alert('Num Balanced Sets: ' + balancedSets.length);
    var objBestSet = chooseRandomItem(balancedSets);
    ApplySetNew(objBestSet);
  	$j("#schedule").val(JSON.stringify(objBestSet) + "\n\n" + SetToString(objBestSet) + "\n\n" +
  	  CompetitionReport(g_aTeams) + '\n\n' + TwoTeamSiteReport(g_aTeams) + "\n\n" + ByeReport(g_aTeams));
  });
}

function genBestSets(callback) {
  var worker = new Worker('generator_worker.js');
  worker.onmessage = function(event) {
    callback(event.data.g_best_sets);
  };
  worker.onerror = function(error) {
    alert('There was an error:');
    alert(error.message);
  };
  // trySiteCombos();
  worker.postMessage({
    combos: g_aCombos,
    nCumulativeScore: 0,
    prev_sites: [],
    g_lastRoundSite: g_lastRoundSite,
    g_aTeams: g_aTeams,
    g_two_team_site: g_two_team_site,
    g_current_combo_num: g_current_combo_num,
    g_nTeams: g_nTeams,
    g_num_rounds: g_num_rounds,
    g_nSites: g_nSites
  });
}

function pickBalancedSets(best_sets, team_names) {
  // clear everything out, then just apply ones that are for this meet as
  // tie-breakers
  GlobalSetup(team_names);
  
  var balancedSets = [];
  var nLowestScore = null;
  
  var nSets = best_sets.length;
  for (var nSet = 0; nSet < nSets; ++nSet) {
    // rounding b/c (unbelievably) there are random differences with scores
    // like 28.8000000000005 and 28.8 & we want them treated the same
    
    // TODO: upgrade from v3 (std dev) to v5 (simple square) & do away w/
    // Math.round(*10)
    var nScore = Math.round(ScoreSet([_(best_sets[nSet]).flatten()]) * 10);
		if (nLowestScore == null || nScore <= nLowestScore) {
			if (nScore == nLowestScore)
			  balancedSets.push(best_sets[nSet]);
			else
			  balancedSets = [best_sets[nSet]];
			nLowestScore = nScore;
		}
  }
  return balancedSets;
}

function Assert(boolean, msg) {
  if (boolean)
    throw new Error(msg);
}

function teamWithMultipleByes(team) { return team.nByes > 1; }

function chooseRandomItem(array) {
  var num_items = array.length;
	var random_item_num = Math.floor(Math.random() * num_items);
	return array[random_item_num];
}

function iterateRoundOne(bestSets, nLowestScore, nCombos) {
	for(var Round1 = 0; Round1 < nCombos; ++Round1) {
	  logDebug(Round1);
		for(var Round2 = 0; Round2 < nCombos; ++Round2) {
		  startTime('innerLoop');
		  startTime('scoreSet');
			var nScore = ScoreSet([g_aCombos[Round1], g_aCombos[Round2]]);
			stopTime('scoreSet');
			if (nLowestScore == null || nScore < nLowestScore) {
				nLowestScore = nScore;
				if (nScore == nLowestScore)
				  bestSets.push([g_aCombos[Round1], g_aCombos[Round2]]);
				else
				  bestSets = [[g_aCombos[Round1], g_aCombos[Round2]]];
			}
			stopTime('innerLoop');
		}
	}
	return bestSets;
}

function ApplySet(aSet) {
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound) {
		var combo = aSet[nRound];
		IncrementTimesPlayed3(g_aTeams[combo[0]], g_aTeams[combo[1]], g_aTeams[combo[2]]);
		IncrementTimesPlayed3(g_aTeams[combo[3]], g_aTeams[combo[4]], g_aTeams[combo[5]]);
		IncrementTimesPlayed3(g_aTeams[combo[6]], g_aTeams[combo[7]], g_aTeams[combo[8]]);
		
		if (combo.length == 10)
			g_aTeams[combo[9]].nByes += 1;
	}
}

function ApplySetNew(set) {
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

// we randomize the position of the triads
// and the position of each team within each triad
// at this point because we haven't yet programmed the system
// to know how to handle nulls earlier (say, only two teams competing in Site 1)
// currently it only knows how to handle a list w/ 8 teams in it, rather than a
// list with 9 items and one of them is blank
function SetToString_OLD(aSet) {
	var nRounds = aSet.length;
	var astr = [];
	for(var nRound = 0; nRound < nRounds; ++nRound)
	{
		var combo = aSet[nRound];
		var combo_by_names = _(combo.slice(0, 3)).chain().map(GetTeamByNum).pluck("team").value();
		
		// create a nested array of sites and teams
		var sites = [];
		sites.push(combo_by_names.slice(0, 3));
		sites.push(combo_by_names.slice(3, 6));
		sites.push(combo_by_names.slice(6, 9));
		if (combo_by_names.length > 9)
		  sites.push(combo_by_names.slice(9, 12));
		
		astr.push("Round " + (nRound + 1));
		sites.sort(randomOrder);
		for (var nSite = 0; nSite < sites.length; ++nSite) {
		  var site = sites[nSite];
		  site.sort(randomOrder);
		  astr.push(site.join("\n") + "\n");
		}	
	}
	return astr.join("\n");
}

function SetToString(set) {
	var astr = [];
	set.sort(randomOrder);
	var nSites = set.length;
	for (var nSite = 0; nSite < nSites; ++nSite) {
		var combo = set[nSite].slice(0, 3);
		combo.sort(randomOrder);
		var combo_by_names = _(combo).chain().map(GetTeamByNum).pluck("team").value();
		astr.push(combo_by_names.join("\n") + "\n");
	}
	return astr.join("\n");
}

function ScoreSet(aSet) {
	var nScore = 0;
	
	// simulate placing 9 teams in 9 sites
	startTime('simulate');
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound) {
		var combo = aSet[nRound];
		IncrementTimesPlayed3(g_aTeams[combo[0]], g_aTeams[combo[1]], g_aTeams[combo[2]]);
		IncrementTimesPlayed3(g_aTeams[combo[3]], g_aTeams[combo[4]], g_aTeams[combo[5]]);
		IncrementTimesPlayed3(g_aTeams[combo[6]], g_aTeams[combo[7]], g_aTeams[combo[8]]);
		
		if (combo.length == 10)
			g_aTeams[combo[9]].nByes += 1;
	}
	stopTime('simulate');
	
	// add up the score
	startTime('addupscore');
	var nTeams = g_aTeams.length;
	for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
		var team;
		if (team = g_aTeams[nTeam])
			nScore += TeamScore(team);
	}
	stopTime('addupscore');
	
	// simulate placing 9 teams in 9 sites
	startTime('decrement');
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound) {
		var combo = aSet[nRound];
		DecrementTimesPlayed3(g_aTeams[combo[0]], g_aTeams[combo[1]], g_aTeams[combo[2]]);
		DecrementTimesPlayed3(g_aTeams[combo[3]], g_aTeams[combo[4]], g_aTeams[combo[5]]);
		DecrementTimesPlayed3(g_aTeams[combo[6]], g_aTeams[combo[7]], g_aTeams[combo[8]]);
		
		if (combo.length == 10)
			g_aTeams[combo[9]].nByes -= 1;
	}
	stopTime('decrement');
	
	return nScore;
}

// Third version (sum of deviations from the mean)
function TeamScore(team) {
	var nSum = 0;
	var nDeviations = 0;
	for(var nTeam = 0; nTeam < g_nTeams; ++nTeam)
		nSum += team.timesPlayedTeam[nTeam];
	var nMean = nSum / g_nTeams;
	for(var nTeam = 0; nTeam < g_nTeams; ++nTeam)
		nDeviations += Math.abs(nMean - team.timesPlayedTeam[nTeam])
	
	if (team.nByes >= 2)
	  nDeviations += 10000; // severely penalize any combo that gives a single team multiple byes

	return nDeviations;
}

// fourth version based on standard deviation code from:
// http://www.cs.miami.edu/~burt/learning/Math119/js-ComputeStdDev.html
function TeamScore_NEW(team) {
	var nSum = 0;
	var nDeviations = 0;
	var sqrTotal = 0;
	var timesPlayedTeam = team.timesPlayedTeam;
	for(var nTeam = 0; nTeam < g_nTeams; ++nTeam) {
    var newNumber = timesPlayedTeam[nTeam];
    nSum += newNumber;
    sqrTotal += (newNumber * newNumber);
	}
  if (team.nByes >= 2)
	  nDeviations += 10000; // severely penalize any combo that gives a single team multiple byes
  variance = (sqrTotal - ((nSum * nSum)/g_nTeams))/g_nTeams;
  return Math.sqrt(variance)
}



function IncrementTimesPlayed3(team1, team2, team3)
{
	//IncrementTimesPlayed(team1, team2);
	++team2.timesPlayedTeam[team1.nTeam];
	++team1.timesPlayedTeam[team2.nTeam];
	
	//IncrementTimesPlayed(team2, team3);
	++team3.timesPlayedTeam[team2.nTeam];
	++team2.timesPlayedTeam[team3.nTeam];
	
	//IncrementTimesPlayed(team1, team3);
	++team3.timesPlayedTeam[team1.nTeam];
	++team1.timesPlayedTeam[team3.nTeam];
}

function DecrementTimesPlayed3(team1, team2, team3)
{
	//IncrementTimesPlayed(team1, team2);
	--team2.timesPlayedTeam[team1.nTeam];
	--team1.timesPlayedTeam[team2.nTeam];
	
	//IncrementTimesPlayed(team2, team3);
	--team3.timesPlayedTeam[team2.nTeam];
	--team2.timesPlayedTeam[team3.nTeam];
	
	//IncrementTimesPlayed(team1, team3);
	--team3.timesPlayedTeam[team1.nTeam];
	--team1.timesPlayedTeam[team3.nTeam];
}

function CreateAllCombos(team_numbers) {
  g_aCombos = [];
	AddToCombo([], team_numbers, g_aCombos);
}

function AddToCombo(aTeamsUsed, aTeamsLeft, combos) {
  // loop through aTeamsLeft until we find one that works
	var nTeams = aTeamsLeft.length;
	for(var nTeam = 0; nTeam < nTeams; ++nTeam) {
		var team = aTeamsLeft[nTeam];
		
		// force ascending order within a triad to eliminate duplicates
		if ((aTeamsUsed.length % 3 == 0) || (team > aTeamsUsed[aTeamsUsed.length - 1]))
		{
			// force ascending order between triads to eliminate duplicate triads
			// CAREFUL: only force ascending order between sites if the last site is full
			// && (aTeamsUsed.length != 9 || team > aTeamsUsed[6])
			if ((aTeamsUsed.length != 3 || team > aTeamsUsed[0]) && (aTeamsUsed.length != 6 || team > aTeamsUsed[3] || g_two_team_site == 3))
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


function GetTeam(strName) {
	return g_aTeams.find(function(team) { return team.team == strName; });
}
function GetTeamByNum(num_team_searched_for) {
  return g_aTeams[num_team_searched_for];
}

function CompetitionReport(teams) {
	result = 'Competition:\n';
	var nTeams = teams.length;
	for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
	  var team = teams[nTeam];
		result += team.team + '\t' + team.timesPlayedTeam.join('\t') + '\n';
	}
	return result;
}

function ByeReport(teams) {
	result = 'Byes:\n';
	var nTeams = teams.length;
	for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
	  var team = teams[nTeam];
		result += team.team + ': ' + team.nByes + '\n';
	}
	return result;
}

function TwoTeamSiteReport(teams) {
	result = 'Times in a Two-Team Site:\n';
	var nTeams = teams.length;
	for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
	  var team = teams[nTeam];
		result += team.team + ': ' + team.nTwoTeamSite + '\n';
	}
	return result;
}

// logging "debug" messages (interesting only to the programmer)
function logDebug(str) {
  if (window.console && console.log)
    console.log(str);
}

// emulates all of Python's List slice functionality (with the "list[]" notation)
// http://docs.python.org/library/stdtypes.html#sequence-types-str-unicode-list-tuple-buffer-xrange
Array.prototype.slice = function(start, stop, step) {
  var len = this.length;
  if (isOmitted(step)) step = 1;

  // if start or stop are omitted, they become "end" values
  if (isOmitted(start))
    start = step > 0 ? 0 : len;
  if (isOmitted(stop))
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

function randomOrder() {
  return (Math.round(Math.random())-0.5);
}

function isOmitted(val) {
  return typeof val === "undefined" || val === null;
}

// time functions
var timers = {};
function startTime(strTimer)
{
	var timer = (strTimer in timers) ? timers[strTimer] : timers[strTimer] = { total: 0, countStart: 0, countStop: 0 };
	if (!timer.startTime)
		timer.startTime = [new Date()];
	else
		timer.startTime.push(new Date());
	++timer.countStart;
}
function stopTime(strTimer)
{
	var timer = timers[strTimer];
	// IEONLY: Not sure if other browsers implement array.pop()
	timer.total += new Date() - timer.startTime.pop();
	++timer.countStop;
}
function getTimes()
{
	var astrTimes = [];
	for (key in timers) {
		var timer = timers[key];
		if (timer.countStart != timer.countStop) alert("start/stop times don't match: " + key);
		astrTimes.push(timer.total + "ms - " + key + " (" + timer.countStart + ")");
	}
	timers = {};
	return astrTimes.join("\n");
}