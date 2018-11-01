import React, { Component, Fragment } from 'react';
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
    isCheckboxChecked: false,
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

  handleCheckboxChange = event => {
    this.setState({ isCheckboxChecked: event.target.checked });
  }

  getIssues = async () => {
    const [repoURL, domain, owner, name] = this.state.repoURL.match(/(github[^/]*)\/([^/]*)\/([^/&?]*)/);
    const githubOptions = { domain, owner, name, apiKey: this.state.apiKey, maxRequests: 1 };
    const results = await Promise.all([
      fetchTotalOpenIssues(githubOptions),
      fetchIssues(githubOptions),
      fetchLabels(githubOptions),
    ]);

    // Save data for generating charts later
    const totalOpenIssues = results[0];
    this.fetchedIssues = results[1]
    this.fetchedLabels = results[2];
    this.chartData = {};

    // Remove labels that aren't in any issues
    this.fetchedLabels = this.fetchedLabels.filter(label => (
      this.fetchedIssues.some(issue => (
        issue.labels.nodes.some(({ name }) => name === label.name)
      ))
    ));

    // Mock a "total issues" label for displaying all the issues
    this.fetchedLabels.unshift({
      name: 'total issues',
      color: '0366d6',
      issues: { totalCount: totalOpenIssues },
    });
    this.labelColors = this.fetchedLabels.reduce((total, label) => (
      { ...total, [label.name]: label.color }
    ), {});

    // Extract createdAt/closedAt times from issues
    const allTimes = this.fetchedIssues.reduce((total, issue) => (
      total.concat(issue.createdAt, issue.closedAt || [])
    ), []);

    // Round times to nearest day, remove duplicates, and sort chronologically
    this.times = Array.from(new Set(allTimes.map(time => (
      new Date(new Date(time).toDateString()).toISOString()
    )))).concat(new Date().toISOString()); // include current time
    this.times.sort((a, b) => new Date(a) - new Date(b));

    this.setState({
      totalOpenIssues,
      repoURL: `https://${repoURL}`,
      chartLabels: [...this.fetchedLabels],
      selectedLabels: ['total issues'],
    }, () => {
      window.localStorage.setItem('repo_url', this.state.repoURL);
      window.localStorage.setItem('api_key', this.state.apiKey);
    });
  }

  getChartData = () => {
    // If using AND filtering, count all the issues with the selected labels
    if (this.state.isCheckboxChecked) {
      return {
        labels: this.times,
        datasets: [{
          label: this.state.selectedLabels.join(', '),
          fill: false,
          borderColor: '#0366d6',
          lineTension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          data: this.times.map(time => (
            this.fetchedIssues.filter(issue => {
              if (new Date(time) < new Date(issue.createdAt)) {
                return false;
              }
              if (issue.closedAt && new Date(time) >= new Date(issue.closedAt)) {
                return false;
              }
              return this.state.selectedLabels.every(label => (
                issue.labels.nodes.some(({ name }) => name === label)
              ));
            }).length
          )),
        }],
      };
    }

    // For each selected label, generate the chart data if didn't already
    this.state.selectedLabels.filter(label => !this.chartData[label])
      .map(label => this.fetchedLabels.find(({ name }) => name === label))
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
      });

    return {
      labels: this.times,
      datasets: this.state.selectedLabels.map(label => ({
        label,
        data: this.chartData[label],
        fill: false,
        borderColor: `#${this.labelColors[label]}`,
        lineTension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
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
          <Fragment>
            <div className="repo-info">
              <input
                type="checkbox"
                checked={this.state.isCheckboxChecked}
                onChange={this.handleCheckboxChange}
              />AND filter
            </div>
            <div className="container">
              <div className="chart">
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
              </div>
              <div className="labels">
                {this.state.chartLabels.map(label => (
                  <option
                    className={this.state.selectedLabels.includes(label.name) ? 'selected' : null}
                    key={label.name}
                    value={label.name}
                    onClick={this.handleLabelChange}
                  >
                    {label.name} ({label.issues.totalCount})
                  </option>
                ))}
              </div>
            </div>
          </Fragment>
        )}
      </div>
    );
  }
}

export default App;
