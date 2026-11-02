// Talks to the NearBasket API. In development Vite forwards /api to the local
// server (see vite.config.js); a deployed site sets VITE_API_URL to the API's address.
const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_STORAGE_KEY = "nearbasket_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode); the login lasts until the tab closes
  }
}

// Carries the server's { error, field } so forms can show it next to the right input
export class ApiError extends Error {
  constructor(message, { status, field, errors } = {}) {
    super(message);
    this.status = status;
    this.field = field;
    this.errors = errors;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach NearBasket right now. Check your connection and try again.", { status: 0 });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || "Something went wrong. Please try again.", {
      status: res.status,
      field: data.field,
      errors: data.errors,
    });
  }
  return data;
}

// Pictures stored in the database have links like "/api/images/<id>"; point those at the API
export const assetUrl = (src) => (src?.startsWith("/api/") ? `${BASE_URL}${src}` : src);

// Uploads a picture file (a Blob) for a product; resolves to its image link
export async function uploadImage(blob) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/vendor/images`, {
      method: "POST",
      headers: { "Content-Type": blob.type, Authorization: `Bearer ${getToken()}` },
      body: blob,
    });
  } catch {
    throw new ApiError("Couldn't upload the photo. Check your connection and try again.", { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Couldn't upload the photo.", { status: res.status });
  return data.image;
}
