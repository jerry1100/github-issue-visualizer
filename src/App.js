import React, { Component } from 'react';
import { Scatter } from 'react-chartjs-2';
import { fetchTotalOpenIssues, fetchIssues, fetchLabels } from './util/github-util';
import './App.css';

class App extends Component {
  state = {
    repoURL: window.localStorage.getItem('repo_url') || '',
    apiKey: window.localStorage.getItem('api_key') || '',
    totalOpenIssues: null,
    chartData: null,
  }

  handleRepoURLChange = event => {
    this.setState({ repoURL: event.target.value });
  }

  handleApiKeyChange = event => {
    this.setState({ apiKey: event.target.value });
  }

  generateChart = async () => {
    const [repoURL, domain, owner, name] = this.state.repoURL.match(/(github[^/]*)\/([^/]*)\/([^/&?]*)/);
    const githubOptions = { domain, owner, name, apiKey: this.state.apiKey };
    const [totalOpenIssues, issues, labels] = await Promise.all([
      fetchTotalOpenIssues(githubOptions),
      fetchIssues(githubOptions),
      fetchLabels(githubOptions),
    ]);

    // Get all the unique times with data
    const times = Array.from(new Set(issues.reduce((total, issue) => (
      total.concat(issue.createdAt, issue.closedAt || [])
    ), []))).sort((a, b) => new Date(a) - new Date(b)); // sort chronologically

    // Mock a "total issues" label for displaying all the issues
    labels.push({
      name: 'total issues',
      color: '#0366d6',
      issues: { totalCount: totalOpenIssues },
    });

    // For each label, populate all its data points
    const dataByLabel = {};
    labels.forEach(label => {
      const dataPoints = times.map(time => ({
        x: time,
        y: issues.filter(issue => {
          if (new Date(time) < new Date(issue.createdAt)) {
            return false;
          }
          if (issue.closedAt && new Date(time) >= new Date(issue.closedAt)) {
            return false;
          }
          if (label.name === 'total issues') {
            return true;
          }
          return issue.labels.nodes.some(issueLabel => issueLabel.name === label.name);
        }).length,
      }));
      const offset = label.issues.totalCount - dataPoints[dataPoints.length - 1].y;
      dataByLabel[label.name] = dataPoints.map(point => ({
        x: point.x,
        y: point.y + offset,
      }));
    });

    const chartData = {
      datasets: [{
        label: 'total issues',
        data: dataByLabel['total issues'],
        showLine: true,
        backgroundColor: 'rgba(75, 192, 192, 0.4)',
        pointBorderColor: 'rgba(75, 192, 192, 1)',
        pointRadius: 1,
        pointHoverRadius: 1,
      }],
    };

    this.setState({ repoURL: `https://${repoURL}`, chartData, totalOpenIssues }, () => {
      window.localStorage.setItem('repo_url', this.state.repoURL);
      window.localStorage.setItem('api_key', this.state.apiKey);
    });
  }

  render() {
    return (
      <div className="App">
        <input
          value={this.state.repoURL}
          onChange={this.handleRepoURLChange}
          placeholder="Repo URL"
        />
        <input
          value={this.state.apiKey}
          onChange={this.handleApiKeyChange}
          placeholder="API key"
        />
        <button onClick={this.generateChart}>Submit</button>
        {this.state.totalOpenIssues && (
          <div>
            {this.state.repoURL} has {this.state.totalOpenIssues} open issues
          </div>
        )}
        {this.state.chartData && (
          <Scatter
            data={this.state.chartData}
            options={{
              tooltips: {
                intersect: false,
                mode: 'index',
              },
              scales: {
                xAxes: [{
                  type: 'time',
                  time: {
                    unit: 'day',
                    tooltipFormat: 'lll' // https://momentjs.com/
                  },
                }],
              }
            }}
          />
        )}
      </div>
    );
  }
}

export default App;
