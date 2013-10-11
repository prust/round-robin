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
  var remaining_sets = data.all_sets;//getRemaining(data.all_sets, data.prev_sets);
  teams = ensureTeamsInstantiated(data.teams);
  
  var best_sets = trySiteCombos(remaining_sets, data.depth || 1);
  
  var best_set = chooseRandomItem(best_sets);
  _.forEach(best_set, function(set) {
    applySet(set);
  });

  (callback || root.postMessage)({
    'best_set': best_set,
    'mean': mean(timesPlayedArr(teams)),
    'std_dev': stdDeviation(timesPlayedArr(teams))
  });
};

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

function trySiteCombos(remaining_sets, target_depth) {
  var lowest_score,
    best_sets = [],
    new_score;
  
  function goDeeper(remaining_sets, current_sets, depth) {
    var len = remaining_sets.length;
    for (var i = 0; i < len; ++i) {
      var set = remaining_sets[i];
      applySet(set);

      if (depth == target_depth) {
        var new_score = scoreTeams();
        if (lowest_score == null || new_score <= lowest_score) {
          var new_current = current_sets.slice();
          new_current.push(set);
          if (new_score == lowest_score) {
            best_sets.push(new_current);
          }
          else {
            best_sets = [new_current];
            lowest_score = new_score;
          }
        }
      }
      else {
        var new_remaining = remaining_sets.slice();
        new_remaining.splice(i, 1);
        var new_current = current_sets.slice();
        new_current.push(set);
        goDeeper(new_remaining, new_current, depth + 1);
      }

      applySet(set, true);
    }
  }
  goDeeper(remaining_sets, [], 1);
  return best_sets;
}

// this doesn't actually work b/c prev_set is not ordered
// and set appears to be ordered for each triad with the triads in reverse order
function getRemaining(all_sets, prev_sets) {
  console.log('all:', all_sets.length, 'prev:', prev_sets.length);
  var remaining = _(all_sets).filter(function(set) {
    return !_(prev_sets).any(function(prev_set) {
      //console.log('prev:', prev_set, 'set:', set);
      console.log(prev_set.toString(), set.toString());
      var is_eq = prev_set.toString() == set.toString(); //_.isEqual(prev_set, set);
      if (is_eq)
        console.log('is equal!');
      return is_eq;
    });
  });
  console.log('remaining:', remaining.length);
  return remaining;
}

function getTwoTeamSiteID(teams) {
  var num_teams = _(teams).filter(function(team) { return team.active; }).length;
  if (num_teams % 3 == 2)
    return Math.ceil(num_teams / 3);
}

function scoreTeams() {
  var score = stdDeviation(timesPlayedArr(teams));

  // penalties for byes & times in a two-team-site
  var nTeams = teams.length;
  for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
    var team = teams[nTeam];
    score += 20 * (team.nTwoTeamSite * team.nTwoTeamSite)
    score += 200 * (team.nByes * team.nByes);
  }

  return score;
}

function timesPlayedArr(teams) {
  var times_played = [];
  
  // get times played as flat array
  var nTeams = teams.length;
  for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
    var team = teams[nTeam];
    times_played = times_played.concat(team.timesPlayedTeam.slice(nTeam + 1))
  }
  return times_played;
}

// this is necessary if they're passed across a worker boundary
function ensureTeamsInstantiated(teams) {
  return _.map(teams, function(team) {
    if (team instanceof Team)
      return team.clone();
    else
      return Team.deserialize(team);
  });
}

function stdDeviation(arr) {
  var _mean = mean(arr);

  // sum the square of the deviations
  var sum_sq_diffs = 0;
  var len = arr.length;
  for (i = 0; i < len; ++i) {
    var diff = _mean - arr[i];
    sum_sq_diffs += diff * diff;
  }

  return Math.sqrt(sum_sq_diffs / len);
}
function mean(arr) {
  var sum = 0, len = arr.length;
  for (var i = 0; i < len; ++i)
    sum += arr[i];
  return sum / len;
}
var test_result = stdDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
if (test_result != 2)
  throw new Error('stdDeviation test fail: ' + test_result)

})(this);
