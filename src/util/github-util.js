/**
 * Recursively fetches a repository's labels
 * @param {object} options Request options
 */
export async function fetchAllLabels(options) {
  const { domain, owner, name, apiKey, after } = options;

  const data = await fetch(`https://api.${domain}/graphql`, {
    method: 'post',
    headers: { 'Authorization': `Basic ${window.btoa(apiKey)}` },
    body: JSON.stringify({
      query: `query($owner: String!, $name: String!, $after: String) {
        repository(owner: $owner, name: $name, ) {
          labels(first: 100, after: $after) {
            pageInfo {
              hasNextPage
              startCursor
            }
            nodes {
              name
              color
              issues(states: OPEN) {
                totalCount
              }
            }
          }
        }
      }`,
      variables: { owner, name, after },
    }),
  })
    .then(response => !response.ok ? Promise.reject(response) : response.json())
    .then(response => response.errors ? Promise.reject(response.errors) : response.data) // queries can fail

  const { nodes, pageInfo } = data.repository.labels;

  if (!pageInfo.hasPreviousPage) {
    return nodes;
  }

  return nodes.concat(await fetchAllLabels({ ...options, after: pageInfo.endCursor }));
}

/**
 * Fetches all of a repo's issues
 * @param {object} options Request options
 */
export async function fetchAllIssues(options) {
  const { domain, owner, name, apiKey } = options;

  // Get the total number of issues and PRs
  // Note: we need to include PRs since GitHub's issues API returns BOTH issues and PRs
  const numIssuesAndPRs = await fetch(`https://api.${domain}/graphql`, {
    method: 'post',
    headers: { 'Authorization': `Basic ${window.btoa(apiKey)}` },
    body: JSON.stringify({
      query: `query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name, ) {
          issues {
            totalCount
          }
          pullRequests {
            totalCount
          }
        }
      }`,
      variables: { owner, name },
    }),
  })
    .then(response => !response.ok ? Promise.reject(response) : response.json())
    .then(response => response.errors ? Promise.reject(response.errors) : response.data) // queries can fail
    .then(({ repository }) => repository.issues.totalCount + repository.pullRequests.totalCount);

  // Send requests in parallel to retrieve all the issues
  const numPagesNeeded = Math.ceil(numIssuesAndPRs / 100);
  const pageNumbers = [...Array(numPagesNeeded).keys()].map(index => index + 1); // [1...numPagesNeeded]
  const results = await Promise.all(pageNumbers.map(pageNumber => (
    fetch(`https://api.${domain}/repos/${owner}/${name}/issues?state=all&direction=asc&per_page=100&page=${pageNumber}`, {
      headers: { 'Authorization': `Basic ${window.btoa(apiKey)}` },
    })
      .then(response => !response.ok ? Promise.reject(response) : response.json())
      .then(response => response.filter(data => !data.pull_request)) // filter out pull requests
  )));

  // Flatten results into a single array
  const issues = results.reduce((total, current) => total.concat(current));

  // Return only relevant properties
  return issues.map(issue => ({
    title: issue.title,
    number: issue.number,
    createdAt: issue.created_at,
    closedAt: issue.closed_at,
    labels: issue.labels.map(label => label.name),
  }));
}
