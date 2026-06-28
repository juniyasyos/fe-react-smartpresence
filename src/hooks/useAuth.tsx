import React, { useState, useCallback, useMemo } from "react";
import { AuthContext, getInitialAuthState } from "../store/authStore";
import { authService } from "../services/authService";
import type { User } from "../types/user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(getInitialAuthState);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    setState((prev) => ({
      ...prev,
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setState((prev) => ({
      ...prev,
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, setLoading, setError }),
    [state, login, logout, setLoading, setError],
  );

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        await authService.csrfCookie();
        const data = await authService.me();
        setState((prev) => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
          isCheckingSession: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          user: null,
          token: null,
          isAuthenticated: false,
          isCheckingSession: false,
        }));
      }
    };
    checkSession();
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
