import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Scissors } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InputOTP, InputOTPGroup, InputOTPSlot,
} from "@/components/ui/input-otp";

// Always redirect back to the deployed app, not whatever origin opened the login page.
// Set VITE_APP_URL in your Vercel environment variables to your production URL.
// Falls back to the current origin so local dev still works.
const APP_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: AuthPage,
});

function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, "");
  const maxLen = cleaned.startsWith("+") ? 13 : 11;
  return cleaned.slice(0, maxLen);
}

type View = "signin" | "signup" | "forgot" | "verify";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect to auth to trigger the logic below
          redirectTo: `${APP_ORIGIN}/auth`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setGoogleLoading(false);
      toast.error(error.message ?? "Google sign-in failed");
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      // Fetch the role for the user who just signed in
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      const role = roleData?.role;

      // Navigate based on role
      if (role === 'admin') {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({ to: "/my-bookings" });
      }
    });
  }, [navigate]);

  const goAfterAuth = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (search.redirect) {
      navigate({ to: search.redirect });
      return;
    }
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    navigate({ to: role ? "/admin/dashboard" : "/my-bookings" });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // "Invalid login credentials" is also returned when the account exists but
      // was created with Google (no password set). Give a helpful hint.
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        toast.error(
          "Couldn't sign in. If you signed up with Google, use the \"Continue with Google\" button above instead.",
          { duration: 6000 }
        );
        return;
      }
      return toast.error(error.message);
    }
    toast.success("Welcome back!");
    await goAfterAuth();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizePhPhone(phone);
    if (!normalizedPhone) {
      toast.error("Enter a valid PH mobile number, e.g. 09171234567");
      return;
    }

    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { phone: normalizedPhone },
        emailRedirectTo: `${APP_ORIGIN}/auth`, // Ensure they come back here to verify
      },
    });
    setLoading(false);

    if (error) return toast.error(error.message);

    // Supabase automatically sends the email template if "Confirm email" is ON
    // The session will be null because the user is not confirmed yet
    if (!signUpData.session) {
      toast.success("Account created — please check your email for the verification code.");
      setOtpCode("");
      setView("verify"); // This switches your UI to the OTP input screen
      return;
    }

    // Email confirmation is OFF — Supabase returns a session immediately
    // Redirect straight to the dashboard
    toast.success("Account created! Welcome!");
    await goAfterAuth();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setVerifyLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "signup" });
    setVerifyLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Email verified!");
    await goAfterAuth();
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Code resent — check your email.");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) return toast.error(error.message);
    toast.success("If that email has an account, a reset link is on its way.");
    setView("signin");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-6 w-6" />
          </div>
          <CardTitle>Southside Barbers Admin</CardTitle>
          <CardDescription>
            {view === "verify"
              ? "Enter the code we emailed you"
              : view === "forgot"
                ? "Reset your password"
                : "The first account created becomes the admin."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === "verify" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                We sent a 6-digit verification code to <span className="font-medium text-foreground">{email}</span>.
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={verifyLoading || otpCode.length !== 6}>
                {verifyLoading ? "Verifying…" : "Verify email"}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button type="button" className="text-muted-foreground underline underline-offset-2" onClick={() => setView("signup")}>
                  Back
                </button>
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 disabled:opacity-50"
                  disabled={resendLoading}
                  onClick={handleResendCode}
                >
                  {resendLoading ? "Resending…" : "Resend code"}
                </button>
              </div>
            </form>
          ) : view === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Card>
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? "Sending…" : "Send reset link"}
                </Button>
              </Card>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => setView("signin")}
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="mb-3 w-full"
                onClick={handleGoogle}
                disabled={googleLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </Button>
              <div className="relative mb-3">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or email</span>
                </div>
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-3 pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                          onClick={() => setView("forgot")}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-3 pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email">Email</Label>
                      <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-phone">Mobile number</Label>
                      <Input
                        id="su-phone"
                        type="tel"
                        required
                        inputMode="numeric"
                        placeholder="09171234567"
                        maxLength={13}
                        value={phone}
                        onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Philippine format, e.g. 09171234567 or +639171234567</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-password">Password (min 6 chars)</Label>
                      <Input id="su-password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating…" : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}