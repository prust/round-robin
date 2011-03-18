onmessage = function(event) {
  this.g_lastRoundSite = event.data.g_lastRoundSite;
  this.g_aTeams = event.data.g_aTeams;
  this.g_two_team_site = event.data.g_two_team_site
  this.g_current_combo_num = event.data.g_current_combo_num;
  this.g_nTeams = event.data.g_nTeams;
  this.g_num_rounds = event.data.g_num_rounds;
  this.g_nSites = event.data.g_nSites;
  this.g_best_sets = [];
  this.g_lowest_score = -1;
  trySiteCombos(event.data.combos, event.data.nCumulativeScore, event.data.prev_sites);
  postMessage({ g_best_sets: g_best_sets });
}

function trySiteCombos(combos, nCumulativeScore, prev_sites) {  
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
			
			if (nSitesDone === g_two_team_site) {
				++team1.nTwoTeamSite;
				++team2.nTwoTeamSite;
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
				// TODO: this doesn't take into account a situation where there is more than 1 bye
				// to tackle that, we'd have to rewrite it to be like the nTwoTeamSite penalty
				// with squares instead of a static number
    	  if (team1.nByes) {
    	    new_score += 10000;
    	  }
    	}
			if (nSitesDone === g_two_team_site) {
				var score_before = new_score;
				new_score += 1000000 * ((team1.nTwoTeamSite+1) * ((team1.nTwoTeamSite+1)));
				new_score += 1000000 * ((team2.nTwoTeamSite+1) * ((team2.nTwoTeamSite+1)));
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
      //if (prev_sites[2] == 7 && prev_sites[1] == 5 && prev_sites[0] == 0)
      //  logDebug('[0, 5, 7] - ' + new_score);
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
          //logDebug('new low score: ' + new_score + ', ' + set);
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
			if (nSitesDone === g_two_team_site) {
				--team1.nTwoTeamSite;
				--team2.nTwoTeamSite;
			}
  	  stopTime('decrement');
    }
  }
}

// 5th version based on just squaring the # of times played
function TeamScore5(team) {
	var sqrTotal = 0;
	var timesPlayedTeam = team.timesPlayedTeam;
	for(var nTeam = 0; nTeam < g_nTeams; ++nTeam) {
    var newNumber = timesPlayedTeam[nTeam];
    sqrTotal += newNumber * newNumber;
	}
	// severely penalize combos that give a single team
	// multiple byes or times in a two-team site
  if (team.nByes > 1)
	  sqrTotal += (10000 * (team.nByes - 1));
	if (team.nTwoTeamSite)
		sqrTotal += (1000000 * (team.nTwoTeamSite * team.nTwoTeamSite));
  return sqrTotal;
}

// augment the 5th version by providing the diff
// between the current # of times played and the next one
function TeamScoreDiff(nTimesPlayed) {
  var newTimesPlayed = nTimesPlayed + 1;
  return (newTimesPlayed * newTimesPlayed) - (nTimesPlayed * nTimesPlayed);
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