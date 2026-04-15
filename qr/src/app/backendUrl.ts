const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has((hostname || "").toLowerCase());
}

function getRuntimeHost() {
  return (window.location.hostname || "").trim();
}

export function getApiBaseUrl() {
  const envUrl = (import.meta as { env?: { VITE_BACKEND_URL?: string } }).env?.VITE_BACKEND_URL;
  const rawEnvUrl = String(envUrl || "").trim();

  if (rawEnvUrl) {
    try {
      const parsed = new URL(rawEnvUrl);
      const runtimeHost = getRuntimeHost();

      // If env points to localhost but app is opened from another device,
      // reuse the current host so the phone can still reach backend.
      if (isLocalHost(parsed.hostname) && runtimeHost && !isLocalHost(runtimeHost)) {
        parsed.hostname = runtimeHost;
      }

      return trimTrailingSlash(parsed.toString());
    } catch {
      return trimTrailingSlash(rawEnvUrl);
    }
  }

  const runtimeHost = getRuntimeHost();
  if (isLocalHost(runtimeHost)) {
    return "/api";
  }

  const protocol = window.location.protocol;
  return `${protocol}//${runtimeHost}:3000`;
}

export function getSocketServerUrl() {
  const apiBaseUrl = getApiBaseUrl();

  if (apiBaseUrl.startsWith("/")) {
    const protocol = window.location.protocol;
    const hostname = getRuntimeHost();
    return `${protocol}//${hostname}:3000`;
  }

  return apiBaseUrl;
}
