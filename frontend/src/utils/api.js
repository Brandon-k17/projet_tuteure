// ─── src/utils/api.js ────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000/api/v1";

function getToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err) || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
}

export async function apiUpload(path, formData, method = "PATCH") {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err) || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function getCategorie(nb) {
  const n = parseInt(nb) || 1;
  if (n < 10)  return { cat: "TOURISME",   icon: "🚗", label: "Tourisme (< 10 places)" };
  if (n < 20)  return { cat: "UTILITAIRE", icon: "🚐", label: "Utilitaire / Minibus (10–19 places)" };
  return             { cat: "BUS",         icon: "🚌", label: `Bus (${n} places — ${Math.ceil(n / 30)} bus)` };
}