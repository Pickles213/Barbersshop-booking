import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/barber-test")({
  ssr: false,
  component: BarberTestPage,
});

const ALL_PERMISSIONS = [
  "calendar.view",
  "bookings.view_own",
  "bookings.update_own_status",
  "schedule.view_own",
  "schedule.edit_own",
  "time_off.request_own",
  "reviews.view_own",
];

function BarberTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [barberRow, setBarberRow] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const runCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("role");
      if (roleErr) throw roleErr;
      setRoles((roleRows ?? []).map((r) => r.role));

      const { data: permData, error: permErr } = await supabase.rpc("get_my_permissions");
      if (permErr) throw permErr;
      setPermissions(permData ?? []);

      const { data: barber, error: barberErr } = await supabase
        .from("barbers")
        .select("id, name")
        .eq("user_id", user?.id ?? "")
        .maybeSingle();
      if (barberErr) throw barberErr;
      setBarberRow(barber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold">Not logged in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log in as your test barber account first, then come back here.
        </p>
        <Button asChild className="mt-4">
          <Link to="/auth" search={{ redirect: "/barber-test" }}>
            Go to login
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Barber RBAC test</CardTitle>
          <CardDescription>
            Logged in as <span className="font-mono">{user.email}</span> ({user.id})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runCheck} disabled={checking}>
            {checking ? "Checking…" : "Check my roles & permissions"}
          </Button>
        </CardContent>
      </Card>

      {permissions !== null && permissions.length === 0 && (
        <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base text-amber-800 dark:text-amber-300">
              Testing helper: No permissions resolved
            </CardTitle>
            <CardDescription>
              Your account currently has the <span className="font-semibold text-foreground">staff</span> role but is not linked to a barber profile, and has no permissions assigned. Run the SQL below in your Supabase SQL Editor to configure this account for testing:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded bg-muted p-4 text-xs font-mono select-all">
{`-- 1. Assign the legacy 'barber' role to your user
INSERT INTO public.user_roles (user_id, role)
VALUES ('${user.id}', 'barber')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Link your user account to the barber named 'Ian'
UPDATE public.barbers
SET user_id = '${user.id}'
WHERE name = 'Ian';

-- 3. Assign the new custom 'Barber' role to your user
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT '${user.id}', id
FROM public.roles
WHERE name = 'Barber'
ON CONFLICT DO NOTHING;`}
            </pre>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {roles !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles (user_roles)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {roles.length === 0 ? (
              <span className="text-sm text-muted-foreground">No roles assigned</span>
            ) : (
              roles.map((r) => <Badge key={r}>{r}</Badge>)
            )}
          </CardContent>
        </Card>
      )}

      {barberRow !== undefined && barberRow !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked barber row</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {barberRow.name} <span className="text-muted-foreground">({barberRow.id})</span>
          </CardContent>
        </Card>
      )}

      {permissions !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolved permissions (get_my_permissions)</CardTitle>
            <CardDescription>Green = granted, gray = not granted</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ALL_PERMISSIONS.map((key) => {
              const granted = permissions.includes(key);
              return (
                <Badge
                  key={key}
                  variant={granted ? "default" : "outline"}
                  className={granted ? "bg-green-600 hover:bg-green-600" : "text-muted-foreground"}
                >
                  {key}
                </Badge>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
