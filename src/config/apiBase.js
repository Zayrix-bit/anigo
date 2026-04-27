const isProd = import.meta.env.PROD;

function normalizeUrl(value) {
  return (value || "").trim().replace(/\/+$/, "");
}

function isLoopbackUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function sanitizeForMode(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return "";
  if (isProd && isLoopbackUrl(normalized)) return "";
  return normalized;
}

function resolveApiBase(envKey) {
  const specific = sanitizeForMode(import.meta.env[envKey]);
  if (specific) return specific;

  const globalBase = sanitizeForMode(import.meta.env.VITE_API_BASE_URL);
  if (globalBase) return globalBase;

  return "";
}

export const PYTHON_API_BASE = resolveApiBase("VITE_PYTHON_API");
export const NODE_API_BASE = resolveApiBase("VITE_NODE_API");
export const AUTH_API_BASE = resolveApiBase("VITE_AUTH_API");
