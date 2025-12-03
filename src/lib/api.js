// Use a relative base by default in production so the frontend calls `/api/...`.
// In development, set VITE_API_URL to e.g. http://localhost:3002
export const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  return fetch(url, options);
}

export default apiFetch;
