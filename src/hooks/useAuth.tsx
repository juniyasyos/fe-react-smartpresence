import React, { useState, useCallback, useMemo } from "react";
import { AuthContext, getInitialAuthState } from "../store/authStore";
import type { User } from "../types/user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(getInitialAuthState);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    setState({
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
