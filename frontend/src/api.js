// All requests to the backend go through this file.
//  - Local development: VITE_API_URL is empty, so requests use "/api" and the Vite proxy forwards them to localhost:5000.
//  - Production (Vercel): set VITE_API_URL to your Render backend address, e.g. https://coalguard-api.onrender.com
const KEY = 'cg_token';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = t => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

const ORIGIN = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
export const API_BASE = ORIGIN + '/api';
const TIMEOUT_MS = 60000; // free Render servers can need ~50 s to wake up after being idle

const fail = (message, status) => Object.assign(new Error(message), { status });

async function send(path, { method = 'GET', body } = {}) {
  if (import.meta.env.PROD && !ORIGIN) throw fail('The website is not connected to a backend. Add the VITE_API_URL environment variable in Vercel (your Render backend URL) and redeploy.');
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(API_BASE + path, { method, signal: ctrl.signal, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    if (e.name === 'AbortError') throw fail('The server took too long to answer. If it was idle it may be waking up: wait a minute and try again.');
    throw fail('Cannot reach the backend server. Check your internet connection, that the backend is running, and that the API address (VITE_API_URL) and CORS settings are correct.');
  } finally { clearTimeout(timer); }
}

export async function api(path, opts = {}) {
  const res = await send(path, opts);
  const data = await res.json().catch(() => null);
  if (data === null) throw fail(`The server did not return a valid response (HTTP ${res.status}). The website may be pointing at the wrong backend address.`, res.status);
  if (res.status === 401 && getToken() && !path.startsWith('/auth/')) { setToken(null); window.location.href = '/login'; }
  if (!res.ok) throw fail(data.message || `Request failed (HTTP ${res.status})`, res.status);
  return data;
}

export async function download(path, filename) {
  const res = await send(path);
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw fail(d.message || 'Download failed', res.status); }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
