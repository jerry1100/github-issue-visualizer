import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import { fetchTotalOpenIssues, fetchIssues, fetchLabels } from './util/github-util';
import './App.css';

class App extends Component {
  state = {
    repoURL: window.localStorage.getItem('repo_url') || '',
    apiKey: window.localStorage.getItem('api_key') || '',
    totalOpenIssues: null,
    chartLabels: null,
    selectedLabels: [],
  }

  handleRepoURLChange = event => {
    this.setState({ repoURL: event.target.value });
  }

  handleApiKeyChange = event => {
    this.setState({ apiKey: event.target.value });
  }

  handleLabelChange = event => {
    const selectedLabels = this.state.selectedLabels.includes(event.target.value)
      ? this.state.selectedLabels.filter(label => label !== event.target.value)
      : this.state.selectedLabels.concat(event.target.value);
    this.setState({ selectedLabels });
  }

  getIssues = async () => {
    const [repoURL, domain, owner, name] = this.state.repoURL.match(/(github[^/]*)\/([^/]*)\/([^/&?]*)/);
    const githubOptions = { domain, owner, name, apiKey: this.state.apiKey };
    const [totalOpenIssues, fetchedIssues, fetchedLabels] = await Promise.all([
      fetchTotalOpenIssues(githubOptions),
      fetchIssues(githubOptions),
      fetchLabels(githubOptions),
    ]);

    // Get all the unique times with data
    this.times = Array.from(new Set(fetchedIssues.reduce((total, issue) => {
      const floorHour = date => (
        new Date(new Date(new Date(date).setMilliseconds(0)).setMinutes(0))
      );
      return total.concat(
        floorHour(issue.createdAt).toISOString(),
        issue.closedAt ? floorHour(issue.closedAt).toISOString() : [],
      );
    }, []))).sort((a, b) => new Date(a) - new Date(b)); // sort chronologically
    
    // Mock a "total issues" label for displaying all the issues
    fetchedLabels.unshift({
      name: 'total issues',
      color: '0366d6',
      issues: { totalCount: totalOpenIssues },
    });

    // Save data for generating charts later
    this.fetchedIssues = fetchedIssues;
    this.fetchedLabels = fetchedLabels;
    this.labelColors = {};
    this.chartData = {};

    this.setState({
      totalOpenIssues,
      repoURL: `https://${repoURL}`,
      chartLabels: fetchedLabels.map(label => label.name),
      selectedLabels: ['total issues'],
    }, () => {
      window.localStorage.setItem('repo_url', this.state.repoURL);
      window.localStorage.setItem('api_key', this.state.apiKey);
    });
  }

  getChartData = () => {
    // For each selected label, generate the chart data if didn't already
    this.fetchedLabels.filter(label => this.state.selectedLabels.includes(label.name))
      .filter(label => !this.chartData[label.name])
      .forEach(label => {
        const values = this.times.map(time => (
          this.fetchedIssues.filter(issue => {
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
          }).length
        ));
        const offset = label.issues.totalCount - values[values.length - 1];
        this.chartData[label.name] = values.map(point => point + offset);
        this.labelColors[label.name] = label.color;
      });

    return {
      labels: this.times,
      datasets: this.state.selectedLabels.map(label => ({
        label,
        data: this.chartData[label],
        fill: false,
        lineTension: 0,
        borderColor: `#${this.labelColors[label]}`,
        pointBorderColor: `#${this.labelColors[label]}`,
        pointRadius: 1,
        pointHoverRadius: 1,
      })),
    };
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
        <button onClick={this.getIssues}>Submit</button>
        {this.state.totalOpenIssues && (
          <div>
            There are {this.state.totalOpenIssues} open issues
          </div>
        )}
        {this.state.chartLabels && (
          <div>
            {this.state.chartLabels.map(label => (
              <option
                className={this.state.selectedLabels.includes(label) ? 'selected' : null}
                key={label}
                value={label}
                onClick={this.handleLabelChange}
              >
                {label}
              </option>
            ))}
          </div>
        )}
        {this.state.chartLabels && (
          <Line
            data={this.getChartData()}
            options={{
              legend: {
                display: false,
              },
              tooltips: {
                intersect: false,
                mode: 'index',
              },
              scales: {
                xAxes: [{
                  type: 'time',
                  time: {
                    unit: 'day',
                    tooltipFormat: 'lll', // https://momentjs.com/
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
