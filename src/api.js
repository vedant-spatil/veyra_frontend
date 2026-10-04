export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = sessionStorage.getItem("veyra_token");
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { credentials: "include", ...options, headers });
  const text = await response.text();
  let data = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { error: text }; }
  }
  if (response.status === 401) sessionStorage.removeItem("veyra_token");
  if (!response.ok) {
    const error = new Error(data.error || "request failed");
    error.status = response.status;
    error.code = data.code;
    error.body = data;
    throw error;
  }
  return data;
}

export function signOut() {
  sessionStorage.removeItem("veyra_token");
  return api("/api/auth/logout", { method: "POST" }).catch(() => {});
}
