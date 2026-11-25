import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export const homeFor = role => ({ admin: '/dashboard', operator: '/monitoring', inspector: '/compliance' }[role] || '/dashboard');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [authError, setAuthError] = useState(null);
  // Restore the session after a refresh. Only a 401 (token rejected) logs the user out;
  // a network or server problem keeps the token and shows a retry message instead.
  const restore = useCallback(() => {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true); setAuthError(null);
    api('/auth/me').then(setUser).catch(e => { if (e.status === 401) setToken(null); else setAuthError(e.message); }).finally(() => setLoading(false));
  }, []);
  useEffect(restore, [restore]);
  const finish = r => { setToken(r.token); setUser(r.user); setAuthError(null); return r.user; };
  const login = (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(finish);
  const register = body => api('/auth/register', { method: 'POST', body }).then(finish);
  const logout = () => { setToken(null); setUser(null); setAuthError(null); };
  return <Ctx.Provider value={{ user, loading, authError, retry: restore, login, register, logout }}>{children}</Ctx.Provider>;
}
