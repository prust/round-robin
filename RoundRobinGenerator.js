var g_aTeams, g_aSites;
var g_aCombos = [];
var g_aSets = [];
var g_nDebug = 0;
var fnZero = function() { return 0; }
var fnSortTeams = function(a, b) { TeamScore(b)-TeamScore(a); }

// it's great that we're using the cubed deviations
// the next step to make it "correct" is to try every possible combination
// Might need to do it in Python or w/ progress indicator (not sure how long it would take) :-)

// Also better to grab the across-the-board mean deviation, rather than a per-team mean deviation (cache and re-calculate only when it might change)
// actually, based on the # of sites and # of teams per site, we can calculate what the mean will be after the current round and add that to the mean from previous meets

Event.observe(window, "load", function() {
	// g_aSites = ["Site 1", "Site 2", "Site 3", "Bye"];
	g_aSites = ["Site 1", "Site 2", "Site 3", "Site 4"];
	var nSite = 0;
	g_aSites = g_aSites.map(function(strName) {
		return { site: strName, nSite: nSite++, aTeams: new Array(), nMaxTeams: strName == "Site 4" ? 1 : 3 }; /*strName == "Bye" ? 1 : 3*/
	});
	g_aTeams = $("txtTeams").value.split(",").invoke("strip");
	var nTeam = 0;
	g_aTeams = g_aTeams.map(function(strName) {
		return { team: strName, nTeam: nTeam++, timesInSite: new Array(g_aSites.length).collect(fnZero), timesPlayedTeam: new Array(g_aTeams.length).collect(fnZero) };
	});
	
	// load up previous meet pairings, so we have a record of how many times each team has played each other team
	var aDecPairings = [["Speechless", "Redeemed", "Thyatira"], ["Splendiferous", "No Other Gospel", "Veritas"], ["UnderArmor", "The Faithful", "Bond Servants"], ["Walmart Smilies"],
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
	LoadMeetPairings(aFebPairings);
	
	g_aTeams = g_aTeams.without(GetTeam("Minus One"));
	g_aTeams = g_aTeams.without(GetTeam("UnderArmor"));
	g_aSites = g_aSites.without(g_aSites[3]);
	
	// display the result as JSON
	
	
	// sort teams based on score (major # = maxTimesPlayedTeam, minor # = number of times they've played that max
	/*for(var x = 1; x <= 5; ++x) {
		//g_nDebug = x;
		g_aTeams = g_aTeams.sortBy(TeamScore).reverse();
		//alert(Object.toJSON(g_aTeams.zip(g_aTeams.map(TeamScore))).gsub("\\], \\[", "],\n["));
		PlaceTeamsInSites();
		$("tbxSchedule").value += "Round " + x + "\n";
		g_aSites.each(function(site) {
			$("tbxSchedule").value += site.aTeams.pluck("team").join("\n") + "\n\n";
		});
		ClearSites();
	}*/
	
	var astr = [];
	CreateAllCombos();
	var nLowestScore = null;
	var objBestSet;
	
	// first & second algorithms (100 * nMax + nTimesMax and 100*(nMax-nMin)+nTimesMax+nTimesMin produced identical results)
	//ApplySet([[0, 1, 6, 2, 5, 7, 3, 8, 9], [0, 2, 6, 1, 8, 9, 3, 5, 7]]);
	//ApplySet([[0, 1, 9, 2, 6, 8, 3, 5, 7], [0, 2, 6, 1, 7, 8, 3, 5, 9]]);
	//ApplySet([[0, 3, 8, 1, 6, 7, 2, 5, 9]]);
	
	// third algorithm (deviations from average) produced better results
	ApplySet([[0, 1, 9, 2, 6, 8, 3, 5, 7], [0, 3, 6, 1, 5, 9, 2, 7, 8]]);
	ApplySet([[0, 1, 8, 2, 7, 9, 3, 5, 6], [0, 3, 6, 1, 2, 8, 5, 7, 9]]);
	ApplySet([[0, 2, 8, 1, 5, 9, 3, 6, 7]]);
	
	var nCombos = g_aCombos.length;
	// Calculates a Double Round
	/*for(var Round1 = 0; Round1 < nCombos; ++Round1) {
		for(var Round2 = 0; Round2 < nCombos; ++Round2) {
			var nScore = ScoreSet([g_aCombos[Round1], g_aCombos[Round2]]);
			if (nLowestScore == null || nScore < nLowestScore)
			{
				nLowestScore = nScore;
				objBestSet = [g_aCombos[Round1], g_aCombos[Round2]];
			}
		}
	}*/
	
	// Calculates a Single Round
	for(var Round1 = 0; Round1 < nCombos; ++Round1) {
		var nScore = ScoreSet([g_aCombos[Round1]]);
		if (nLowestScore == null || nScore < nLowestScore)
		{
			nLowestScore = nScore;
			objBestSet = [g_aCombos[Round1]];
		}
	}
	
	//var nSets = g_aSets.length;
	//for(var nSet = 0; nSet < 100; ++nSet) {
	//	astr.push(ScoreSet(g_aSets[nSet]) + ": " + Object.toJSON(g_aSets[nSet][0]) + " -- " + Object.toJSON(g_aSets[nSet][1]) + " -- " + Object.toJSON(g_aSets[nSet][2]));
	//}
	
	ApplySet(objBestSet);
	$("tbxSchedule").value = Object.toJSON(objBestSet) + "\n\n" + Object.toJSON(g_aTeams);
	
	//g_aSites.each(function(site) {
	//	$("tbxSchedule").value += site.aTeams.pluck("team").join("\n") + "\n\n";
	//});
		
	// display the result as JSON
	//alert(Object.toJSON(g_aTeams));
});

function ApplySet(aSet) {
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound)
	{
		var combo = aSet[nRound];
		IncrementTimesPlayed3(GetTeamByNum(combo[0]), GetTeamByNum(combo[1]), GetTeamByNum(combo[2]));
		IncrementTimesPlayed3(GetTeamByNum(combo[3]), GetTeamByNum(combo[4]), GetTeamByNum(combo[5]));
		IncrementTimesPlayed3(GetTeamByNum(combo[6]), GetTeamByNum(combo[7]), GetTeamByNum(combo[8]));
	}
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
	
	var nRounds = aSet.length;
	for(var nRound = 0; nRound < nRounds; ++nRound)
	{
		var combo = aSet[nRound];
		IncrementTimesPlayed3(aTeams[combo[0]], aTeams[combo[1]], aTeams[combo[2]]);
		IncrementTimesPlayed3(aTeams[combo[3]], aTeams[combo[4]], aTeams[combo[5]]);
		IncrementTimesPlayed3(aTeams[combo[6]], aTeams[combo[7]], aTeams[combo[8]]);
		/*var nCombos = combo.length;
		for(nCombo = 0; nCombo < nCombos; ++nCombo)
		{
			var nTeam = combo[nCombo];
			PlaceTeamInSite(aTeams[nTeam], g_aSites[Math.floor(nCombo / 3)]);
		}*/
		//ClearSites();
	}
	for (var nTeam = 0; nTeam < nTeams; ++nTeam)
		if (aTeams[nTeam])
			nScore += TeamScore(aTeams[nTeam]);
	return nScore;
}

function IncrementTimesPlayed3(team1, team2, team3)
{
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
	return g_aTeams.find(function(team) { return team.nTeam == nTeam; });
}

function PlaceTeamsInSites() {
	var aUnplacedTeams = g_aTeams.clone();
	
	// first, pleace the team that needs a Bye
	//var objByeTeam = GetTeamForSite(g_aSites[3]);
	//PlaceTeamInSite(objByeTeam, g_aSites[3]);
	//aUnplacedTeams = aUnplacedTeams.without(objByeTeam);
	
	// top teams get first pick of sites
	g_aTeams.each(function(team) {
		if (aUnplacedTeams.include(team)) {
			var site = ChooseSite(team);
			PlaceTeamInSite(team, site);
			aUnplacedTeams = aUnplacedTeams.without(team);
			
			// try all combinations of unplaced teams to fill out the rest of the site optimally
			var aBestCombo = [];
			var nLowestScore = 10000; // starting score way above any possible score
			aUnplacedTeams.each(function(secondTeam) {
				if (site.nMaxTeams < 2) {
					secondTeam = null;
					thirdTeam = null;
					aBestCombo = [];
				} else {
					aUnplacedTeams.each(function(thirdTeam) {
						if (site.nMaxTeams < 3) thirdTeam = null;
						if (secondTeam != thirdTeam || !thirdTeam) {
							var nScore = ScoreCombo(team, secondTeam, thirdTeam, site);
							if (nScore < nLowestScore) {
								nLowestScore = nScore;
								aBestCombo = [secondTeam];
								if (thirdTeam) aBestCombo.push(thirdTeam);
							}
						}
					});
				}
			});
			var aTeams = g_aTeams;
			var secondTeam = aBestCombo.length > 0 ? aBestCombo[0] : null;
			var thirdTeam = aBestCombo.length > 1 ? aBestCombo[1] : null;
			if (secondTeam) {
				PlaceTeamInSite(secondTeam, site);
				aUnplacedTeams = aUnplacedTeams.without(secondTeam);
			}
			if (thirdTeam) {
				PlaceTeamInSite(thirdTeam, site);
				aUnplacedTeams = aUnplacedTeams.without(thirdTeam);
			}
		}
	});
}

function PlaceTeamInSite(team, site) {
	site.aTeams.each(function(otherTeam) {
		IncrementTimesPlayed(team, otherTeam);
	});
	team.timesInSite[site.nSite]++;
	site.aTeams.push(team);
}

function ScoreCombo(team, secondTeam, thirdTeam, site) {
	var nScore = 0;
	nScore += team.timesPlayedTeam[secondTeam.nTeam];
	if (thirdTeam)
	{
		nScore = [nScore, team.timesPlayedTeam[thirdTeam.nTeam]].max() * 100;
		nScore += [nScore, team.timesPlayedTeam[thirdTeam.nTeam]].min()
	}
	return nScore;
	// increment the TimesPlayed, get the Team Score, then decrement it
	/*IncrementTimesPlayed(team, secondTeam);
	if (thirdTeam) {
		IncrementTimesPlayed(team, thirdTeam);
		IncrementTimesPlayed(secondTeam, thirdTeam);
	}
	nScore += TeamScore(team);
	nScore += TeamScore(secondTeam);
	if (thirdTeam) nScore += TeamScore(thirdTeam);
	DecrementTimesPlayed(team, secondTeam);
	if (thirdTeam) {
		DecrementTimesPlayed(team, thirdTeam);
		DecrementTimesPlayed(secondTeam, thirdTeam);
	}
	var nTimesInSite = Math.pow(TimesInSite(team, site) - GetAverageTimesInSite(site), 3) + Math.pow(TimesInSite(secondTeam, site) - GetAverageTimesInSite(site), 3);
	if (thirdTeam)
		nTimesInSite += Math.pow(TimesInSite(thirdTeam, site) - GetAverageTimesInSite(site), 3);
	var nSiteScore = nTimesInSite * 1000;
	return nScore + nSiteScore;*/
	/* else {
		return [TimesPlayed(team, secondTeam), TimesPlayed(team, thirdTeam), TimesPlayed(secondTeam, thirdTeam)].max() * 100 + TimesPlayed(team, secondTeam) + TimesPlayed(team, thirdTeam) + TimesPlayed(secondTeam, thirdTeam);
	}*/
}

function TimesInSite(team, site) {
	return team.timesInSite[site.nSite];
}

function TimesPlayed(team, secondTeam) {
	return team.timesPlayedTeam[secondTeam.nTeam];
}

function IncrementTimesPlayed(team, otherTeam) {
	otherTeam.timesPlayedTeam[team.nTeam]++;
	team.timesPlayedTeam[otherTeam.nTeam]++;
}

function DecrementTimesPlayed(team, otherTeam) {
	otherTeam.timesPlayedTeam[team.nTeam]--;
	team.timesPlayedTeam[otherTeam.nTeam]--;
}

function ChooseSite(team) {
	var aOpenSites = g_aSites.findAll(function (site) { return site.aTeams.length < site.nMaxTeams; });
	var nBestScore = aOpenSites.min(function(site) {
		var nScore = SiteScore(site, team);
		return nScore;
	});
	return aOpenSites.find(function(site) { return SiteScore(site, team) == nBestScore; });
}

// lowest score wins (high score is a bad thing)
function SiteScore(site, team) {
	if (site.nMaxTeams == 3) {
		// normal sites are just based on the number of times you've been in them
		return team.timesInSite[site.nSite];
	} else {
		// small sites (bye and 2-team sites) are weighted much more heavily and are compared with the other teams
		var dAverage = GetAverageTimesInSite(site);
		return (team.timesInSite[site.nSite] - dAverage)*100;
	}
}

function GetAverageTimesInSite(site) {
	var dSum = 0.0;
	g_aTeams.each(function(team) {
		dSum += team.timesInSite[site.nSite];
	});
	return dSum / g_aTeams.length;
}

function GetTeamForSite(site) {
	var nLowestTimes = 100;
	var objLowestTeam = null;
	g_aTeams.each(function(team) {
		if (team.timesInSite[site.nSite] < nLowestTimes) {
			nLowestTimes = team.timesInSite[site.nSite];
			objLowestTeam = team;
		}
	});
	return objLowestTeam;
}

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
	
	//var nTotalDeviation = 0;
	//var nAverage = nTotalTimesPlayed / 9.0;
	// cube the deviations, so the further ones are much more heinous
	//team.timesPlayedTeam.each(function(nTimes) { nTotalDeviation += Math.pow(Math.abs(nTimes - nAverage), 3); });
	
	//return nTotalDeviation;
}*/

function ClearSites() {
	var nSites = g_aSites.length;
	for (var nSite = 0; nSite < nSites; ++nSite)
		g_aSites[nSite].aTeams = [];
}