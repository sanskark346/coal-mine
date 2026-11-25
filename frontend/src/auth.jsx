import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export const homeFor = role => ({ admin: '/dashboard', operator: '/monitoring', inspector: '/compliance' }[role] || '/dashboard');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  useEffect(() => { if (getToken()) api('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false)); }, []);
  const finish = r => { setToken(r.token); setUser(r.user); return r.user; };
  const login = (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(finish);
  const register = body => api('/auth/register', { method: 'POST', body }).then(finish);
  const logout = () => { setToken(null); setUser(null); };
  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
