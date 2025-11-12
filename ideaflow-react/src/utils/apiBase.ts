const normalizeUrl = (url: string) => url.replace(/\/+$/, '');

export const resolveApiOrigin = (): string => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return normalizeUrl(envUrl);
  }
  return '';
};

export const resolveApiBasePath = (): string => {
  const origin = resolveApiOrigin();
  return origin ? `${origin}/api` : '/api';
};

export const resolveSocketOrigin = (): string => {
  const envSocket = import.meta.env.VITE_SOCKET_URL?.trim();
  if (envSocket) {
    return normalizeUrl(envSocket);
  }

  const apiOrigin = resolveApiOrigin();
  if (apiOrigin) {
    return apiOrigin;
  }

  return window.location.origin;
};

