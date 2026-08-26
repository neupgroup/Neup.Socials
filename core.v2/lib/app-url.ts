function getAppUrl(): string {
  return "https://neupgroup.com/socials";
}


export function makeAppUrl(path: string): string {
  // If the path starts with a slash, remove it to avoid double slashes in the URL
  if (path.startsWith("/")) {
    path = path.substring(1);
  }
  // Remove the end slash from the base URL if it exists.
  path = path.replace(/\/$/, "");
  return `${getAppUrl()}/${path}`;
}