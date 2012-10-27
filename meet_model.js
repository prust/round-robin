$(function() {
  window.Round = Backbone.Model.extend({
    initialize: function() {
      _(g_aTeams).invoke('applySet', this.get('set'));
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
      this.rounds = new Rounds(null, {'meet_id': attributes.id});
      this.rounds.fetch();
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

      var data = {
        'all_sets': g_all_sets,
        'teams': g_aTeams,
        'prev_sets': this.rounds.invoke('get', 'set')
      };

      if (window.genRound) {
        genRound(data, this.applyNewSet.bind(this));
      }
      else {
        try {
          var worker = new Worker('generator_worker.js?cache_buster=' + Math.random());
        }
        catch(ex) {
          alert("Unable to create worker thread, verify that you are not on a file:// protocol.")
          return;
        }
        worker.onmessage = function(event) {
          this.applyNewSet(event.data);
        }.bind(this);
        worker.onerror = function(error) {
          alert('There was an error:');
          alert(error.message);
        };
        worker.postMessage(data);
      }      
    },
    applyNewSet: function(data) {
      var best_set = randomizePositions(data.best_set);
      if (!best_set)
        throw new Error('no best_set returned');
      
      this.rounds.create({'set': best_set, 'meet_id': this.id});
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
});