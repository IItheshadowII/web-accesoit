export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  return fetch(url, options);
}

export default apiFetch;
