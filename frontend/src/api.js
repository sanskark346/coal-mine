const KEY = 'cg_token';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = t => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

export async function api(path, { method = 'GET', body, raw } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch (e) { throw new Error('Cannot reach the backend. Is it running on port 5000?'); }
  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken()) { setToken(null); window.location.href = '/login'; }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
export async function download(path, filename) {
  const res = await api(path, { raw: true });
  if (!res.ok) throw new Error('Download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
