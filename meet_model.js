$(function() {
  window.Round = Backbone.Model.extend({
    initialize: function() {
      
    },
    clear: function() {
      this.destroy();
      this.view.remove();
    }
  });
  
  window.Rounds = Backbone.Collection.extend({
    model: Round,
    localStorage: new Store('rounds'),
    initialize: function(models, options) {
      this.filters = {
        'meet_id': options.meet_id
      };
    }
  });
  
  window.Meet = Backbone.Model.extend({
    initialize: function(attributes) {
      this.cancel = false;
      this.rounds = new Rounds(null, {'meet_id': attributes.id});
      this.rounds.fetch();
    },
    cancel: function() {
      this.cancel = true;
    },
    generateRound: function() {
      // TODO: Run the competition reports in the app_view after generating or
      // loading a meet, based on all loaded meets instead of based on globals
      
      // TODO: we should do balancing for picking the last set of a meet
      // Q: Instead of, or in addition to, pickByLookahead? Prob instead of?
      
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

      genBestSets(null, _.bind(function(best_sets) {
        // instead of just picking one at random, we clear out the data & start
        // over with JUST THIS MEET, so we also have a well-balanced meet
        //var balancedSets = pickBalancedSets(best_sets, team_names);
        
        pickByLookahead(best_sets, _.bind(function(best_sets) {
          var best_set = chooseRandomItem(best_sets);
          this.rounds.create({'set': best_set, 'meet_id': this.id});
          ApplySet(best_set);
      	}, this));
      }, this));
    },
    clear: function() {
      this.destroy();
      this.view.remove();
    }
  });
  
  window.MeetList = Backbone.Collection.extend({
    model: Meet,
    localStorage: new Store('meets')
  });
  
  window.Meets = new MeetList;
});