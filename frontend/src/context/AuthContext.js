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

  useEffect(() => { loadMe(); }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("rx_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("rx_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("rx_token");
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
