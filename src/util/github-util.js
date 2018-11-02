/**
 * Fetches the total number of open issues in the repo
 * @param {object} options Request options
 */
export async function fetchTotalOpenIssues(options) {
  const response = await fetch(`https://api.${options.domain}/graphql`, {
    method: 'post',
    headers: { 'Authorization': `Basic ${window.btoa(options.apiKey)}` },
    body: JSON.stringify({
      query: `query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name, ) {
          issues(states: OPEN) {
            totalCount
          }
        }
      }`,
      variables: {
        owner: options.owner,
        name: options.name,
      },
    }),
  }).then(response => response.json());

  if (!response.data) {
    throw Error(response);
  }

  return response.data.repository.issues.totalCount;
}

/**
 * Recursively fetches a repository's issues
 * @param {object} options Request options
 */
export async function fetchIssues(options) {
  if (options.maxRequests === undefined) {
    options.maxRequests = 3;
  }

  if (!options.maxRequests) {
    return [];
  }

  const response = await fetch(`https://api.${options.domain}/graphql`, {
    method: 'post',
    headers: { 'Authorization': `Basic ${window.btoa(options.apiKey)}` },
    body: JSON.stringify({
      query: `query($owner: String!, $name: String!, $before: String) {
        repository(owner: $owner, name: $name, ) {
          issues(last: 100, before: $before) {
            pageInfo {
              hasPreviousPage
              startCursor
            }
            nodes {
              createdAt
              closedAt
              labels(first: 100) {
                nodes {
                  name
                }
              }
            }
          }
        }
      }`,
      variables: {
        owner: options.owner,
        name: options.name,
        before: options.before,
      },
    }),
  }).then(response => response.json());

  if (!response.data) {
    throw Error(response);
  }

  const { nodes, pageInfo } = response.data.repository.issues;

  if (!pageInfo.hasPreviousPage) {
    return nodes;
  }

  return (await fetchIssues({
    ...options,
    before: pageInfo.startCursor,
    maxRequests: options.maxRequests - 1,
  })).concat(nodes);
}

/**
 * Recursively fetches a repository's labels and the # of issues open for each label
 * @param {object} options Request options
 */
export async function fetchLabels(options) {
  const response = await fetch(`https://api.${options.domain}/graphql`, {
    method: 'post',
    headers: { 'Authorization': `Basic ${window.btoa(options.apiKey)}` },
    body: JSON.stringify({
      query: `query($owner: String!, $name: String!, $before: String) {
        repository(owner: $owner, name: $name, ) {
          labels(last: 100, before: $before) {
            pageInfo {
              hasPreviousPage
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
      variables: {
        owner: options.owner,
        name: options.name,
        before: options.before,
      },
    }),
  }).then(response => response.json());

  if (!response.data) {
    throw Error(response);
  }

  const { nodes, pageInfo } = response.data.repository.labels;

  if (!pageInfo.hasPreviousPage) {
    return nodes;
  }

  return (await fetchLabels({
    ...options,
    before: pageInfo.startCursor,
  })).concat(nodes);
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
    .then(response => response.json())
    .then(response => !response.data ? Promise.reject(response) : response.data) // queries can fail
    .then(({ repository }) => repository.issues.totalCount + repository.pullRequests.totalCount);

  // Send requests in parallel to retrieve all the issues
  const numPagesNeeded = Math.ceil(numIssuesAndPRs / 100);
  const pageNumbers = [...Array(numPagesNeeded).keys()].map(index => index + 1); // [1...numPagesNeeded]
  const results = await Promise.all(pageNumbers.map(pageNumber => (
    fetch(`https://api.${domain}/repos/${owner}/${name}/issues?state=all&direction=asc&per_page=100&page=${pageNumber}`, {
      headers: { 'Authorization': `Basic ${window.btoa(apiKey)}` },
    })
      .then(response => response.json())
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
