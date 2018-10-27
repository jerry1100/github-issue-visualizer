import React, { Component } from 'react';
import './App.css';

class App extends Component {
  state = {
    domain: '',
    owner: '',
    repo: '',
    apiKey: '',
    numOpenIssues: null,
  }

  handleDomainChange = event => {
    this.setState({ domain: event.target.value });
  }

  handleOwnerChange = event => {
    this.setState({ owner: event.target.value });
  }

  handleRepoChange = event => {
    this.setState({ repo: event.target.value });
  }

  handleApiKeyChange = event => {
    this.setState({ apiKey: event.target.value });
  }

  fetchIssues = () => {
    fetch(`https://api.${this.state.domain}/graphql`, {
      method: 'post',
      headers: { 'Authorization': `Basic ${window.btoa(this.state.apiKey)}` },
      body: JSON.stringify({
        query: `query($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            issues(states:OPEN) {
              totalCount
            }
          }
        }`,
        variables: {
          owner: this.state.owner,
          name: this.state.repo,
        },
      }),
    })
      .then(response => response.json())
      .then(({ data }) => this.setState({ numOpenIssues: data.repository.issues.totalCount }))
      .catch(e => console.error(e));
  }

  render() {
    return (
      <div className="App">
        <input
          value={this.state.domain}
          onChange={this.handleDomainChange}
          placeholder="Domain"
        />
        <input
          value={this.state.owner}
          onChange={this.handleOwnerChange}
          placeholder="Repo owner"
        />
        <input
          value={this.state.repo}
          onChange={this.handleRepoChange}
          placeholder="Repo"
        />
        <input
          value={this.state.apiKey}
          onChange={this.handleApiKeyChange}
          placeholder="API key"
        />
        <button onClick={this.fetchIssues}>Submit</button>
        {this.state.numOpenIssues && (
          <div>
            {this.state.owner}/{this.state.repo} has {this.state.numOpenIssues} open issues
          </div>
        )}
      </div>
    );
  }
}

export default App;
