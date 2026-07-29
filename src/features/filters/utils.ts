export const FILTERS_URL = '/filters';

export const DEFAULT_SIEVE = `require ["fileinto"];

# Example: file newsletters into a folder.
# if header :contains "from" "newsletter@example.com" {
#   fileinto "Lists";
# }
`;
