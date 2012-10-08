$(function() {
  window.MeetView = Backbone.View.extend({

    'tagName': 'div',
    'events': {
      'click #generate': 'generateRoundRobin',
    },

    'initialize': function initialize() {
      _.bindAll(this, 'render');
      this.model.rounds.bind('add', this.render);
      this.model.bind('add', this.render);
      this.model.view = this;
      this.teams = g_aTeams;
    },

    'render': function render() {
      $(this.el).empty();
      this.renderGenerateBtn();
      this.renderRoundRobin();
      this.renderCompetitionReport();
      this.renderTwoTeamSiteReport();
      this.renderByeReport();
      return this;
    },

    'renderGenerateBtn': function renderGenerateBtn() {
      this.append($('<input id="generate" type="button" value="Add Round" />'));
    },

    'renderRoundRobin': function renderRoundRobin() {
      this.renderHeader('Round-Robin Schedule');

      var round_nums = _.range(1, this.model.rounds.length + 1);
      var col_headings = round_nums.map(function(round) { return 'Round ' + round; });

      var rows = [];
      var blank_row = [];
      _.range(g_nSites).forEach(function(site_num) {
        _.range(3).forEach(function(team_position) {
          rows.push(this.model.rounds.pluck('set').map(function(sites) {
            var team_num = sites[site_num][team_position];
            if (team_num == null)
              return '';
            else
              return GetTeamByNum(team_num).team;
          }.bind(this)));
        }.bind(this));
        rows.push(blank_row);
      }.bind(this));

      this.renderTable(col_headings, rows);
    },

    'renderCompetitionReport': function renderCompetitionReport() {
      this.renderHeader('Competition Matrix');
      this.renderReport([''].concat(_(this.teams).pluck('team')), function(team) {
        return [team.team].concat(team.timesPlayedTeam);
      });
    },

    'renderTwoTeamSiteReport': function renderTwoTeamSiteReport() {
      if (!this.anyTeamsInTwoTeamSite())
        return;

      this.renderHeader('Number of times in a 2-team site');
      this.renderReport(['Team', '# times in 2-team site'], function(team) {
        return [team.team, team.nTwoTeamSite];
      });
    },

    'anyTeamsInTwoTeamSite': function anyTeamsInTwoTeamSite() {
      return _(this.teams).any(function(team) {
        return team.nTwoTeamSite;
      });
    },

    'renderByeReport': function renderByeReport() {
      if (!this.anyTeamsWithByes())
        return;

      this.renderHeader('Number of byes');
      this.renderReport(['Team', '# byes'], function(team) {
        return [team.team, team.nByes];
      });
    },

    'anyTeamsWithByes': function anyTeamsWithByes() {
      return _(this.teams).any(function(team) {
        return team.nByes;
      });
    },

    'renderReport': function renderReport(headers, row_generator) {
      this.renderTable(headers, this.teams.map(row_generator));
    },

    'renderTable': function renderTable(headers, rows) {
      var table = $('<table>');
      var thead_row = $('<thead>').append($('<tr>'));
      headers.forEach(function(header) {
        thead_row.append($('<th>').text(header));
      });
      table.append(thead_row);
      
      var tbody = $('<tbody>');
      rows.forEach(function(row) {
        var tr = $('<tr>');
        row.forEach(function(cell) {
          tr.append($('<td>').text(cell));
        });
        tbody.append(tr);
      });
      table.append(tbody);

      this.append(table);
    },

    'renderHeader': function renderHeader(header) {
      this.append($('<h2>').text(header));
    },

    'append': function append(el) {
      $(this.el).append(el);
    },

    'generateRoundRobin': function generateRoundRobin() {
      this.$('#generate').attr('disabled', 'disabled');
      this.model.generateRound();
    }
  });
});