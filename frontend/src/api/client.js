const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };
  if (
    options.body != null &&
    typeof options.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
  return res;
}

export async function parseJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
