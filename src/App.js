import React, { Component, Fragment } from 'react';
import { Line } from 'react-chartjs-2';
import { fetchAllLabels, fetchAllIssues } from './util/github-util';
import './App.css';

class App extends Component {
  state = {
    repoURL: window.localStorage.getItem('repo_url') || '',
    apiKey: window.localStorage.getItem('api_key') || '',
    numOpenIssues: null,
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
    const githubOptions = { domain, owner, name, apiKey: this.state.apiKey };
    [this.labels, this.issues] = await Promise.all([
      fetchAllLabels(githubOptions),
      fetchAllIssues(githubOptions),
    ]);

    // Convert fetched labels into an object for easier access
    const labelsObj = {};
    this.labels.forEach(({ name, ...props }) => { labelsObj[name] = props });
    this.labels = labelsObj;

    // Get a list of times and count the number of open issues
    // TODO: think about splitting the logic up? Will it hurt performance?
    const timesObj = {};
    let numOpenIssues = 0;
    this.issues.forEach(issue => {
      const round = time => new Date(new Date(time).toDateString()).toISOString();
      timesObj[round(issue.createdAt)] = null;
      if (issue.closedAt) {
        timesObj[round(issue.closedAt)] = null;
      } else {
        numOpenIssues += 1;
      }
    });
    this.times = Object.keys(timesObj).concat(new Date().toISOString()); // include current time
    this.times.sort((a, b) => new Date(a) - new Date(b)); // make sure it's in chronological order

    // Mock a "__total" label for displaying all the issues
    this.labels.__total = {
      color: '0366d6',
      issues: { totalCount: numOpenIssues },
    };

    // Finish up
    this.chartData = {};
    this.setState({
      numOpenIssues,
      repoURL: `https://${repoURL}`,
      chartLabels: Object.keys(this.labels).sort((a, b) => a.localeCompare(b)),
      selectedLabels: ['__total'],
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
            this.issues.filter(issue => {
              if (new Date(time) < new Date(issue.createdAt)) {
                return false;
              }
              if (issue.closedAt && new Date(time) >= new Date(issue.closedAt)) {
                return false;
              }
              return this.state.selectedLabels.every(selectedLabel => (
                issue.labels.some(issueLabel => issueLabel === selectedLabel)
              ));
            }).length
          )),
        }],
      };
    }

    // For each selected label, generate the chart data if didn't already
    this.state.selectedLabels.filter(label => !this.chartData[label])
      .forEach(labelToGenerate => {
        this.chartData[labelToGenerate] = this.times.map(time => (
          this.issues.filter(issue => {
            if (new Date(time) < new Date(issue.createdAt)) {
              return false;
            }
            if (issue.closedAt && new Date(time) >= new Date(issue.closedAt)) {
              return false;
            }
            if (labelToGenerate === '__total') {
              return true;
            }
            return issue.labels.some(issueLabel => issueLabel === labelToGenerate);
          }).length
        ));
      });

    return {
      labels: this.times,
      datasets: this.state.selectedLabels.map(selectedLabel => ({
        label: selectedLabel,
        data: this.chartData[selectedLabel],
        borderColor: `#${this.labels[selectedLabel].color}`,
        fill: false,
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
        {this.state.numOpenIssues && (
          <div>
            There are {this.state.numOpenIssues} open issues
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
                {this.state.chartLabels.map(chartLabel => (
                  <option
                    className={this.state.selectedLabels.includes(chartLabel) ? 'selected' : null}
                    key={chartLabel}
                    value={chartLabel}
                    onClick={this.handleLabelChange}
                  >
                    {chartLabel} ({this.labels[chartLabel].issues.totalCount})
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
