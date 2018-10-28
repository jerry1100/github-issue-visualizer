import React, { Component } from 'react';
import { Scatter } from 'react-chartjs-2';
import { fetchAllIssues } from './util/github-util';
import './App.css';

class App extends Component {
  state = {
    repoDomain: '',
    repoOwner: '',
    repoName: '',
    apiKey: '',
    numOpenIssues: null,
    chartData: null,
  }

  handleDomainChange = event => {
    this.setState({ repoDomain: event.target.value });
  }

  handleOwnerChange = event => {
    this.setState({ repoOwner: event.target.value });
  }

  handleNameChange = event => {
    this.setState({ repoName: event.target.value });
  }

  handleApiKeyChange = event => {
    this.setState({ apiKey: event.target.value });
  }

  fetchIssues = async () => {
    const issues = await fetchAllIssues({
      domain: this.state.repoDomain,
      owner: this.state.repoOwner,
      name: this.state.repoName,
      apiKey: this.state.apiKey,
    });

    // Calculate open issues by date
    // TODO: come up with more efficient way of doing this
    const numIssuesByDate = [
      ...new Set(issues.map(issue => issue.createdAt)), // get unique dates
      new Date().toISOString(), // end with current date so we don't cut off any points
    ]
      .map(date => ({
        x: date,
        y: issues.filter(issue => new Date(date) >= new Date(issue.createdAt)).length,
      }));
    issues.filter(issue => issue.closedAt).forEach(closedIssue => {
      numIssuesByDate.forEach(point => {
        if (new Date(closedIssue.closedAt) < new Date(point.x)) {
          point.y -= 1;
        }
      });
    });
    console.log(numIssuesByDate);

    const chartData = {
      datasets: [
        {
          label: 'Open Issues by Date',
          showLine: true,
          backgroundColor: 'rgba(75,192,192,0.4)',
          pointBorderColor: 'rgba(75,192,192,1)',
          pointBackgroundColor: '#fff',
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'rgba(75,192,192,1)',
          pointHoverBorderColor: 'rgba(220,220,220,1)',
          pointHoverBorderWidth: 2,
          pointRadius: 1,
          pointHitRadius: 10,
          data: numIssuesByDate,
        },
      ],
    };

    this.setState({ chartData });
  }

  render() {
    return (
      <div className="App">
        <input
          value={this.state.repoDomain}
          onChange={this.handleDomainChange}
          placeholder="Domain"
        />
        <input
          value={this.state.repoOwner}
          onChange={this.handleOwnerChange}
          placeholder="Repo owner"
        />
        <input
          value={this.state.repoName}
          onChange={this.handleNameChange}
          placeholder="Repo name"
        />
        <input
          value={this.state.apiKey}
          onChange={this.handleApiKeyChange}
          placeholder="API key"
        />
        <button onClick={this.fetchIssues}>Submit</button>
        {this.state.numOpenIssues && (
          <div>
            {this.state.repoOwner}/{this.state.repoName} has {this.state.numOpenIssues} open issues
          </div>
        )}
        {this.state.chartData && (
          <Scatter
            data={this.state.chartData}
            options={{
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
