var g_aTeams, g_aSites, g_nSites, g_nTeams;
var g_aCombos = [];
var g_num_combos = 0;
var g_current_combo_num = 0;
var g_aSets = [];
var fnZero = function() { return 0; }
var g_stop_time, g_cancel;

// it's great that we're using the deviations and trying every possible combination
// the next step is to webify it w/ a progress indicator or move it to Python

document.observe('dom:loaded', function() {
  $('gen1').removeAttribute('disabled');
	$('gen2').removeAttribute('disabled');
});

function GlobalSetup() {
  if (!g_aTeams) {
    g_aTeams = $("txtTeams").value.split(",").invoke("strip");
  	g_nTeams = g_aTeams.length;
  	
  	// hydrate the teams
  	var nTeam = 0;
  	g_aTeams = g_aTeams.map(function(strName) {
  	  var timesPlayedTeam = [];
  	  for (var nTime = 0; nTime < g_aTeams.length; ++nTime)
  	    timesPlayedTeam.push(0);
  		return { team: strName, nTeam: nTeam++, timesPlayedTeam: timesPlayedTeam, nByes: 0 };
  	});
  	
  	// remove Jason's 4, who are no longer
  	//g_aTeams = g_aTeams.without(function(team) { return team.strName == "Jason's 4"; });
  	
  	// guard clauses (enforcing the limits of the program);
  	if (g_aTeams.length < 9) throw new Error("Hey! You didn't enter enough teams. I haven't been programmed to generate a round-robin schedule with fewer than 9 teams.");
  	if (g_aTeams.length > 12) throw new Error("Hey! You entered too many teams! I haven't been programmed to generate a round-robin schedule with more than 12 teams.");
  	
  	// TODO: encode these rules into optional preferences in the UI
  	if (g_aTeams.length == 9)
  		g_aSites = ["Site 1", "Site 2", "Site 3"];
  	if (g_aTeams.length == 10)
  		g_aSites = ["Site 1", "Site 2", "Site 3", "Bye"];
  	if (g_aTeams.length == 11)
  		g_aSites = ["Site 1", "Site 2", "Site 3", "Site 4"];
  	if (g_aTeams.length == 12)
  		g_aSites = ["Site 1", "Site 2", "Site 3", "Site 4"];
  	
  	g_nSites = g_aSites.length;
  	
  	// hydrate the sites
  	var nSite = 0;
  	g_aSites = g_aSites.map(function(strName) {
  		return { site: strName, nSite: nSite++, aTeams: new Array(), nMaxTeams: strName != "Bye" && strName != "Site 4" ? 3 : g_aTeams.length - 9 };
  	});
  	
  	CreateAllCombos();
  }
}

var g_best_sets = [];
var g_lowest_score = -1;
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
  
  GlobalSetup();
  
  // December
  ApplySetNew([[0, 3, 6], [1, 4, 7], [5, 8, 9], [2], [0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]);
  ApplySetNew([[0, 5, 7], [2, 3, 8], [4, 6, 9], [1]]);
  ApplySetNew([[1, 4, 8], [2, 5, 6], [3, 7, 9], [0], [0, 8, 9], [1, 5, 6], [2, 4, 7], [3]]);
  
  $("tbxSchedule").value = SetToString([[0, 3, 6], [1, 4, 7], [5, 8, 9], [2]]) + "\n\n"
  
  /*g_num_rounds = nRounds;
  g_lastRoundSite = g_nSites * (g_num_rounds - 1);
  trySiteCombos(g_aCombos, 0, []);
  $('gen1').disabled = true;
	$('gen2').disabled = true;
  
  var objBestSet = chooseRandomItem(g_best_sets);
  ApplySetNew(objBestSet);
	$("tbxSchedule").value = Object.toJSON(objBestSet) + "\n\n" + SetToString(objBestSet) + "\n\n"
	$("tbxSchedule").value += CompetitionReport(g_aTeams) + '\n\n' + ByeReport(g_aTeams);*/
}

function trySiteCombos(combos, nCumulativeScore, prev_sites) {
  // leapfrog ahead by pushing the other stop_time 10 sec beyond this one
  /*if (g_cancel)
    return;
  if (new Date() > g_stop_time) {
    // wait half a second for the UI to update
    setTimeout(trySiteCombos.curry(combos, nCumulativeScore, prev_sites), 500);
    return;
  }*/
  
  // all the sites we've done so far, including this one
  var nSitesDone = prev_sites.length + 1;
  var last_round = nSitesDone > g_lastRoundSite;
  var prep_for_last_round = nSitesDone == g_lastRoundSite;
    
  var nCombos = combos.length;
  for (var nCombo = 0; nCombo < nCombos; ++nCombo) {
    var combo = combos[nCombo];
    var new_score = nCumulativeScore;
    // setup teams
    startTime('setup teams');
    var nTeams = combo.length;
    var team1 = g_aTeams[combo[0]];
    var team2 = nTeams > 1 ? g_aTeams[combo[1]] : null;
    var team3 = nTeams > 2 ? g_aTeams[combo[2]] : null;
    
    // setup team #s
    var team1_nTeam = team1.nTeam;
    var team2_nTeam = team2 ? team2.nTeam : -1;
    var team3_nTeam = team3 ? team3.nTeam : -1;
    stopTime('setup teams');
    
    if (!last_round) {
      startTime('increment');
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
    	stopTime('increment');
    
      // calculate score of each team
      if (prep_for_last_round) {
        ++g_current_combo_num;
        startTime('calc score all');
        for (var nTeam = 0; nTeam < g_nTeams; ++nTeam) {
          new_score += TeamScore5(g_aTeams[nTeam]);
        }
        stopTime('calc score all');
      }
    }
    
    if (last_round) {
      if (team2) {
        new_score += (TeamScoreDiff(team1.timesPlayedTeam[team2_nTeam]) * 2);
    	  if (team3) {
    	    new_score += (TeamScoreDiff(team1.timesPlayedTeam[team3_nTeam]) * 2);
    	    new_score += (TeamScoreDiff(team2.timesPlayedTeam[team3_nTeam]) * 2);
    	  }
    	}
    	else {
    	  // penalize teams with more than 1 bye
    	  if (team1.nByes) {
    	    new_score += 10000;
    	  }
    	}
    }

    // recurse if there are nested combinations
    var nested_combo = combo.length >= 4 ? combo[3] : null;
    if (nested_combo && nested_combo.length) {
      // every single [..., [0, 5, 7] is too high to recurse, why are their scores in the 400s?
      //if (g_lowest_score != -1 && prev_sites.length == 6 && prev_sites[0][2] == 7 && prev_sites[0][1] == 5 && prev_sites[0][0] == 0)
      //  logDebug('[0, 5, 7] - ' + new_score + ', g_lowest_score: ' + g_lowest_score + ', ' + prev_sites);
      if (g_lowest_score == -1 || new_score <= g_lowest_score) {
        // could streamline by doing "new_prev_sites.push(combo);"
        startTime('prep nested - could streamline');
        var new_prev_sites = [].concat(prev_sites);
				new_prev_sites.push([combo[0], combo[1], combo[2]]);
				stopTime('prep nested - could streamline');
        trySiteCombos(nested_combo, new_score, new_prev_sites);
      }
    }
    
    // if we just finished a round, start over w/ g_aCombos for the next
    if (!last_round && nSitesDone % g_nSites == 0) {
      startTime('starting over');
      if (prev_sites[2] == 7 && prev_sites[1] == 5 && prev_sites[0] == 0)
        logDebug('[0, 5, 7] - ' + new_score);
      var new_prev_sites = [].concat(prev_sites);
			new_prev_sites.push(combo.slice(0, 3));
			stopTime('starting over');
			trySiteCombos(g_aCombos, new_score, new_prev_sites);
    }
    
    // if we're at a leaf-node, possibly add to list of best scores
    if (last_round && (nSitesDone == g_nSites * g_num_rounds)) {
      startTime('leaf-node / scoring');
      if (g_lowest_score == -1 || new_score <= g_lowest_score) {
        var set = [].concat(prev_sites);
        set.push(combo.slice(0, 3));
        if (new_score == g_lowest_score) {
          g_best_sets.push(set);
        }
        else if (g_lowest_score == -1 || new_score < g_lowest_score) {
          g_best_sets = [set];
          g_lowest_score = new_score;
          logDebug('new low score: ' + new_score + ', ' + set);
        }
      }
      stopTime('leaf-node / scoring');
    }
    
    // decrement everything 
    if (!last_round) {
      startTime('decrement');
      if (team2) {
        --team1.timesPlayedTeam[team2_nTeam];
        --team2.timesPlayedTeam[team1_nTeam];
        if (team3) {
    	    --team1.timesPlayedTeam[team3_nTeam];
    	    --team2.timesPlayedTeam[team3_nTeam];
    	    --team3.timesPlayedTeam[team1_nTeam];
    	    --team3.timesPlayedTeam[team2_nTeam];
    	  }
    	}
    	else {
    	  --team1.nByes;
    	}
  	  stopTime('decrement');
    }
  }
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
		var combo = set[nSite];
		var combo_by_names = combo.slice(0, 3).map(GetTeamByNum).pluck("team");
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

// 5th version based on just squaring the # of times played
function TeamScore5(team) {
	var sqrTotal = 0;
	var timesPlayedTeam = team.timesPlayedTeam;
	for(var nTeam = 0; nTeam < g_nTeams; ++nTeam) {
    var newNumber = timesPlayedTeam[nTeam];
    sqrTotal += newNumber * newNumber;
	}
  if (team.nByes > 1)
	  sqrTotal += (10000 * (team.nByes - 1)); // severely penalize any combo that gives a single team multiple byes
  return sqrTotal;
}

// augment the 5th version by providing the diff
// between the current # of times played and the next one
function TeamScoreDiff(nTimesPlayed) {
  var newTimesPlayed = nTimesPlayed + 1;
  return (newTimesPlayed * newTimesPlayed) - (nTimesPlayed * nTimesPlayed);
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

function CreateAllCombos() {
  g_aCombos = [];
	AddToCombo([], g_aTeams.pluck("nTeam"), g_aCombos);
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
			if ((aTeamsUsed.length != 3 || team > aTeamsUsed[0]) && (aTeamsUsed.length != 6 || team > aTeamsUsed[3]))
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
	teams.each(function(team) {
		result += team.team + '\t' + team.timesPlayedTeam.join('\t') + '\n';
	});
	return result;
}

function ByeReport(teams) {
	result = 'Byes:\n';
	teams.each(function(team) {
		result += team.team + ': ' + team.nByes + '\n';
	});
	return result;
}

// logging "debug" messages (interesting only to the programmer)
function logDebug(str) {
  if (console && console.log)
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