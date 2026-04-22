import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api, { setAuthFailedHandler } from "@/utils/axiosInstance";

export type Pessoa = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  login_token: string | null;
};

export type User = {
  id: number;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  pessoa: Pessoa | null;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  email: string;
  password: string;
  nome: string;
  cpf: string;
  telefone?: string;
};

type UserContextType = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

function normalizeMeResponse(data: any): User {
  return {
    id: Number(data?.id ?? 0),
    email: data?.email ?? "",
    is_active: Boolean(data?.is_active),
    last_login_at: data?.last_login_at ?? null,
    pessoa: data?.pessoa
      ? {
          id: Number(data.pessoa.id ?? 0),
          nome: data.pessoa.nome ?? "",
          cpf: data.pessoa.cpf ?? "",
          telefone: data.pessoa.telefone ?? null,
          login_token: data.pessoa.login_token ?? null,
        }
      : null,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      const normalized = normalizeMeResponse(response.data);
      setUser(normalized);
    } catch (error) {
      setUser(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    setAuthFailedHandler(() => {
      clearUser();
    });

    return () => {
      setAuthFailedHandler(() => {});
    };
  }, [clearUser]);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const response = await api.get("/auth/me");
        if (!mounted) return;

        const normalized = normalizeMeResponse(response.data);
        setUser(normalized);
      } catch {
        if (!mounted) return;
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    await api.post("/auth/login", payload);

    const response = await api.get("/auth/me");
    const normalized = normalizeMeResponse(response.data);
    setUser(normalized);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await api.post("/auth/register", payload);

    const response = await api.get("/auth/me");
    const normalized = normalizeMeResponse(response.data);
    setUser(normalized);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<UserContextType>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }

  return context;
}