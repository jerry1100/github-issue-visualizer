import React, { Component } from 'react';
import { fetchAllIssues } from './util/github-util';
import './App.css';

class App extends Component {
  state = {
    repoDomain: '',
    repoOwner: '',
    repoName: '',
    apiKey: '',
    numOpenIssues: null,
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
    console.log(issues);
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
      </div>
    );
  }
}

export default App;
