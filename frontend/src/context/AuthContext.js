import { createContext, useContext, useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = guest
  const [ready, setReady] = useState(false);

  const loadMe = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(false);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => { loadMe(); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const login = async (email, password) => {
    // Auth token is set as an httpOnly cookie by the server (safer than localStorage).
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Logout request failed:", e);
    }
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, apiErr }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function homeFor(role) {
  if (role === "admin" || role === "super_admin") return "/admin";
  if (role === "courier") return "/courier";
  if (role === "customer") return "/portal";
  return "/";
}
