import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logUserAction } from "@/lib/logUserAction";

interface GoogleSheetsSession {
  id: string;
  email: string;
  type: 'google_sheets';
  timestamp: string;
}

interface AuthContextValue {
  user: User | GoogleSheetsSession | null;
  session: Session | null;
  loading: boolean;
  isGoogleSheetsUser: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | GoogleSheetsSession | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGoogleSheetsUser, setIsGoogleSheetsUser] = useState(false);

  useEffect(() => {
    // Check for Google Sheets session
    const checkGoogleSheetsSession = () => {
      const gsSession = localStorage.getItem('google_sheets_session');
      if (gsSession) {
        try {
          const parsedSession = JSON.parse(gsSession) as GoogleSheetsSession;
          setUser(parsedSession);
          setIsGoogleSheetsUser(true);
          return true;
        } catch (e) {
          localStorage.removeItem('google_sheets_session');
        }
      }
      return false;
    };

    // Set up auth state listener for Lovable Cloud users
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setIsGoogleSheetsUser(false);
        
        // Log login on SIGNED_IN and TOKEN_REFRESHED (returning user)
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Debounce: only log once per session (avoid duplicate logs on rapid refreshes)
          const lastLogKey = `last_login_log_${newSession.user.id}`;
          const lastLog = sessionStorage.getItem(lastLogKey);
          const now = Date.now();
          if (!lastLog || now - parseInt(lastLog) > 30 * 60 * 1000) { // 30 min debounce
            sessionStorage.setItem(lastLogKey, now.toString());
            logUserAction("login", { method: event === 'TOKEN_REFRESHED' ? 'token_refresh' : 'direct' });
          }
        }
      } else {
        // If no Lovable Cloud session, check for Google Sheets session
        if (!checkGoogleSheetsSession()) {
          setSession(null);
          setUser(null);
          setIsGoogleSheetsUser(false);
        }
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsGoogleSheetsUser(false);
      } else {
        checkGoogleSheetsSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, isGoogleSheetsUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
