/**
 * API base resolution.
 *
 * - Default ('' empty): same-origin — dev (vite proxy) and Render (Express
 *   serves both SPA and API from the same origin).
 * - VITE_API_URL set: absolute API origin — used by the GitHub Pages build,
 *   where the static frontend is served from a different origin than the API.
 */
export const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
