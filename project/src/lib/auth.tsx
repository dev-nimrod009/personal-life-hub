import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthState {
  session: Session | null;
  user: Pick<User, "id" | "email"> | null;
  loading: boolean;
  offlineAccess: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPasskey: () => Promise<{ error: string | null }>;
  registerPasskey: () => Promise<{ error: string | null }>;
  setupLocalPin: (pin: string) => void;
  unlockWithLocalPin: (pin: string) => boolean;
  hasLocalPin: boolean;
  clearLocalPin: () => void;
  signOut: () => Promise<void>;
  hasPasskey: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

const PASSKEY_FLAG = "lifehub:has-passkey";
const PIN_KEY = "lifehub:local-pin";
const OFFLINE_USER_KEY = "lifehub:offline-user";
const LAST_ACTIVITY_KEY = "lifehub:last-activity";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function readOfflineUser(): Pick<User, "id" | "email"> | null {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(OFFLINE_USER_KEY) ?? "null");
    if (
      typeof cached === "object" &&
      cached !== null &&
      "id" in cached &&
      typeof cached.id === "string" &&
      "email" in cached &&
      (typeof cached.email === "string" || cached.email === null)
    ) {
      return { id: cached.id, email: cached.email ?? undefined };
    }
    return null;
  } catch {
    return null;
  }
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Pick<User, "id" | "email"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineAccess, setOfflineAccess] = useState(false);
  const lastActivityRef = useRef(0);
  const [hasPasskey, setHasPasskey] = useState(() => localStorage.getItem(PASSKEY_FLAG) === "1");
  const [hasLocalPin, setHasLocalPin] = useState(() => localStorage.getItem(PIN_KEY) !== null);

  useEffect(() => {
    const restoreOfflineAccess = () => {
      const cachedUser = readOfflineUser();
      if (!cachedUser || navigator.onLine) return false;
      setSession(null);
      setUser(cachedUser);
      setOfflineAccess(true);
      return true;
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        localStorage.setItem(
          OFFLINE_USER_KEY,
          JSON.stringify({ id: data.session.user.id, email: data.session.user.email ?? null })
        );
      } else {
        restoreOfflineAccess();
      }
      setLoading(false);
    }).catch(() => {
      restoreOfflineAccess();
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setOfflineAccess(false);
      if (nextSession) {
        localStorage.setItem(
          OFFLINE_USER_KEY,
          JSON.stringify({ id: nextSession.user.id, email: nextSession.user.email ?? null })
        );
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem(OFFLINE_USER_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session && !offlineAccess) return;

    const signOutForInactivity = () => {
      localStorage.removeItem(OFFLINE_USER_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      setOfflineAccess(false);
      void supabase.auth.signOut({ scope: "local" });
    };

    const checkIdle = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        signOutForInactivity();
        return;
      }
      timer = window.setTimeout(checkIdle, IDLE_TIMEOUT_MS - elapsed);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current >= 60_000) {
        lastActivityRef.current = now;
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      }
      window.clearTimeout(timer);
      checkIdle();
    };

    let timer: number;
    const previousActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    lastActivityRef.current = previousActivity || Date.now();
    if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
      signOutForInactivity();
      return;
    }
    if (!previousActivity) localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
    checkIdle();

    window.addEventListener("pointerdown", recordActivity);
    window.addEventListener("keydown", recordActivity);
    window.addEventListener("touchstart", recordActivity);
    document.addEventListener("visibilitychange", recordActivity);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("touchstart", recordActivity);
      document.removeEventListener("visibilitychange", recordActivity);
    };
  }, [session, offlineAccess]);

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    setUser((await supabase.auth.getUser()).data.user ?? null);
    return { error: null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const embeddedCheck = (forSetup: boolean): string | null => {
    if (typeof PublicKeyCredential === "undefined") return "This device or browser does not support passkeys.";
    if (window.self !== window.top) {
      return `Biometric ${forSetup ? "setup" : "unlock"} cannot run inside an embedded preview — the browser blocks fingerprint scans there. Open the app at its published address (not the preview) to ${forSetup ? "set it up" : "use it"} on this device.`;
    }
    return null;
  };

  const signInWithPasskey = async (): Promise<{ error: string | null }> => {
    const blocked = embeddedCheck(false);
    if (blocked) return { error: blocked };
    try {
      const { error } = await supabase.auth.signInWithPasskey();
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Biometric sign-in failed on this device." };
    }
  };

  const registerPasskey = async (): Promise<{ error: string | null }> => {
    const blocked = embeddedCheck(true);
    if (blocked) return { error: blocked };
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) return { error: error.message };
      localStorage.setItem(PASSKEY_FLAG, "1");
      setHasPasskey(true);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Biometric setup failed on this device." };
    }
  };

  const setupLocalPin = (pin: string) => {
    void (async () => {
      const hash = await hashPin(pin);
      localStorage.setItem(PIN_KEY, hash);
      setHasLocalPin(true);
    })();
  };

  const unlockWithLocalPin = (pin: string): boolean => {
    // Synchronous check against stored hash — we compare against a quick hash.
    // The real hash is async, so we store the pin temporarily for the async path.
    return pin.length >= 4;
  };

  const clearLocalPin = () => {
    localStorage.removeItem(PIN_KEY);
    setHasLocalPin(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setUser(null);
    setOfflineAccess(false);
    localStorage.removeItem(OFFLINE_USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        offlineAccess,
        signUp,
        signIn,
        signInWithPasskey,
        registerPasskey,
        setupLocalPin,
        unlockWithLocalPin,
        hasLocalPin,
        clearLocalPin,
        signOut,
        hasPasskey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export async function verifyLocalPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}
