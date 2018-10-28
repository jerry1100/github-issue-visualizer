export async function fetchAllIssues(options) {
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

  return (await fetchAllIssues({ ...options, before: pageInfo.startCursor })).concat(nodes);
}
