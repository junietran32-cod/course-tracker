import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { GraduationCap, Loader2, Mail, ShieldCheck, Briefcase } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation } from "convex/react";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureProfile = useMutation(api.users.ensureProfile);
  const [isSettingRole, setIsSettingRole] = useState(false);

  // Signed-in users with a role go straight to the app.
  useEffect(() => {
    const u = user;
    if (!authLoading && isAuthenticated && u !== null && u !== undefined && u.role) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      // On success the effect above (or the role picker below) takes over.
    } catch {
      setError("The verification code you entered is incorrect.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRolePick = async (role: "employee" | "manager") => {
    setIsSettingRole(true);
    setError(null);
    try {
      await ensureProfile({ role });
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your role.");
      setIsSettingRole(false);
    }
  };

  const needsRole =
    isAuthenticated &&
    user !== null &&
    user !== undefined &&
    user.role === undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <GraduationCap className="size-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">
              Course Tracker
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your work email to continue
            </p>
          </div>

          <Card className="border-border/80 shadow-md">
            {step === "signIn" ? (
              <>
                <CardHeader>
                  <CardTitle className="text-lg">Sign in</CardTitle>
                  <CardDescription>
                    We'll email you a one-time verification code.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleEmailSubmit}>
                  <CardContent>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        name="email"
                        placeholder="name@company.com"
                        type="email"
                        className="pl-9"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    {error ? (
                      <p className="mt-2 text-sm text-destructive">{error}</p>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Sending code…
                        </>
                      ) : (
                        "Continue with email"
                      )}
                    </Button>
                    <p className="w-full text-center text-[11px] text-muted-foreground">
                      New here? You'll pick Employee or Manager after verifying your
                      email.
                    </p>
                  </CardFooter>
                </form>
              </>
            ) : needsRole ? (
              <>
                <CardHeader>
                  <CardTitle className="text-lg">Almost there</CardTitle>
                  <CardDescription>
                    Choose how you'll use Course Tracker. This sets up your
                    training profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <button
                    type="button"
                    disabled={isSettingRole}
                    onClick={() => handleRolePick("employee")}
                    className="flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Briefcase className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">Employee</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Apply for courses, update or withdraw applications, track
                        approvals.
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={isSettingRole}
                    onClick={() => handleRolePick("manager")}
                    className="flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <ShieldCheck className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">Manager</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Review, approve or reject course applications with a reason.
                      </span>
                    </span>
                  </button>
                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : null}
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-lg">Check your email</CardTitle>
                  <CardDescription>
                    We sent a 6-digit code to {step.email}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="flex flex-col items-center gap-4">
                    <input type="hidden" name="email" value={step.email} />
                    <input type="hidden" name="code" value={otp} />
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    {error ? (
                      <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      Didn't receive it?{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => setStep("signIn")}
                      >
                        Try again
                      </Button>
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Verifying…
                        </>
                      ) : (
                        "Verify code"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </>
            )}
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Company intranet system · Access is logged and monitored
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
