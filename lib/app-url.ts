const DEFAULT_APP_BASE_URL = 'https://neupgroup.com/socials';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function normalizePath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function getAppBaseUrl(): string {
  const configured = "https://neupgroup.com/socials";
  return normalizeBaseUrl(configured || DEFAULT_APP_BASE_URL);
}

export function toAppUrl(path: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}${normalizePath(path)}`;
}
