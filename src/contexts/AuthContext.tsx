import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has admin role
  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error("Error checking admin role:", err);
      return false;
    }
  };

  useEffect(() => {
    let active = true;

    /**
     * Resolve the admin role OUTSIDE the auth callback.
     *
     * supabase-js awaits the onAuthStateChange callback from inside
     * `_emitInitialSession`, which runs while the auth lock is held. Any
     * Supabase query needs an access token, so it calls `getSession()`, which
     * re-enters `_acquireLock` and waits on the pending in-lock operation — the
     * very callback that is waiting on the query. That circular wait never
     * resolves (the 10s `lockAcquireTimeout` only guards the initial lock
     * acquisition, not the re-entrant path), so `loading` stayed true forever
     * and /admin showed its spinner indefinitely for any signed-in user.
     *
     * setTimeout gets the query out of that call stack, after the lock is free.
     */
    const resolveAdminRole = (userId: string | null) => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      setTimeout(async () => {
        const adminStatus = await checkAdminRole(userId);
        if (active) setIsAdmin(adminStatus);
      }, 0);
    };

    // Set up auth state listener FIRST.
    // Deliberately NOT an async callback — see resolveAdminRole above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);
        resolveAdminRole(session?.user?.id ?? null);
        setLoading(false);
      }
    );

    // Then get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);
        resolveAdminRole(session?.user?.id ?? null);
      })
      .catch((error) => {
        // Never leave the app stuck on a spinner because the session lookup failed.
        console.error("Error getting session:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
