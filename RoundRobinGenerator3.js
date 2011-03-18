var g_aTeams, g_aSites, g_nSites, g_nTeams;
var g_aCombos = [];
var g_num_combos = 0;
var g_current_combo_num = 0;
var g_aSets = [];
var g_two_team_site;
var fnZero = function() { return 0; }
var g_stop_time, g_cancel;
function $(id) { return document.getElementById(id); }
if (!window.Worker)
  alert('This page will not work in your web browser because it does not support Web Workers. Try Firefox 3.5+ or Chrome.');
  
// TODO: we *really* just need to include prototype... why aren't we?
// I think it's b/c of the web workers not allowing window/DOM stuff

// not recursive, not well written, etc, etc
Array.prototype.flatten = function() {
  var len = this.length;
  var results = [];
  for (var n = 0; n < len; ++n) {
    var item = this[n];
    // if isArray
    if (item.splice && item.slice) {
      results = results.concat(item);
    }
    else {
      results.push(item);
    }
  }
  return results;
}

Array.prototype.invoke = function(method_name) {
  var len = this.length;
  var results = [];
  for (var n = 0; n < len; ++n) {
    results.push(this[n][method_name]());
  }
  return results;
}
Array.prototype.pluck = function(prop_name) {
  var len = this.length;
  var results = [];
  for (var n = 0; n < len; ++n) {
    results.push(this[n][prop_name]);
  }
  return results;
}
String.prototype.strip = function() {
  return this.replace(/^\s+/, '').replace(/\s+$/, '');
}

// it's great that we're using the deviations and trying every possible combination
// the next step is to webify it w/ a progress indicator or move it to Python

function GlobalSetup(team_names, team_index_to_remove) {
	g_nTeams = team_names.length;
	
	// hydrate the teams
	var nTeam = 0;
	g_aTeams = team_names.map(function(strName) {
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
	g_aSites = g_aSites.map(function(strName) {
		return { site: strName, nSite: nSite++, aTeams: new Array(), nMaxTeams: strName != "Bye" && strName != "Site 4" ? 3 : g_aTeams.length - 9 };
	});
	
	var team_numbers = g_aTeams.pluck("nTeam");
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
    $('progress').innerHTML = '0%';
  else
    $('progress').innerHTML = round(g_current_combo_num / g_num_combos) + '%';
  g_stop_time.setSeconds(g_stop_time.getSeconds() + 10);
  setTimeout(pushTimerBack, 10 * 1000);
}

function GenerateRoundRobin(nRounds) {
  // 10 seconds (1000ms in a sec)
  g_stop_time = new Date();
  var team_names = $("txtTeams").value.split(",").invoke("strip");
  GlobalSetup(team_names, 10);
  
	/*
	2010 Season
  // December
  ApplySetNew([[0, 3, 6], [1, 4, 7], [5, 8, 9], [2], [0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]);
  ApplySetNew([[0, 5, 7], [2, 3, 8], [4, 6, 9], [1]]);
  ApplySetNew([[1, 4, 8], [2, 5, 6], [3, 7, 9], [0], [0, 8, 9], [1, 5, 6], [2, 4, 7], [3]]);
  
  // January
  ApplySetNew([[0, 4, 6], [1, 3, 9], [2, 5, 7], [8], [0, 2, 9], [1, 6, 7], [3, 5, 8], [4]]);
  ApplySetNew([[0, 1, 3], [2, 6, 9], [4, 5, 8], [7]]);
  ApplySetNew([[0, 7, 8], [1, 5, 9], [2, 3, 4], [6], [0, 4, 9], [1, 2, 8], [3, 6, 7], [5]]);
  
	// February
	ApplySetNew([[0, 2, 8], [1, 3, 6], [5, 7, 9], [4], [0, 3, 5], [2, 4, 7], [6, 8, 9], [1]]);
	ApplySetNew([[0, 1, 7], [2, 5, 6], [3, 4, 8], [9]]);
	ApplySetNew([[0, 4, 6], [1, 5, 8], [3, 7, 9], [2], [0, 4, 5], [1, 2, 9], [6, 7, 8], [3]]);
	
	// March
	ApplySetNew([[0, 3, 6], [2, 5, 9], [4, 7, 8], [1], [0, 5, 7], [1, 4, 9], [2, 3, 8], [6]]);
	ApplySetNew([[0, 8, 9], [1, 2, 3], [4, 5, 6], [7]]);
	ApplySetNew([[0, 1, 5], [2, 6, 7], [3, 4, 9], [8], [0, 2, 4], [1, 6, 8], [3, 7, 9], [5]]);
  
  $("tbxSchedule").value = SetToString([[0, 2, 4], [1, 6, 8], [3, 7, 9], [5]]);
	*/
	
	// Regionals 2010
	/*ApplySetNew([[0, 4, 5], [2, 3, 7], [1, 6], [0, 1, 3], [5, 6, 7], [2, 4]]);
	ApplySetNew([[0, 2, 6], [1, 4, 7], [3, 5], [1, 2, 5], [3, 4, 6], [0, 7]]);
	ApplySetNew([[0, 1, 5], [2, 3, 7], [4, 6], [0, 3, 6], [1, 4, 7], [2, 5]]);
	ApplySetNew([[0, 2, 4], [5, 6, 7], [1, 3], [1, 2, 6], [3, 4, 5], [0, 7]]);
	ApplySetNew([[2, 3, 5], [4, 6, 7], [0, 1], [0, 2, 7], [1, 3, 4], [5, 6]]);
	ApplySetNew([[0, 4, 5], [1, 2, 6], [3, 7], [0, 3, 6], [1, 5, 7], [2, 4]]);
	ApplySetNew([[0, 4, 6], [1, 5, 7], [2, 3]]);
	ApplySetNew([[0, 1, 3], [2, 4, 5], [6, 7], [0, 2, 7], [3, 5, 6], [1, 4]]);*/
	
	//$("tbxSchedule").value = SetToString([[0, 1, 4], [2, 6, 7], [3, 5]]);
	
	//130,000 or 1,320,000
	// 2010-2011 Pre-Season (October & November)
	/*ApplySetNew([[0, 1, 9], [2, 7, 10], [3, 5, 8], [4, 6]]);
	ApplySetNew([[0, 3, 6], [1, 5, 7], [2, 4, 8], [9, 10]]);
	ApplySetNew([[0, 4, 5], [1, 6, 10], [7, 8, 9], [2, 3]]);
	ApplySetNew([[0, 8, 10], [2, 6, 9], [3, 4, 7], [1, 5]]);
	ApplySetNew([[1, 6, 8], [2, 5, 9], [3, 4, 10], [0, 7]]);
	ApplySetNew([[0, 4, 9], [1, 2, 3], [5, 6, 10], [7, 8]]);
	
	ApplySetNew([[10, 9, 1], [8, 3, 0], [7, 5, 2], [6, 4]]);
	ApplySetNew([[10, 7, 4], [9, 5, 3], [8, 6, 2], [1, 0]]);
	ApplySetNew([[10, 6, 5], [9, 4, 0], [3, 2, 1], [8, 7]]);
	ApplySetNew([[10, 2, 0], [8, 4, 1], [7, 6, 3], [9, 5]]);
	ApplySetNew([[9, 4, 2], [8, 5, 1], [7, 6, 0], [10, 3]]);
	ApplySetNew([[10, 6, 1], [9, 8, 7], [5, 4, 0], [3, 2]]);*/
	
	// 2010-2011 Season
	// December 2010
	ApplySetNew([[0,3,6],[2,5,9],[7,8,10],[1,4]]);
	ApplySetNew([[0,5,7],[1,2,3],[4,6,10],[8,9]]);
	ApplySetNew([[0,4,9],[1,5,8],[2,6,7],[3,10]]);
	ApplySetNew([[0,2,10],[1,7,9],[3,4,8],[5,6]]);
	ApplySetNew([[1,6,9],[2,4,8],[3,5,10],[0,7]]);
	
	// January 2011
	ApplySetNew([[0,6,8],[3,4,7],[5,9,10],[1,2]]);
	ApplySetNew([[0,1,10],[2,3,9],[4,5,6],[7,8]]);
	ApplySetNew([[0,5,8],[1,6,10],[2,4,7],[3,9]]);
	ApplySetNew([[0,1,4],[3,5,7],[8,9,10],[2,6]]);
	ApplySetNew([[0,2,10],[1,3,8],[6,7,9],[4,5]]);
	
	// February 2011
	/*ApplySetNew([[1,2,5],[3,6,8],[4,7,9],[0,10]]);
	ApplySetNew([[0,3,9],[1,7,10],[2,4,8],[5,6]]);
	ApplySetNew([[0,1,3],[4,5,10],[6,8,9],[2,7]]);
	ApplySetNew([[1,6,7],[2,3,5],[4,9,10],[0,8]]);
	ApplySetNew([[0,2,9],[3,6,10],[5,7,8],[1,4]]);*/
	/*0=WOOTurtles, 
	1=Slow-Mo, 
	2=FBIQ, 
	3=Outnumbered, 
	4=7 Dwarves, 
	5=Peloponnesians, 
	6=Warriors of Grace, 
	7=Risers, 
	8=Calvary Chapel 1 (Ewe Sticky), 
	9=Reborn, 
	-10=Calvary Chapel 2- (Cookie Monsters)*/
	// Reconstructed February 2011
	ApplySetNew([[1,2,5],[3,6],[4,7,9],[0,8]]);
	ApplySetNew([[0,3,9],[1,7],[2,4,8],[5,6]]);
	ApplySetNew([[0,1,3],[4,5],[6,8,9],[2,7]]);
	ApplySetNew([[1,6,7],[2,3,5],[4,9],[0,8]]);
	ApplySetNew([[0,2,9],[3,6],[5,7,8],[1,4]]);
	
	// ORIGINAL (unbalanced) March 2011
//  ApplySetNew([[0,3,7],[1,5,9],[2,6,8],[4]]);
//  ApplySetNew([[0,4,6],[1,3,8],[2,5,7],[9]]);
//  ApplySetNew([[0,5,6],[1,8,9],[2,3,4],[7]]);
//  ApplySetNew([[0,4,9],[1,2,6],[3,7,8],[5]]);
//  ApplySetNew([[0,1,7],[3,5,9],[4,6,8],[2]]);
	
	// BALANCED March 2011
	ApplySetNew([[0,3,4],[1,5,9],[2,6,8],[7]]);
	ApplySetNew([[0,5,7],[1,3,8],[4,6,9],[2]]);
	ApplySetNew([[0,1,6],[2,3,7],[4,5,8],[9]]);
	ApplySetNew([[0,2,4],[3,5,6],[7,8,9],[1]]);
	ApplySetNew([[0,5,9],[1,2,8],[3,4,7],[6]]);
	
	$("tbxSchedule").value += CompetitionReport(g_aTeams) + '\n\n' + TwoTeamSiteReport(g_aTeams) + "\n\n" + ByeReport(g_aTeams);
	
	g_num_rounds = nRounds;
  g_lastRoundSite = g_nSites * (g_num_rounds - 1);
  $('gen1').disabled = true;
	$('gen2').disabled = true;
  
  var worker = new Worker('generator_worker.js');
  worker.onmessage = function(event) {
    var best_sets = event.data.g_best_sets;
    alert('Num Best Sets:' + best_sets.length);
    // instead of just picking one at random, we clear out the data & start
    // over with JUST THIS MEET, so we also have a well-balanced meet
    
    // clear everything out, then just apply this meet as tie-breaker
    GlobalSetup(team_names, 10);
    ApplySetNew([[0,3,4],[1,5,9],[2,6,8],[7]]);
    ApplySetNew([[0,5,7],[1,3,8],[4,6,9],[2]]);
    ApplySetNew([[0,1,6],[2,3,7],[4,5,8],[9]]);
    ApplySetNew([[0,2,4],[3,5,6],[7,8,9],[1]]);
    ApplySetNew([[0,5,9],[1,2,8],[3,4,7],[6]]);
    
    var balancedSets = [];
    var nLowestScore = null;
    
    var nSets = best_sets.length;
    for (var nSet = 0; nSet < nSets; ++nSet) {
      var nScore = ScoreSet([best_sets[nSet].flatten()]);
  		if (nLowestScore == null || nScore < nLowestScore) {
  			nLowestScore = nScore;
  			if (nScore == nLowestScore)
  			  balancedSets.push(best_sets[nSet]);
  			else
  			  balancedSets = [best_sets[nSet]];
  		}
    }
    alert('Num Balanced Sets: ' + balancedSets.length);
    var objBestSet = chooseRandomItem(balancedSets);
    ApplySetNew(objBestSet);
  	//$("tbxSchedule").value = JSON.stringify(objBestSet) + "\n\n" + SetToString(objBestSet) + "\n\n"
  	//$("tbxSchedule").value += CompetitionReport(g_aTeams) + '\n\n' + TwoTeamSiteReport(g_aTeams) + "\n\n" + ByeReport(g_aTeams);
  };
  worker.onerror = function(error) {
    alert('There was an error:');
    alert(error.message);
  };
  // trySiteCombos();
  var data = {
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
  };
  //alert(Object.toJSON(data));
  worker.postMessage(data);
}


function Assert(boolean, msg) {
  if (boolean)
    throw new Error(msg);
}

function teamWithMultipleByes(team) { return team.nByes > 1; }

function GenerateRoundRobin_OLD(nRounds) {
	GlobalSetup();
	
	var astr = [];
	var nLowestScore;
	var bestSets = [];
	
	// 2008, Oct quiz meet (6 rounds)
	/*ApplySet([[0, 1, 2, 3, 4, 5, 6, 7, 8], [0, 3, 6, 1, 4, 7, 2, 5, 8]]);
	ApplySet([[0, 4, 8, 1, 5, 6, 2, 3, 7], [0, 5, 7, 1, 3, 8, 2, 4, 6]]);
	ApplySet([[0, 1, 7, 2, 3, 8, 4, 5, 6], [0, 3, 5, 1, 4, 8, 2, 6, 7]]);
	
	// 2008 Nov quiz meet (6 rounds)
	ApplySet([[0, 6, 4, 1, 3, 9, 5, 7, 8]]);
	ApplySet([[0, 6, 8, 1, 9, 5, 3, 4, 7]]);
	ApplySet([[0, 8, 9, 1, 3, 6, 4, 5, 7]]);
	ApplySet([[0, 1, 7, 3, 4, 5, 6, 8, 9]]);
	ApplySet([[0, 3, 6, 1, 4, 8, 5, 7, 9]]);
	ApplySet([[0, 4, 9, 1, 6, 7, 5, 3, 8]]);
	// commented-out pre-season, starting fresh with the regular season
	*/
	
	// 2008 Dec quiz meet (5 rounds)
	/*ApplySet([[0, 1, 2, 3, 4, 5, 6, 7, 8], [0, 3, 6, 1, 4, 7, 2, 5, 8]]);
	ApplySet([[0, 4, 8, 1, 5, 6, 2, 3, 7]]);
	ApplySet([[0, 1, 2, 3, 4, 5, 6, 7, 8], [0, 5, 7, 1, 3, 8, 2, 4, 6]]);
	
	// 2009 Jan quiz meet (5 rounds)
	var round1 = [0, 3, 6, 1, 4, 7, 2, 5, 8];
	var round2 = [0, 4, 8, 1, 5, 6, 2, 3, 7];
	var round3 = [0, 5, 7, 1, 3, 8, 2, 4, 6];
	var round4 = [0, 1, 2, 3, 4, 5, 6, 7, 8];
	var round5 = [0, 5, 8, 1, 4, 7, 2, 3, 6];
	
	ApplySet([round1, round2]);
	ApplySet([round3]);
	ApplySet([round4]);
	ApplySet([round5]);
	
	// feb
	ApplySet([[0, 3, 7, 1, 5, 6, 2, 4, 8], [0, 4, 6, 1, 3, 8, 2, 5, 7]]);
	ApplySet([[0, 1, 2, 3, 7, 8, 4, 5, 6]]);
	ApplySet([[0, 3, 4, 1, 5, 7, 2, 6, 8], [0, 5, 8, 1, 3, 6, 2, 4, 7]]);
	
	// mar
	ApplySet([[0, 1, 2, 3, 4, 5, 6, 7, 8], [0, 6, 7, 1, 4, 8, 2, 3, 5]]);
	ApplySet([[0, 7, 8, 1, 5, 6, 2, 3, 4]]);
	
	// April
	ApplySet([[0, 4, 6, 1, 3, 8, 2, 5, 7]]);
	ApplySet([[0, 5, 8, 1, 4, 7, 2, 3, 6]]);
	*/
	
	/* Randomization test BEFORE
	ApplySet([[1, 8, 9, 2, 3, 5, 4, 6, 7, 0]]);
	ApplySet([[0, 7, 9, 1, 5, 6, 3, 4, 8, 2]]);
	ApplySet([[0, 6, 8, 1, 3, 7, 2, 4, 9, 5]]);
	ApplySet([[0, 4, 5, 2, 7, 8, 3, 6, 9, 1]]);
	*/
  
  // Randomization test AFTER
  /*ApplySet([[0, 5, 8, 1, 4, 7, 3, 6, 9, 2]]);
  ApplySet([[0, 2, 3, 4, 8, 9, 5, 6, 7, 1]]);
  ApplySet([[0, 4, 6, 1, 3, 8, 2, 7, 9, 5]]);
  ApplySet([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]]);*/
  
	var previous_rounds = [];//Object.toJSON(round1), Object.toJSON(round2), Object.toJSON(round3), Object.toJSON(round4)];
	// guess I need to code it to avoid duplicates from the same meet
	
	var nCombos = g_aCombos.length;
	// Calculate a Single Round
	if (nRounds == 1) {
		for(var Round1 = 0; Round1 < nCombos; ++Round1) {
		  var combo = g_aCombos[Round1];
			var nScore = ScoreSet([combo]);
			
			// will no longer do duplicates
			if ((nLowestScore == null || nScore <= nLowestScore) && !previous_rounds.find(function(prev_round) {
			    var nTeams = prev_round.length;
			    for (var nTeam = 0; nTeam < nTeams; ++nTeam)
			      if (combo[nTeam] != prev_round[nTeam])
			        return false;
			    return true;
			  } )) {
				nLowestScore = nScore;
				if (nScore == nLowestScore)
				  bestSets.push([combo]);
				else
				  bestSets = [[combo]];
			}
		}
	}
	// Calculate a Double Round
	else if (nRounds == 2) {
	  bestSets = iterateRoundOne(bestSets, nLowestScore, nCombos);
	}
	
	var objBestSet = chooseRandomItem(bestSets);
	ApplySet(objBestSet);
	//logDebug('Number of sets: ' + num_sets + ', choosing random set number ' + random_set_num);

	$("tbxSchedule").value = Object.toJSON(objBestSet) + "\n\n" + SetToString_OLD(objBestSet) + "\n\n" + CompetitionReport(g_aTeams) + '\n\n' + ByeReport(g_aTeams);
	$('gen1').disabled = true;
	$('gen2').disabled = true;
}

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
		var combo_by_names = combo.slice(0, 3).map(GetTeamByNum).pluck("team");
		
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
		var combo_by_names = combo.map(GetTeamByNum).pluck("team");
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