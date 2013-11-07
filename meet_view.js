$(function() {
  window.MeetView = Backbone.View.extend({

    'tagName': 'div',
    'events': {
      'click #generate': 'generateRoundRobin',
      'click #generate2': 'generateRoundRobin2',
      'click #generate3': 'generateRoundRobin3'
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
      this.renderRoundRobin();
      this.renderGenerateBtn();
      this.renderCompetitionReport();
      this.renderTwoTeamSiteReport();
      this.renderByeReport();
      return this;
    },

    'renderGenerateBtn': function renderGenerateBtn() {
      this.append($('<a id="generate" class="btn generate"><i class="icon-plus"></i> Add 1 Round</a> &nbsp; <a id="generate2" class="btn generate"><i class="icon-plus"></i> Add 2 Rounds</a> &nbsp; <a id="generate3" class="btn generate"><i class="icon-plus"></i> Add 3 Rounds</a>'));
    },

    'renderRoundRobin': function renderRoundRobin() {
      this.renderHeader('Round-Robin Schedule');

      var round_nums = _.range(1, this.model.rounds.length + 1);
      var col_headings = round_nums.map(function(round) { return 'Round ' + round; });

      var rows = [];
      var separator_row = [];
      _(this.model.rounds.length).times(function() { separator_row.push(''); });

      var sites = _.range(this.getNumSites());
      sites.forEach(function(site_num) {
        _.range(3).forEach(function(team_position) {
          if (this.positionIsPopulated(site_num, team_position))
            rows.push(this.getTeamsForSiteAndPosition(site_num, team_position));
        }.bind(this));

        if (site_num != _(sites).last())
          rows.push(separator_row);

      }.bind(this));

      this.renderTable('round-robin', col_headings, rows);
    },

    'getNumSites': function getNumSites() {
      return Math.ceil(g_aTeams.length / 3);
    },

    'positionIsPopulated': function positionIsPopulated(site_num, team_position) {
      return _(this.getTeamsForSiteAndPosition(site_num, team_position)).any(_.identity);
    },

    'getTeamsForSiteAndPosition': function getTeamsForSiteAndPosition(site_num, team_position) {
      return this.model.rounds.pluck('set').map(function(sites) {
        var site = sites[site_num];
        if (!site)
          return '';
        var team_num = site[team_position];
        if (team_num == null)
          return '';
        var team = g_aTeams[team_num];
        return team ? team.team : 'Unknown Team';
      }.bind(this));
    },

    'renderCompetitionReport': function renderCompetitionReport() {
      this.renderHeader('Competition Matrix');
      this.renderReport('competition', [''].concat(_(this.teams).pluck('team')), function(team) {
        return [team.team].concat(team.timesPlayedTeam);
      });
      $(this.el).find('.competition tr').each(function(ix, tr) {
        $($(tr).find('td')[ix]).addClass('competing-self').empty();
      });
    },

    'renderTwoTeamSiteReport': function renderTwoTeamSiteReport() {
      if (!this.anyTeamsInTwoTeamSite())
        return;

      this.renderHeader('Number of times in a 2-team site');
      this.renderReport('two-teams', ['Team', '# times in 2-team site'], function(team) {
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
      this.renderReport('byes', ['Team', '# byes'], function(team) {
        return [team.team, team.nByes];
      });
    },

    'anyTeamsWithByes': function anyTeamsWithByes() {
      return _(this.teams).any(function(team) {
        return team.nByes;
      });
    },

    'renderReport': function renderReport(classname, headers, row_generator) {
      this.renderTable(classname, headers, this.teams.map(row_generator));
    },

    'renderTable': function renderTable(classname, headers, rows) {
      var table = $('<table class="table table-striped table-bordered ' + classname + '">');
      var thead_row = $('<tr>');
      headers.forEach(function(header) {
        thead_row.append($('<th>').text(header));
      });
      table.append($('<thead>').append(thead_row));
      
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
      this.$('.btn.generate').attr('disabled', 'disabled');
      this.model.generateRound(1);
    },

    'generateRoundRobin2': function generateRoundRobin2() {
      this.$('.btn.generate').attr('disabled', 'disabled');
      this.model.generateRound(2);
    },

    'generateRoundRobin3': function generateRoundRobin3() {
      this.$('.btn.generate').attr('disabled', 'disabled');
      this.model.generateRound(3);
    }
  });
});
