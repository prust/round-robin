(function(root) {

if (root.importScripts)
  importScripts('underscore.js');

var teams, g_lowest_score, g_best_sets, g_two_team_site, g_current_combo_num, g_nTeams, g_nSites, g_aCombos;

root.onmessage = function(event) {
  root.genRound(event.data);
};

// the round-robin generation engine can be called directly
// via genRound() or as a web-worker w/ message posting
root.genRound = function genRound(data, callback) {
  teams = deepClone(data.g_aTeams);
  g_two_team_site = data.g_two_team_site;
  g_current_combo_num = data.g_current_combo_num;
  g_nTeams = data.g_nTeams;
  g_nSites = data.g_nSites;
  g_aCombos = data.combos;
  g_best_sets = [];
  g_lowest_score = -1;
  
  var best_sets = genBestSets(null);
  best_sets = pickByLookahead(best_sets);
  
  var best_set = chooseRandomItem(best_sets);
  best_set = randomizePositions(best_set);
  (callback || root.postMessage)({
    'best_set': best_set
  });
}

function randomizePositions(best_set) {
  // if last item has 1 team (bye) or 2 teams (2-team site) long, keep it at end
  var last_item = best_set[best_set.length-1];
  var is_bye_or_two_team = last_item.length < 3;
  if (is_bye_or_two_team)
    best_set.splice(best_set.length-1, 1);
  
  best_set = _.shuffle(best_set.map(function(triad) {
    return _.shuffle(triad);
  }));

  if (is_bye_or_two_team)
    best_set.push(last_item);
  return best_set;
}

function genBestSets(set_to_apply) {
  if (set_to_apply)
    ApplySetNew(set_to_apply);
  trySiteCombos(g_aCombos, 0, []);
  return g_best_sets;
}

function pickByLookahead(sets) {
  var lookahead_best_sets = [];
  var nLowestScore = null;
  if (sets.length > 100)
    sets = chooseRandomItems(sets, 90);
  var nSets = sets.length;
  for (var nSet = 0; nSet < nSets; ++nSet) {
    var set = sets[nSet];
    var lookahead_sets = genBestSets(set);
    var nLSets = lookahead_sets.length;
    for (var nLSet = 0; nLSet < nLSets; ++nLSet) {
      var lookahead_set = lookahead_sets[nLSet];
      var nScore = Math.round(ScoreSet([_(set).flatten()], [_(lookahead_set).flatten()]) * 10);
      if (nLowestScore == null || nScore <= nLowestScore) {
        if (nScore == nLowestScore && !_(lookahead_best_sets).include(set))
          lookahead_best_sets.push(set);
        else
          lookahead_best_sets = [set];
        nLowestScore = nScore;
      }
    }
  }
  return lookahead_best_sets;
}

/*
ScoreSet(aSet[, aSet2])

Calculates scores of one (or possibly a sequence of sequential sets)
by temporarily making it seem as though the teams all played each-other,
adding up the score, and then decrementing to return the teams to their original
state.

TODO: wouldn't it be simpler to just clone the teams & increment the clones?

*/
function ScoreSet(aSet, aSet2) {
  var nScore = 0;
  
  // simulate placing 9 teams in 9 sites
  var nRounds = aSet.length;
  for(var nRound = 0; nRound < nRounds; ++nRound) {
    var combo = aSet[nRound];
    IncrementTimesPlayed3(teams[combo[0]], teams[combo[1]], teams[combo[2]]);
    IncrementTimesPlayed3(teams[combo[3]], teams[combo[4]], teams[combo[5]]);

    if (combo.length == 7) {
      teams[combo[6]].nByes += 1;
    }
    else {
      IncrementTimesPlayed3(teams[combo[6]], teams[combo[7]], teams[combo[8]]);
      
      if (combo.length == 10)
        teams[combo[9]].nByes += 1;
    }
  }
  
  // if there's only 1 set, add up the score
  // else if there's a 2nd set, recurse & take *that* score
  if (!aSet2) {
    var nTeams = teams.length;
    for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
      var team;
      if (team = teams[nTeam])
        nScore += TeamScore(team);
    }
    // we have to round b/c (unbelievably) there are random differences with
    // scores like 28.8000000000005 & 28.8 and we want them treated the same
    nScore = Math.round(nScore * 10)
  }
  else {
    nScore = ScoreSet(aSet2);
  }
  
  // simulate placing 9 teams in 9 sites
  var nRounds = aSet.length;
  for(var nRound = 0; nRound < nRounds; ++nRound) {
    var combo = aSet[nRound];
    DecrementTimesPlayed3(teams[combo[0]], teams[combo[1]], teams[combo[2]]);
    DecrementTimesPlayed3(teams[combo[3]], teams[combo[4]], teams[combo[5]]);

    if (combo.length == 7) {
      teams[combo[6]].nByes -= 1;
    }
    else {
      DecrementTimesPlayed3(teams[combo[6]], teams[combo[7]], teams[combo[8]]);
      
      if (combo.length == 10)
        teams[combo[9]].nByes -= 1;
    }
  }
  
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
  
  // severely penalize any combo that gives a single team multiple byes
  nDeviations += 10000 * (team.nByes * team.nByes - 1);

  return nDeviations;
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

function chooseRandomItem(array, remove) {
  var num_items = array.length;
  var random_item_num = Math.floor(Math.random() * num_items);
  var item = array[random_item_num];
  array.splice(random_item_num, 1);
  return item;
}

function chooseRandomItems(array, num_items) {
  array = array.slice(); // clone
  var random_items = [];
  while (random_items.length < num_items)
    random_items.push(chooseRandomItem(array, true));
  return random_items;
}

function trySiteCombos(combos, nCumulativeScore, prev_sites) {  
  // all the sites we've done so far, including this one
  var nSitesDone = prev_sites.length + 1;
    
  var nCombos = combos.length;
  for (var nCombo = 0; nCombo < nCombos; ++nCombo) {
    var combo = combos[nCombo];
    var new_score = nCumulativeScore;
    // setup teams
    startTime('setup teams');
    var nTeams = combo.length;
    var team1 = teams[combo[0]];
    var team2 = nTeams > 1 ? teams[combo[1]] : null;
    var team3 = nTeams > 2 ? teams[combo[2]] : null;
    
    // setup team #s
    var team1_nTeam = team1.nTeam;
    var team2_nTeam = team2 ? team2.nTeam : -1;
    var team3_nTeam = team3 ? team3.nTeam : -1;
    stopTime('setup teams');
       
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

    // recurse if there are nested combinations
    var nested_combo = getNestedCombos(combo);
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
    
    // if we're at a leaf-node, possibly add to list of best scores
    if (isLeafNode(combo)) {
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
  }
}

function getNestedCombos(combo) {
  return combo[3];
}
// the previous check we were doing, nSitesDone == g_nSites
// wasn't accurate when there are 10 teams, due to the lack of a "bye" site
function isLeafNode(combo) {
  return !getNestedCombos(combo);
}

// 5th version based on just squaring the # of times played
function TeamScore5(team) {
	var sqrTotal = 0;
	var timesPlayedTeam = team.timesPlayedTeam;
	for(var nTeam = 0; nTeam < g_nTeams; ++nTeam) {
    var newNumber = timesPlayedTeam[nTeam];
    sqrTotal += newNumber * newNumber;
	}
	
	// multiple byes or times in a two-team site
  // severely penalize any combo that gives a single team multiple byes
	nDeviations += 10000 * (team.nByes * team.nByes - 1);
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

function ApplySetNew(set) {
	var nSites = set.length;
	for(var nSite = 0; nSite < nSites; ++nSite) {
		var combo = set[nSite];
		
		// this is IDENTICAL to above, see if we can't make it a function?
		// and pass in "+1" or "-1" for increment and decrement?
		// setup teams
    var nTeams = combo.length;
    var team1 = teams[combo[0]];
    var team2 = nTeams > 1 ? teams[combo[1]] : null;
    var team3 = nTeams > 2 ? teams[combo[2]] : null;
    
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

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
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

})(this);