var g_aTeams, g_aSites;
var g_aCombos = [];
var g_aSets = [];
var fnZero = function() { return 0; }

// it's great that we're using the deviations and trying every possible combination
// the next step is to webify it w/ a progress indicator or move it to Python

function GenerateRoundRobin(nRounds) {
	g_aTeams = $("txtTeams").value.split(",").invoke("strip");
	
	// hydrate the teams
	var nTeam = 0;
	g_aTeams = g_aTeams.map(function(strName) {
		return { team: strName, nTeam: nTeam++, timesPlayedTeam: new Array(g_aTeams.length).collect(fnZero), nByes: 0 };
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
	
	// hydrate the sites
	var nSite = 0;
	g_aSites = g_aSites.map(function(strName) {
		return { site: strName, nSite: nSite++, aTeams: new Array(), nMaxTeams: strName != "Bye" && strName != "Site 4" ? 3 : g_aTeams.length - 9 };
	});
	
	g_aTeams.each(function(team) {
		team.timesInSite = new Array(g_aSites.length).collect(fnZero);
	});
	
	var astr = [];
	CreateAllCombos();
	var nLowestScore = null;
	var objBestSet;
	
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
	ApplySet([[0, 1, 2, 3, 4, 5, 6, 7, 8], [0, 3, 6, 1, 4, 7, 2, 5, 8]]);
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
	
	var previous_rounds = [Object.toJSON(round1), Object.toJSON(round2), Object.toJSON(round3), Object.toJSON(round4)];
	// guess I need to code it to avoid duplicates from the same meet
	
	var nCombos = g_aCombos.length;
	// Calculate a Single Round
	if (nRounds == 1) {
		for(var Round1 = 0; Round1 < nCombos; ++Round1) {
			var nScore = ScoreSet([g_aCombos[Round1]]);
			
			// will no longer do duplicates
			if ((nLowestScore == null || nScore <= nLowestScore) && !previous_rounds.include(Object.toJSON(g_aCombos[Round1]))) {
				nLowestScore = nScore;
				objBestSet = [g_aCombos[Round1]];
			}
		}
	}
	// Calculate a Double Round
	else if (nRounds == 2) {
		for(var Round1 = 0; Round1 < nCombos; ++Round1) {
			for(var Round2 = 0; Round2 < nCombos; ++Round2) {
				var nScore = ScoreSet([g_aCombos[Round1], g_aCombos[Round2]]);
				if (nLowestScore == null || nScore < nLowestScore) {
					nLowestScore = nScore;
					objBestSet = [g_aCombos[Round1], g_aCombos[Round2]];
				}
			}
		}
	}
	
	ApplySet(objBestSet);

	$("tbxSchedule").value = Object.toJSON(objBestSet) + "\n\n" + SetToString(objBestSet) + "\n\n" + CompetitionReport(g_aTeams) + '\n\n' + ByeReport(g_aTeams);
}

function ApplySet(aSet) {
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound) {
		var combo = aSet[nRound];
		IncrementTimesPlayed3(GetTeamByNum(combo[0]), GetTeamByNum(combo[1]), GetTeamByNum(combo[2]));
		IncrementTimesPlayed3(GetTeamByNum(combo[3]), GetTeamByNum(combo[4]), GetTeamByNum(combo[5]));
		IncrementTimesPlayed3(GetTeamByNum(combo[6]), GetTeamByNum(combo[7]), GetTeamByNum(combo[8]));
		
		if (combo.length == 10)
			GetTeamByNum(combo[9]).nByes += 1;
	}
}

function SetToString(aSet) {
	var nRounds = aSet.length;
	var astr = [];
	for(var nRound = 0; nRound < nRounds; ++nRound)
	{
		var combo = aSet[nRound];
		astr.push("Round " + (nRound + 1));
		astr.push(combo.map(GetTeamByNum).pluck("team").join("\n") + "\n");
	}
	return astr.join("\n");
}

function ScoreSet(aSet) {
	var nScore = 0;
	var aTeams = [null, null, null, null, null, null, null, null, null, null, null, null, null];
	
	// deep copy all the teams
	var nTeams = g_aTeams.length;
	for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
		var team = g_aTeams[nTeam];
		aTeams[team.nTeam] = {team: team.team, nTeam: team.nTeam, timesInSite: team.timesInSite.clone(), timesPlayedTeam: team.timesPlayedTeam.clone(), nByes: team.nByes };
	}
	
	// simulate placing 9 teams in 9 sites
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound) {
		var combo = aSet[nRound];
		IncrementTimesPlayed3(aTeams[combo[0]], aTeams[combo[1]], aTeams[combo[2]]);
		IncrementTimesPlayed3(aTeams[combo[3]], aTeams[combo[4]], aTeams[combo[5]]);
		IncrementTimesPlayed3(aTeams[combo[6]], aTeams[combo[7]], aTeams[combo[8]]);
		
		if (combo.length == 10)
			aTeams[combo[9]].nByes += 1;
	}
	
	// add up the score
	for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
		var team;
		if (team = aTeams[nTeam]) {
			if (team.nByes >= 2) nScore += 10000; // severely penalize any combo that gives a single team multiple byes
			nScore += TeamScore(team);
		}
	}
	return nScore;
}

function IncrementTimesPlayed3(team1, team2, team3)
{
	team1.timesInSite[0]++;
	team2.timesInSite[1]++;
	team3.timesInSite[2]++;
	IncrementTimesPlayed(team1, team2);
	IncrementTimesPlayed(team2, team3);
	IncrementTimesPlayed(team1, team3);
}

function CreateAllCombos() {
	AddToCombo([], g_aTeams.pluck("nTeam"));
}

function AddToCombo(aTeamsUsed, aTeamsLeft) {
	if (aTeamsUsed.length == g_aTeams.length) {
		// we're at the tail, pop 'em onto the global
		g_aCombos.push(aTeamsUsed);
	} else {
		var nTeams = aTeamsLeft.length;
		for(var nTeam = 0; nTeam < nTeams; ++nTeam) {
			var team = aTeamsLeft[nTeam];
			
			// force ascending order within a triad to eliminate duplicates
			if ((aTeamsUsed.length % 3 == 0) || (team > aTeamsUsed[aTeamsUsed.length - 1]))
			{
				// force ascending order between triads to eliminate duplicate triads
				if ((aTeamsUsed.length != 3 || team > aTeamsUsed[0]) && (aTeamsUsed.length != 6 || team > aTeamsUsed[3]))
				{
					// clone and push this team on
					var aTeams = [].concat(aTeamsUsed);
					aTeams.push(team);
					
					// clone and remove this team
					var aTeams2 = [].concat(aTeamsLeft);
					aTeams2.splice(nTeam, 1);
					
					// recurse
					AddToCombo(aTeams, aTeams2);
				}
			}
		}
	}
}


// increment times played, based on previous meet pairings
function LoadMeetPairings(aMeetPairings) {
	aMeetPairings.each(function(match) {
		// get actual team object (not just strings)
		aobjTeams = match.map(function(strName) {
			var objTeam = GetTeam(strName);
			if (!objTeam) alert("Team not found: '" + strName + "'!");
			return objTeam;
			});
		if (aobjTeams.length > 1) {
			// there are multiple teams, so increment the # of times they've played each other
			aobjTeams.each(function (team) {
				aobjTeams.each(function (otherTeam) {
					if (team != otherTeam)
						IncrementTimesPlayed(team, otherTeam);
				});
			});
		} else {
			// there's just one team, so it's a Bye, increment its time in the last site
			aobjTeams[0].timesInSite[3]++;
		}
	});
}

function GetTeam(strName) {
	return g_aTeams.find(function(team) { return team.team == strName; });
}
function GetTeamByNum(nTeam) {
	var team = g_aTeams.find(function(team) { return team.nTeam == nTeam; });
	if (!team) throw new Error("Team not found: " + nTeam);
	return team;
}

function IncrementTimesPlayed(team, otherTeam) {
	otherTeam.timesPlayedTeam[team.nTeam]++;
	team.timesPlayedTeam[otherTeam.nTeam]++;
}

// Third version (sum of deviations from the mean)
function TeamScore(team) {
	var nSum = 0;
	var nDeviations = 0;
	var nTeams = team.timesPlayedTeam.length;
	for(var nTeam = 0; nTeam < nTeams; ++nTeam)
		nSum += team.timesPlayedTeam[nTeam];
	var nMean = nSum / nTeams;
	for(var nTeam = 0; nTeam < nTeams; ++nTeam)
		nDeviations += Math.abs(nMean - team.timesPlayedTeam[nTeam])
	return nDeviations;
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