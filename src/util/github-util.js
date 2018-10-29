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
