$(function() {
  window.MeetView = Backbone.View.extend({
    tagName: 'div',
    events: {
      'click #generate': 'generateRoundRobin',
      'click #cancel': 'cancel'
    },
    initialize: function() {
      _.bindAll(this, 'render');
      this.model.rounds.bind('add', this.render);
      this.model.bind('add', this.render);
      this.model.view = this;
    },
    render: function() {
      var html =
        '<label for="rounds">Number of Rounds: </label>' + 
		    '<select id="rounds">' + 
		    '  <option>1</option>' + 
		    '  <option>2</option>' + 
		    '  <option>3</option>' + 
		    '  <option>4</option>' + 
		    '  <option>5</option>' + 
		    '  <option>6</option>' + 
		    '  <option>7</option>' + 
		    '  <option>8</option>' + 
		    '  <option>9</option>' + 
		    '  <option>10</option>' + 
		    '  <option>11</option>' + 
		    '  <option>12</option>' + 
		    '  <option>13</option>' + 
		    '  <option>14</option>' + 
		    '  <option>15</option>' + 
		    '</select> ' + 
		    '<input id="generate" type="button" value="Generate" />' + 
		    '<span id="progress">&nbsp;</span>' + 
		    '<input id="cancel" type="button" value="Cancel" /><br />' + 
		    '<textarea id="schedule" rows="50" cols="150">';
		  var final_sets = this.model.rounds.pluck('set');
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
  	  html += results.join('\n');
		  html += '</textarea>';
		  $(this.el).html(html);
		  return this;
    },
    cancel: function() {
      this.model.cancel();
    },
    generateRoundRobin: function() {
      this.$('#generate').attr('disabled', 'disabled');
      var nRounds = parseInt(this.$('#rounds option:selected').val(), 10);
      this.model.generateRounds(nRounds);
    }
  });
});