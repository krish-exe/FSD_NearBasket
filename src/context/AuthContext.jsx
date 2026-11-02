import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken } from "../api/client";

const AuthContext = createContext(null);

const USER_STORAGE_KEY = "nearbasket_user";

// The last known user, so the header doesn't flash "Log in" while the session is checked
function loadCachedUser() {
  if (!getToken()) return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function cacheUser(user) {
  try {
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadCachedUser);

  const startSession = ({ token, user: account }) => {
    setToken(token);
    cacheUser(account);
    setUser(account);
  };

  const logout = () => {
    setToken(null);
    cacheUser(null);
    setUser(null);
  };

  // Confirm the saved login is still valid when the app opens
  useEffect(() => {
    if (!getToken()) return;
    api("/auth/me")
      .then(({ user: account }) => {
        cacheUser(account);
        setUser(account);
      })
      .catch((e) => {
        if (e.status === 401) logout();
      });
  }, []);

  // Resolves to { ok: true, user } or { ok: false, field, error }
  const signup = async ({ name, email, phone, password }) => {
    try {
      const session = await api("/auth/signup", { method: "POST", body: { name, email, phone, password } });
      startSession(session);
      return { ok: true, user: session.user };
    } catch (e) {
      return { ok: false, field: e.field || "password", error: e.message };
    }
  };

  // Creates a store owner account and their shop; resolves like signup
  const registerShop = async (details) => {
    try {
      const session = await api("/auth/register-shop", { method: "POST", body: details });
      startSession(session);
      return { ok: true, user: session.user };
    } catch (e) {
      return { ok: false, field: e.field || "street", error: e.message };
    }
  };

  // Resolves to { ok: true, user } or { ok: false, field, error }
  const login = async (email, password) => {
    try {
      const session = await api("/auth/login", { method: "POST", body: { email, password } });
      startSession(session);
      return { ok: true, user: session.user };
    } catch (e) {
      return { ok: false, field: e.field || "password", error: e.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn: !!user, isVendor: user?.role === "vendor", login, signup, registerShop, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
