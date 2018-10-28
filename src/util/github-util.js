export async function fetchAllIssues(options) {
  const response = await fetch(`https://api.${options.domain}/graphql`, {
    method: 'post',
    headers: { 'Authorization': `Basic ${window.btoa(options.apiKey)}` },
    body: JSON.stringify({
      query: `query($owner: String!, $name: String!, $after: String) {
        repository(owner: $owner, name: $name, ) {
          issues(first: 100, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              createdAt
              closedAt
            }
          }
        }
      }`,
      variables: {
        owner: options.owner,
        name: options.repo,
        after: options.after,
      },
    }),
  }).then(response => response.json());

  if (!response.data) {
    throw Error(response);
  }

  const { nodes, pageInfo } = response.data.repository.issues;

  if (!pageInfo.hasNextPage) {
    return nodes;
  }

  return nodes.concat(await fetchAllIssues({ ...options, after: pageInfo.endCursor }));
}
