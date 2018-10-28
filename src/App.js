import React, { Component } from 'react';
import { Scatter } from 'react-chartjs-2';
import { fetchNumOpenIssues, fetchIssues, fetchLabels } from './util/github-util';
import './App.css';

class App extends Component {
  state = {
    repoURL: window.localStorage.getItem('repo_url') || '',
    apiKey: window.localStorage.getItem('api_key') || '',
    numOpenIssues: null,
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
    const [numOpenIssues, issues, labels] = await Promise.all([
      fetchNumOpenIssues(githubOptions),
      fetchIssues(githubOptions),
      fetchLabels(githubOptions),
    ]);

    // Since we can't get all the issues, calculate an offset to normalize the values
    const offset = numOpenIssues - issues.filter(issue => !issue.closedAt).length;

    // Get all the unique times with data
    const times = Array.from(new Set(issues.reduce((total, issue) => (
      total.concat(issue.createdAt, issue.closedAt || [])
    ), []))).sort((a, b) => new Date(a) - new Date(b)); // sort chronologically

    // For each time, get the open issues during that time
    const openIssuesByTime = times.map(time => ({
      t: time,
      y: offset + issues.filter(issue => (
        new Date(issue.createdAt) <= new Date(time) && // issue is open
        (!issue.closedAt || new Date(time) < new Date(issue.closedAt)) // issue is not closed yet
      )).length,
    }));

    const chartData = {
      datasets: [
        {
          label: 'Open Issues by Date',
          showLine: true,
          backgroundColor: 'rgba(75,192,192,0.4)',
          pointBorderColor: 'rgba(75,192,192,1)',
          pointRadius: 1,
          pointHoverRadius: 1,
          data: openIssuesByTime,
        },
      ],
    };

    this.setState({ repoURL: `https://${repoURL}`, chartData }, () => {
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
        {this.state.numOpenIssues && (
          <div>
            {this.state.repoOwner}/{this.state.repoName} has {this.state.numOpenIssues} open issues
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
