(function(root) {

// pull in underscore if we're running in a worker or in node
if (root.importScripts) {
  importScripts('underscore.js');
  importScripts('team.js');
}
var _ = root._ || require('underscore.js');
var Team = root.Team || require('team.js');

// the round-robin generation engine can be called from a web page or node
root.genRound = genRound;
// or as a web-worker via message passing
root.onmessage = function(event) {
  genRound(event.data);
};

var teams,
    all_combos,
    lowest_score,
    best_sets;

function resetGlobals() {
  lowest_score = -1;
  best_sets = [];
}

function genRound(data, callback) {
  all_combos = data.combos;
  teams = ensureTeamsInstantiated(data.teams);
  teams = _(teams).invoke('clone');
  prev_sets = data.prev_sets;
  
  genBestSets(null);
  var lookahead_best_sets = pickByLookahead(best_sets);
  
  var best_set = chooseRandomItem(lookahead_best_sets);
  (callback || root.postMessage)({
    'best_set': best_set
  });
};

function genBestSets(set_to_apply) {
  if (set_to_apply)
    _(teams).invoke('applySet', set_to_apply);

  resetGlobals();
  trySiteCombos(all_combos, 0, []);
  
  if (set_to_apply)
    _(teams).invoke('applySet', set_to_apply, true);
}

function pickByLookahead(sets) {
  var lookahead_best_sets = [];
  var nLowestScore = null;
  if (sets.length > 100)
    sets = chooseRandomItems(sets, 90);
  var nSets = sets.length;
  for (var nSet = 0; nSet < nSets; ++nSet) {
    var set = sets[nSet];
    genBestSets(set);
    var nLSets = best_sets.length;
    for (var nLSet = 0; nLSet < nLSets; ++nLSet) {
      var lookahead_set = best_sets[nLSet];
      var nScore = Math.round(ScoreSet([_(set).flatten()], [_(lookahead_set).flatten()]) * 10);
      if (nLowestScore == null || nScore <= nLowestScore) {
        if (nScore == nLowestScore) {
          if (!_(lookahead_best_sets).include(set))
            lookahead_best_sets.push(set);
        }
        else {
          lookahead_best_sets = [set];
        }
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
  for(var nTeam = 0; nTeam < teams.length; ++nTeam)
    nSum += team.timesPlayedTeam[nTeam];
  var nMean = nSum / teams.length;
  for(var nTeam = 0; nTeam < teams.length; ++nTeam)
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
  array = _(array).clone();
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

    var nTeams = combo.length;
    var team1 = teams[combo[0]];
    var team2 = nTeams > 1 ? teams[combo[1]] : null;
    var team3 = nTeams > 2 ? teams[combo[2]] : null;
    
    // setup team #s
    var team1_nTeam = team1.nTeam;
    var team2_nTeam = team2 ? team2.nTeam : -1;
    var team3_nTeam = team3 ? team3.nTeam : -1;
       
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
		if (nSitesDone === getTwoTeamSiteID(teams)) {
			var score_before = new_score;
			new_score += 1000000 * ((team1.nTwoTeamSite+1) * ((team1.nTwoTeamSite+1)));
			new_score += 1000000 * ((team2.nTwoTeamSite+1) * ((team2.nTwoTeamSite+1)));
		}

    // recurse if there are nested combinations
    var nested_combo = getNestedCombos(combo);
    if (nested_combo && nested_combo.length) {
      // every single [..., [0, 5, 7] is too high to recurse, why are their scores in the 400s?
      //if (lowest_score != -1 && prev_sites.length == 6 && prev_sites[0][2] == 7 && prev_sites[0][1] == 5 && prev_sites[0][0] == 0)
      //  logDebug('[0, 5, 7] - ' + new_score + ', lowest_score: ' + lowest_score + ', ' + prev_sites);
      if (lowest_score == -1 || new_score <= lowest_score) {
        // could streamline by doing "new_prev_sites.push(combo);"
        var new_prev_sites = [].concat(prev_sites);
				new_prev_sites.push([combo[0], combo[1], combo[2]]);
        trySiteCombos(nested_combo, new_score, new_prev_sites);
      }
    }
    
    // if we're at a leaf-node, possibly add to list of best scores
    if (isLeafNode(combo)) {
      if (lowest_score == -1 || new_score <= lowest_score) {
        var set = [].concat(prev_sites);
        set.push(combo.slice(0, 3));
        if (!isRepeat(set)) {
          if (new_score == lowest_score) {
            best_sets.push(set);
          }
          else if (lowest_score == -1 || new_score < lowest_score) {
            best_sets = [set];
            lowest_score = new_score;
            //logDebug('new low score: ' + new_score + ', ' + set);
          }
        }
      }
    }
  }
}

function isRepeat(set) {
  return _(prev_sets).any(function(prev_set) {
    return _(set).isEqual(prev_set);
  });
}

function getTwoTeamSiteID(teams) {
  var num_teams = _(teams).filter(function(team) { return team.active; }).length;
  if (num_teams % 3 == 2)
    return Math.ceil(num_teams / 3);
}

function getNestedCombos(combo) {
  return combo[3];
}
// the previous check we were doing, nSitesDone == num_sites
// wasn't accurate when there are 10 teams, due to the lack of a "bye" site
function isLeafNode(combo) {
  return !getNestedCombos(combo);
}

// 5th version based on just squaring the # of times played
function TeamScore5(team) {
	var sqrTotal = 0;
	var timesPlayedTeam = team.timesPlayedTeam;
	for(var nTeam = 0; nTeam < teams.length; ++nTeam) {
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

// this is necessary if they're passed across a worker boundary
function ensureTeamsInstantiated(teams) {
  return teams.map(function(team) {
    if (!(team instanceof Team))
      team = Team.deserialize(team);
    return team;
  });
}

})(this);