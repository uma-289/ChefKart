import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, notifAPI } from '../services/api';

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [chefProfile, setChef]    = useState(null);
  const [loading, setLoading]     = useState(true);
  const [unread, setUnread]       = useState(0);
  const [applicationPending, setAppPending] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const r = await authAPI.me();
      setUser(r.data.user);
      setChef(r.data.chefProfile);
      setAppPending(r.data.applicationPending || false);
    } catch { localStorage.removeItem('ck_token'); }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const r = await notifAPI.getAll();
      setUnread(r.data.unread || 0);
    } catch {}
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('ck_token');
    if (t) fetchMe().finally(() => setLoading(false));
    else setLoading(false);
  }, [fetchMe]);

  useEffect(() => {
    if (user) {
      fetchUnread();
      const id = setInterval(fetchUnread, 30000); // poll every 30s
      return () => clearInterval(id);
    }
  }, [user, fetchUnread]);

  const login = async (email, password) => {
    const r = await authAPI.login({ email, password });
    localStorage.setItem('ck_token', r.data.token);
    setUser(r.data.user);
    setChef(r.data.chefProfile);
    setAppPending(r.data.applicationPending || false);
    return r.data;
  };

  const register = async (data) => {
    const r = await authAPI.register(data);
    localStorage.setItem('ck_token', r.data.token);
    setUser(r.data.user);
    setAppPending(r.data.applicationPending || false);
    return r.data;
  };

  const logout = () => {
    localStorage.removeItem('ck_token');
    setUser(null); setChef(null); setUnread(0); setAppPending(false);
  };

  return (
    <Ctx.Provider value={{ user, setUser, chefProfile, setChef, loading, unread, setUnread, applicationPending, login, register, logout, fetchMe }}>
      {children}
    </Ctx.Provider>
  );
}
