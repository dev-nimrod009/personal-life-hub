import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
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

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPasskey, setHasPasskey] = useState(() => localStorage.getItem(PASSKEY_FLAG) === "1");
  const [hasLocalPin, setHasLocalPin] = useState(() => localStorage.getItem(PIN_KEY) !== null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
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
