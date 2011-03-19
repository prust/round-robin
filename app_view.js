$(function() {
  window.AppView = Backbone.View.extend({
    el: $('#round-robin-app'),
    events: {
      'click #generate': 'generateRoundRobin',
      'click #cancel': 'cancel'
    },
    initialize: function() {
      this.cancel = false;
    },
    render: function() {
      
    },
    cancel: function() {
      this.cancel = true;
    },
    generateRoundRobin: function() {
      this.$('#generate').attr('disabled', 'disabled');
      var nRounds = parseInt(this.$('#rounds option:selected').val(), 10);
      var team_names = _(this.$('#teams').val().split(",")).map($.trim);
      
      GlobalSetup(team_names);
      
      // TODO: balancing may be of minimal value, only look at it at the end
      
      // Initially, the user can just enter a # of sets (15, for instance)
      // and all get generated.
      // Eventually, the user *could* enter the # per day or per meet
      // and it could "balance" per day or meet
      
      // This script & the other should share the same score generator function
      // (this page can & should include the other page)
      // The scoring algorithm should be pluggable & have lots of tests
      
      // Eventually, it would present the results in an EditableTable
      // that prints as nicely as Excel, yet supports CSS & even jQuery customization
      // but is editable & saved via localStorage for subsequent runs
      // and the software could deal graciously with teams being added/deleted
      
      var final_sets = [];
      
      var tryNextSet = _.bind(function() {
        if (this.cancel)
          return alert('Round-Robin Generation Cancelled');
        
        genBestSets(null, _.bind(function(best_sets) {
          // instead of just picking one at random, we clear out the data & start
          // over with JUST THIS MEET, so we also have a well-balanced meet
          //var balancedSets = pickBalancedSets(best_sets, team_names);
          
          pickByLookahead(best_sets, team_names, _.bind(function(best_sets) {
            var best_set = chooseRandomItem(best_sets);
            final_sets.push(best_set);
            ApplySet(best_set);
          	
          	if (final_sets.length < nRounds) {
          	  tryNextSet();
          	}
          	else {
          	  var results = [];
          	  results = results.concat(_(final_sets).map(JSON.stringify));
            	results.push('\n');
            	var nRound = 1;
            	results = results.concat(_(final_sets).map(function(set) {
            	  return 'Round ' + (nRound++) + '\n' + SetToString(set);
            	}));
            	results.push('\n');
            	results.push(CompetitionReport(g_aTeams));
            	results.push('\n');
            	results.push(TwoTeamSiteReport(g_aTeams));
            	results.push('\n');
            	results.push(ByeReport(g_aTeams));
            	results.push('\n');
          	  this.$("#schedule").val(results.join('\n'));
          	}
        	}, this));
        }, this));
      }, this);
      
      tryNextSet();
    }
  });
  window.App = new AppView;
});