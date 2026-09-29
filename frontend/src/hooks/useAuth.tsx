import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "@/services/api";
import type { AuthResponse, User } from "@/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function useAuth() {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/api/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => {
    const { data } = await api.post<AuthResponse>("/api/auth/register", payload);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    location.href = "/";
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
  );
}
