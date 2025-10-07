import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Initializing...");
    
    // Force loading to false after 2 seconds max to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log("AuthProvider: Timeout reached, forcing loading=false");
      setLoading(false);
    }, 2000);

    try {
      // Set up listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, newSession) => {
        console.log("AuthProvider: Auth state changed", { event: _event, hasSession: !!newSession });
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        clearTimeout(timeout);
      });

      // Fetch current session
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          console.log("AuthProvider: Session fetched", { hasSession: !!session });
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          clearTimeout(timeout);
        })
        .catch((error) => {
          console.error("AuthProvider: Error fetching session", error);
          setLoading(false);
          clearTimeout(timeout);
        });

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("AuthProvider: Critical error during initialization", error);
      setLoading(false);
      clearTimeout(timeout);
      return () => {};
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
