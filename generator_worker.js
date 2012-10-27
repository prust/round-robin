(function(root) {

if (root.importScripts) {
  importScripts('underscore.js');
  importScripts('team.js');
}
var _ = root._ || require('underscore.js');
var Team = root.Team || require('team.js');

// exposes to a web page and node
root.genRound = genRound;
// exposes as a web-worker via message passing
root.onmessage = function(event) {
  genRound(event.data);
};

var teams;

function genRound(data, callback) {
  var all_sets = data.all_sets;
  var remaining_sets = getRemaining(all_sets, data.prev_sets);
  teams = ensureTeamsInstantiated(data.teams);
  teams = _(teams).invoke('clone');
  prev_sets = data.prev_sets;
  
  var best_sets = trySiteCombos(remaining_sets);
  var lookahead_best_sets = pickByLookahead(best_sets, remaining_sets);
  
  var best_set = chooseRandomItem(lookahead_best_sets);
  (callback || root.postMessage)({
    'best_set': best_set
  });
};

function pickByLookahead(sets, remaining_sets) {
  var lookahead_best_sets = [];
  var nLowestScore = null;
  if (sets.length > 100)
    sets = chooseRandomItems(sets, 90);
  var nSets = sets.length;
  for (var nSet = 0; nSet < nSets; ++nSet) {
    var set = sets[nSet];
    applySet(set);
    
    var best_sets = trySiteCombos(remaining_sets);
    var nLSets = best_sets.length;
    for (var nLSet = 0; nLSet < nLSets; ++nLSet) {
      var lookahead_set = best_sets[nLSet];
      applySet(lookahead_set);
      var nScore = Math.round(scoreTeams() * 10);
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
      applySet(lookahead_set, true);
    }
    applySet(set, true);
  }
  return lookahead_best_sets;
}

function applySet(set, unapply) {
  var num_teams = teams.length;
  for (var team_num = 0; team_num < num_teams; ++team_num) {
    var team = teams[team_num];
    team.applySet(set, unapply);
  }
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

function trySiteCombos(sets) {
  var lowest_score = -1,
    best_sets = [],
    new_score;
  
  var num_sets = sets.length;
  for (var set_num = 0; set_num < num_sets; ++set_num) {
    var set = sets[set_num];
    applySet(set);
    var new_score = scoreTeams();
    applySet(set, true);

    if (lowest_score == -1 || new_score <= lowest_score) {
      if (new_score == lowest_score) {
        best_sets.push(set);
      }
      else if (lowest_score == -1 || new_score < lowest_score) {
        best_sets = [set];
        lowest_score = new_score;
      }
    }
  }
  return best_sets;
}

// we can't use _.difference b/c we need to do deep equality testing
function getRemaining(all_sets, prev_sets) {
  return _(all_sets).filter(function(set) {
    return !_(prev_sets).any(function(prev_set) {
      return _.isEqual(prev_set, set);
    });
  });
}

function getTwoTeamSiteID(teams) {
  var num_teams = _(teams).filter(function(team) { return team.active; }).length;
  if (num_teams % 3 == 2)
    return Math.ceil(num_teams / 3);
}

function scoreTeams() {
  var times_played = [];
  
  // get times played as flat array
  var nTeams = teams.length;
  for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
    var team = teams[nTeam];
    times_played = times_played.concat(team.timesPlayedTeam.slice(nTeam + 1))
  }

  // calculate mean
  var nTimes = times_played.length;
  var sum = 0;
  for (var nTime = 0; nTime < nTimes; ++nTime)
    sum += times_played[nTime];
  var mean = sum / nTimes;

  // sum the square of the deviations
  var score = 0;
  for (var nTime = 0; nTime < nTimes; ++nTime) {
    var deviation = mean - times_played[nTime];
    score += deviation * deviation;
  }

  // penalties for byes & times in a two-team-site
  for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
    var team = teams[nTeam];
    score += 10 * (team.nTwoTeamSite * team.nTwoTeamSite)
    score += 100 * (team.nByes * team.nByes);
  }

  return score;
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