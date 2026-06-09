const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function toApiAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  try {
    const apiUrl = new URL(API_BASE_URL, window.location.origin);
    const assetBasePath = apiUrl.pathname.replace(/\/api\/?$/, '');
    const assetBase = `${apiUrl.origin}${assetBasePath || '/'}`;
    return new URL(path, assetBase.endsWith('/') ? assetBase : `${assetBase}/`).toString();
  } catch {
    return path;
  }
}
