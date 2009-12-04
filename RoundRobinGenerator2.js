var g_aTeams, g_aSites;
var g_aCombos = [];
var g_aSets = [];
var fnZero = function() { return 0; }

// it's great that we're using the deviations and trying every possible combination
// the next step is to webify it w/ a progress indicator or move it to Python

function GenerateRoundRobin() {
	g_aTeams = $("txtTeams").value.split(",").invoke("strip");
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
		
	var nSite = 0;
	g_aSites = g_aSites.map(function(strName) {
		return { site: strName, nSite: nSite++, aTeams: new Array(), nMaxTeams: strName != "Bye" && strName != "Site 4" ? 3 : g_aTeams.length - 9 };
	});
	
	var nTeam = 0;
	g_aTeams = g_aTeams.map(function(strName) {
		return { team: strName, nTeam: nTeam++, timesInSite: new Array(g_aSites.length).collect(fnZero), timesPlayedTeam: new Array(g_aTeams.length).collect(fnZero), nByes: 0 };
	});
	
	// load up previous meet pairings, so we have a record of how many times each team has played each other team
	/*var aDecPairings = [["Speechless", "Redeemed", "Thyatira"], ["Splendiferous", "No Other Gospel", "Veritas"], ["UnderArmor", "The Faithful", "Bond Servants"], ["Walmart Smilies"],
		["Bond Servants", "Veritas", "Redeemed"], ["Speechless", "The Faithful", "Splendiferous"], ["Thyatira", "No Other Gospel", "Walmart Smilies"], ["UnderArmor"],
		["Splendiferous", "Bond Servants", "Walmart Smilies"], ["Redeemed", "No Other Gospel", "UnderArmor"], ["Veritas", "Thyatira", "Speechless"], ["The Faithful"],
		["No Other Gospel", "UnderArmor", "Veritas"], ["Thyatira", "Bond Servants", "Walmart Smilies"], ["Splendiferous", "Redeemed", "The Faithful"], ["Speechless"],
		["The Faithful", "No Other Gospel", "Speechless"], ["Veritas", "UnderArmor", "Walmart Smilies"], ["Bond Servants", "Splendiferous", "Redeemed"], ["Thyatira"]];
	
	var aJanPairings = [["Bond Servants", "No Other Gospel", "Veritas"], ["Splendiferous", "Thyatira", "UnderArmor"], ["Walmart Smilies", "Speechless", "Redeemed"], ["The Faithful", "Minus One"],
		["Speechless", "Veritas", "UnderArmor"], ["Bond Servants", "No Other Gospel", "Thyatira"], ["Splendiferous", "Walmart Smilies", "Minus One"], ["Redeemed", "The Faithful"],
		["Splendiferous", "UnderArmor", "Speechless"], ["The Faithful", "Walmart Smilies", "Minus One"], ["Bond Servants", "No Other Gospel", "Veritas"], ["Thyatira", "Redeemed"],
		["Bond Servants", "Speechless", "UnderArmor"], ["Minus One", "Walmart Smilies", "Redeemed"], ["Thyatira", "The Faithful", "No Other Gospel"], ["Splendiferous", "Veritas"],
		["Minus One", "The Faithful", "Veritas"], ["Redeemed", "Bond Servants", "No Other Gospel"], ["Splendiferous", "Thyatira", "UnderArmor"], ["Walmart Smilies", "Speechless"]]

	var aFebPairings = [["Bond Servants", "Walmart Smilies", "The Faithful"], ["Veritas", "Splendiferous", "Redeemed"], ["UnderArmor", "Thyatira", "Speechless"], ["No Other Gospel"],
		["No Other Gospel", "Splendiferous", "Redeemed"], ["UnderArmor", "Walmart Smilies", "The Faithful"], ["Veritas", "Speechless", "Thyatira"], ["Bond Servants"],
		["UnderArmor", "Splendiferous", "Redeemed"], ["No Other Gospel", "Speechless", "Thyatira"], ["Bond Servants", "Walmart Smilies", "The Faithful"], ["Veritas"],
		["UnderArmor", "Veritas", "Thyatira"], ["Bond Servants", "Speechless", "The Faithful"], ["No Other Gospel", "Walmart Smilies", "Redeemed"], ["Splendiferous"],
		["No Other Gospel", "Walmart Smilies", "Speechless"], ["Bond Servants", "Splendiferous", "Thyatira"], ["UnderArmor", "Veritas", "The Faithful"], ["Redeemed"]]

	// increment times played, based on previous meet pairings
	LoadMeetPairings(aDecPairings);
	LoadMeetPairings(aJanPairings);
	LoadMeetPairings(aFebPairings);*/
	
	// remove the teams that aren't playing & sites that aren't playing
	//g_aTeams = g_aTeams.without(GetTeam("Minus One"));
	//g_aTeams = g_aTeams.without(GetTeam("UnderArmor"));
	//g_aSites = g_aSites.without(g_aSites[3]);
	
	var astr = [];
	CreateAllCombos();
	var nLowestScore = null;
	var objBestSet;
	
	// first & second algorithms (100 * nMax + nTimesMax and 100*(nMax-nMin)+nTimesMax+nTimesMin produced identical results)
	//ApplySet([[0, 1, 6, 2, 5, 7, 3, 8, 9], [0, 2, 6, 1, 8, 9, 3, 5, 7]]);
	//ApplySet([[0, 1, 9, 2, 6, 8, 3, 5, 7], [0, 2, 6, 1, 7, 8, 3, 5, 9]]);
	//ApplySet([[0, 3, 8, 1, 6, 7, 2, 5, 9]]);
	
	// third algorithm (deviations from average) produced better results - March, 2008
	//ApplySet([[0, 1, 9, 2, 6, 8, 3, 5, 7], [0, 3, 6, 1, 5, 9, 2, 7, 8]]);
	//ApplySet([[0, 1, 8, 2, 7, 9, 3, 5, 6], [0, 3, 6, 1, 2, 8, 5, 7, 9]]);
	//ApplySet([[0, 2, 8, 1, 5, 9, 3, 6, 7]]);
	
	// third algorithm
	// Regionals 2008, Rounds 1-6
	/*ApplySet([[0, 1, 4, 2, 3, 7, 5, 8, 9]]);
	ApplySet([[0, 2, 8, 1, 7, 9, 3, 4, 6]]);
	ApplySet([[0, 3, 5, 1, 2, 6, 4, 7, 8]]);
	ApplySet([[1, 3, 8, 2, 4, 9, 5, 6, 7]]);
	ApplySet([[0, 1, 7, 2, 4, 5, 3, 6, 9]]);
	
	// Regionals 2008, Rounds 5-10
	ApplySet([[0, 2, 9, 1, 3, 5, 4, 6, 8]]);
	ApplySet([[0, 5, 6, 1, 2, 8, 3, 7, 9]]);
	ApplySet([[0, 3, 4, 1, 5, 9, 6, 7, 8]]);
	ApplySet([[0, 6, 9, 2, 3, 8, 4, 5, 7]]);
	ApplySet([[0, 7, 8, 1, 4, 9, 2, 5, 6]]);
	
	// Regionals 2008 - Rounds 11-15
	ApplySet([[0, 1, 6, 2, 3, 7, 5, 8, 9]]);
	ApplySet([[0, 2, 4, 1, 3, 5, 6, 7, 9]]);
	ApplySet([[0, 3, 9, 1, 2, 7, 4, 5, 8]]);
	ApplySet([[0, 5, 7, 1, 4, 6, 2, 8, 9]]);
	ApplySet([[0, 1, 8, 2, 5, 6, 3, 4, 7]]);
	
	// Regionals 2008 - Rounds 16-20
	ApplySet([[0, 1, 2, 3, 6, 8, 4, 5, 9]]);
	ApplySet([[0, 3, 4, 2, 5, 7, 6, 8, 9]]);
	ApplySet([[1, 5, 8, 2, 3, 6, 4, 7, 9]]);
	ApplySet([[0, 6, 7, 1, 3, 9, 2, 4, 8]]);
	ApplySet([[0, 5, 9, 1, 4, 6, 3, 7, 8]]);*/
	
	// 2008, Oct quiz meet (6 rounds)
	ApplySet([[0, 1, 2, 3, 4, 5, 6, 7, 8], [0, 3, 6, 1, 4, 7, 2, 5, 8]]);
	ApplySet([[0, 4, 8, 1, 5, 6, 2, 3, 7], [0, 5, 7, 1, 3, 8, 2, 4, 6]]);
	ApplySet([[0, 1, 7, 2, 3, 8, 4, 5, 6], [0, 3, 5, 1, 4, 8, 2, 6, 7]]);
	
	var nCombos = g_aCombos.length;
	
	// Calculates a Double Round
	for(var Round1 = 0; Round1 < nCombos; ++Round1) {
		for(var Round2 = 0; Round2 < nCombos; ++Round2) {
			var nScore = ScoreSet([g_aCombos[Round1], g_aCombos[Round2]]);
			if (nLowestScore == null || nScore < nLowestScore)
			{
				nLowestScore = nScore;
				objBestSet = [g_aCombos[Round1], g_aCombos[Round2]];
			}
		}
	}
	
	// Calculates a Single Round
	/*for(var Round1 = 0; Round1 < nCombos; ++Round1) {
		var nScore = ScoreSet([g_aCombos[Round1]]);
		if (nLowestScore == null || nScore < nLowestScore)
		{
			nLowestScore = nScore;
			objBestSet = [g_aCombos[Round1]];
		}
	}*/
	
	ApplySet(objBestSet);
	//$("tbxSchedule").value = Object.toJSON(objBestSet) + "\n\n" + Object.toJSON(g_aTeams);
	
	//$("tbxSchedule").value = SetToString([[0, 1, 9, 2, 6, 8, 3, 5, 7], [0, 3, 6, 1, 5, 9, 2, 7, 8], [0, 1, 8, 2, 7, 9, 3, 5, 6], [0, 3, 6, 1, 2, 8, 5, 7, 9], [0, 2, 8, 1, 5, 9, 3, 6, 7]]);
	//$("tbxSchedule").value = SetToString([[0, 1, 4, 2, 3, 7, 5, 8, 9], [0, 2, 8, 1, 7, 9, 3, 4, 6], [0, 3, 5, 1, 2, 6, 4, 7, 8], [1, 3, 8, 2, 4, 9, 5, 6, 7], [0, 1, 7, 2, 4, 5, 3, 6, 9],
	//	[0, 2, 9, 1, 3, 5, 4, 6, 8], [0, 5, 6, 1, 2, 8, 3, 7, 9], [0, 3, 4, 1, 5, 9, 6, 7, 8], [0, 6, 9, 2, 3, 8, 4, 5, 7], [0, 7, 8, 1, 4, 9, 2, 5, 6],
	//	[0, 1, 6, 2, 3, 7, 5, 8, 9], [0, 2, 4, 1, 3, 5, 6, 7, 9], [0, 3, 9, 1, 2, 7, 4, 5, 8], [0, 5, 7, 1, 4, 6, 2, 8, 9], [0, 1, 8, 2, 5, 6, 3, 4, 7],
	//	[0, 1, 2, 3, 6, 8, 4, 5, 9], [0, 3, 4, 2, 5, 7, 6, 8, 9], [1, 5, 8, 2, 3, 6, 4, 7, 9], [0, 6, 7, 1, 3, 9, 2, 4, 8], [0, 5, 9, 1, 4, 6, 3, 7, 8]]);
	
	$("tbxSchedule").value = Object.toJSON(objBestSet) + "\n\n" + SetToString(objBestSet) + "\n\n" + Object.toJSON(g_aTeams);
}

function ApplySet(aSet) {
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound) {
		var combo = aSet[nRound];
		IncrementTimesPlayed3(GetTeamByNum(combo[0]), GetTeamByNum(combo[1]), GetTeamByNum(combo[2]));
		IncrementTimesPlayed3(GetTeamByNum(combo[3]), GetTeamByNum(combo[4]), GetTeamByNum(combo[5]));
		IncrementTimesPlayed3(GetTeamByNum(combo[6]), GetTeamByNum(combo[7]), GetTeamByNum(combo[8]));
		
		if (g_aSites[3] && g_aSites[3].strName == "Bye")
			combo[9].nByes += 1;
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
	for (var nTeam = 0; nTeam < nTeams; ++nTeam)
	{
		var team = g_aTeams[nTeam];
		aTeams[team.nTeam] = {team: team.team, nTeam: team.nTeam, timesInSite: team.timesInSite.clone(), timesPlayedTeam: team.timesPlayedTeam.clone()};
	}
	
	// simulate placing 9 teams in 9 sites
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound) {
		var combo = aSet[nRound];
		IncrementTimesPlayed3(aTeams[combo[0]], aTeams[combo[1]], aTeams[combo[2]]);
		IncrementTimesPlayed3(aTeams[combo[3]], aTeams[combo[4]], aTeams[combo[5]]);
		IncrementTimesPlayed3(aTeams[combo[6]], aTeams[combo[7]], aTeams[combo[8]]);
	}
	
	// add up the score
	for (var nTeam = 0; nTeam < nTeams; ++nTeam) {
		var team;
		if (team = aTeams[nTeam]) {
			if (team.nByes >= 2) return 10000; // severely penalize any combo that gives a single team multiple byes
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
	if (aTeamsUsed.length == 9) {
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
	if (!team) debugger;//throw new Error("Team not found: " + nTeam);
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

// second version (max-min)
/*function TeamScore(team) {
	//return 100 * team.timesPlayedTeam.max() + ("times that max has been played")
	var nMax = 0;
	var nMin = 1000;
	var nTimesMaxPlayed = 0;
	var nTimesMinPlayed = 0;
	var nTeams = team.timesPlayedTeam.length;
	for(var nTeam = 0; nTeam < nTeams; ++nTeam)
	{
		if (team.timesPlayedTeam[nTeam] > nMax)
		{
			nMax = team.timesPlayedTeam[nTeam];
			nTimesMaxPlayed = 0;
		}
		if (team.timesPlayedTeam[nTeam] < nMin)
		{
			nMin = team.timesPlayedTeam[nTeam];
			nTimesMinPlayed = 0;
		}
		if (team.timesPlayedTeam[nTeam] == nMax)
			++nTimesMaxPlayed;
		if (team.timesPlayedTeam[nTeam] == nMin)
			++nTimesMinPlayed;
	}

	return 10 * (nMax - nMin) + nTimesMaxPlayed + nTimesMinPlayed;
	
	// even older cube-of-the-deviations version
	//var nTotalDeviation = 0;
	//var nAverage = nTotalTimesPlayed / 9.0;
	// cube the deviations, so the further ones are much more heinous
	//team.timesPlayedTeam.each(function(nTimes) { nTotalDeviation += Math.pow(Math.abs(nTimes - nAverage), 3); });
	
	//return nTotalDeviation;
}*/
