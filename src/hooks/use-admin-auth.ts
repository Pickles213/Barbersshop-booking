import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async (u: User | null) => {
      if (!u) {
        if (!mounted) return;
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!mounted) return;
      setUser(u);
      setIsAdmin(!!data);
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => check(data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      check(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, loading };
}