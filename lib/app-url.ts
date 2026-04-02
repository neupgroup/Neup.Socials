function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function normalizePath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function buildUrlFromBase(baseUrl: string, path: string): string {
  return `${normalizeBaseUrl(baseUrl)}${normalizePath(path)}`;
}

export function getAppBaseUrl(): string {
  const configured = "https://neupgroup.com/socials";
  return normalizeBaseUrl(configured);
}

export function toAppUrl(path: string): string {
  return buildUrlFromBase(getAppBaseUrl(), path);
}
