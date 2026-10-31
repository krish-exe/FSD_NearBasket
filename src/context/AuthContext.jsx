import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const USER_STORAGE_KEY = "nearbasket_user";
const ACCOUNTS_STORAGE_KEY = "nearbasket_accounts_v1";

// There is no backend: registered accounts live in this browser's localStorage.
// Passwords are salted and hashed so they are never stored in plain text.
function loadAccounts() {
  try {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Storage unavailable (private mode); the account lasts for this session only
  }
}

const normalizeEmail = (email) => email.trim().toLowerCase();

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  // crypto.subtle only exists on secure origins (https or localhost)
  if (crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for plain-http LAN testing: FNV-1a, enough to avoid storing the raw password
  let hash = 0x811c9dc5;
  for (const byte of data) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv:${hash.toString(16)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const startSession = (userInfo) => {
    setUser(userInfo);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
    } catch {
      // Storage unavailable (private mode); stay logged in for this session only
    }
  };

  // Resolves to { ok: true } or { ok: false, field, error }
  const signup = async ({ name, email, phone, password }) => {
    const key = normalizeEmail(email);
    const accounts = loadAccounts();
    if (accounts[key]) {
      return { ok: false, field: "email", error: "An account with this email already exists. Please log in." };
    }

    const salt = randomSalt();
    accounts[key] = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    saveAccounts(accounts);
    startSession({ name: accounts[key].name, email: accounts[key].email, phone: accounts[key].phone });
    return { ok: true };
  };

  // Resolves to { ok: true } or { ok: false, field, error }
  const login = async (email, password) => {
    const account = loadAccounts()[normalizeEmail(email)];
    if (!account) {
      return { ok: false, field: "email", error: "No account found with this email. Check it or sign up." };
    }
    if ((await hashPassword(password, account.salt)) !== account.passwordHash) {
      return { ok: false, field: "password", error: "Incorrect password. Please try again." };
    }
    startSession({ name: account.name, email: account.email, phone: account.phone });
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
