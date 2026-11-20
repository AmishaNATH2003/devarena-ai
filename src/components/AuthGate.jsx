
import { useEffect, useState } from "react";
import {
  Code2,
  Mail,
  LockKeyhole,
  UserRound,
  LogOut,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // INITIAL_SESSION restores an existing login.
    // PASSWORD_RECOVERY handles password reset links.
    const { data } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);

        if (event === "PASSWORD_RECOVERY") {
          setMode("update-password");
          setPassword("");
        }

        if (event === "INITIAL_SESSION") {
          setInitializing(false);
        }
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        if (name.trim().length < 2) {
          throw new Error(
            "Please enter your full name."
          );
        }

        if (password.length < 8) {
          throw new Error(
            "Your password must contain at least 8 characters."
          );
        }

        const { data, error: authError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: name.trim(),
              },
              emailRedirectTo: window.location.origin,
            },
          });

        if (authError) throw authError;

        setPassword("");

        if (!data.session) {
          setMessage(
            "Registration received. Please check your email and follow the verification link before logging in."
          );
        } else {
          setMessage("Your account was created.");
        }
      }

      if (mode === "login") {
        const { error: authError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (authError) throw authError;

        setPassword("");
      }

      if (mode === "forgot") {
        const { error: authError } =
          await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo: window.location.origin,
            }
          );

        if (authError) throw authError;

        setMessage(
          "If an account exists for this email address, you will receive password reset instructions."
        );
      }

      if (mode === "update-password") {
        if (!session) {
          throw new Error(
            "Your password reset session has expired. Request another reset email."
          );
        }

        if (password.length < 8) {
          throw new Error(
            "Please use a password of at least 8 characters."
          );
        }

        const { error: authError } =
          await supabase.auth.updateUser({
            password,
          });

        if (authError) throw authError;

        setPassword("");
        setMode("login");
        setMessage(
          "Password updated successfully. You are signed in."
        );
      }
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError("");

    const { error: authError } =
      await supabase.auth.signOut();

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSession(null);
    setMode("login");
    setPassword("");
    setLoading(false);
  }

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-indigo-600">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-medium">
            Loading DevArena AI...
          </span>
        </div>
      </div>
    );
  }

  // Allow password recovery even when a temporary
  // authenticated session was created by the reset link.
  if (session && mode !== "update-password") {
    return (
      <div>
        <div className="fixed right-3 top-3 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-md">
          <span className="hidden max-w-48 truncate px-2 text-xs text-slate-600 sm:block">
            {session.user.email}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>

        {children}
      </div>
    );
  }

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const isUpdatePassword = mode === "update-password";

  const heading = isSignup
    ? "Create your account"
    : isForgot
      ? "Reset your password"
      : isUpdatePassword
        ? "Choose a new password"
        : "Welcome back";

  const description = isSignup
    ? "Start practicing real software engineering skills."
    : isForgot
      ? "Enter your email to receive a reset link."
      : isUpdatePassword
        ? "Enter a new password for your account."
        : "Sign in to continue your DevArena AI journey.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-indigo-600 p-3 text-white">
            <Code2 size={25} />
          </div>

          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            DevArena{" "}
            <span className="text-indigo-600">AI</span>
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <h1 className="text-2xl font-bold text-slate-900">
            {heading}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mt-5 rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-700"
            >
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >
            {isSignup && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full name
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4">
                  <UserRound
                    size={19}
                    className="text-slate-400"
                  />

                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Enter your full name"
                    className="w-full py-3 outline-none"
                  />
                </div>
              </div>
            )}

            {!isUpdatePassword && (
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4">
                  <Mail
                    size={19}
                    className="text-slate-400"
                  />

                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    className="w-full py-3 outline-none"
                  />
                </div>
              </div>
            )}

            {!isForgot && (
              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {isUpdatePassword
                    ? "New password"
                    : "Password"}
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4">
                  <LockKeyhole
                    size={19}
                    className="text-slate-400"
                  />

                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isSignup || isUpdatePassword
                        ? "new-password"
                        : "current-password"
                    }
                    required
                    minLength={isSignup || isUpdatePassword ? 8 : undefined}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    className="min-w-0 flex-1 py-3 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="text-slate-500"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === "login" && (
              <button
                type="button"
                onClick={() => changeMode("forgot")}
                className="text-sm font-semibold text-indigo-600 hover:underline"
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              {isSignup
                ? "Create Account"
                : isForgot
                  ? "Send Reset Email"
                  : isUpdatePassword
                    ? "Update Password"
                    : "Sign In"}
            </button>
          </form>

          {!isUpdatePassword && (
            <div className="mt-7 text-center text-sm text-slate-600">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("signup")}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Sign Up
                  </button>
                </>
              ) : isSignup ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("login")}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className="inline-flex items-center gap-2 font-semibold text-indigo-600"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </button>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Practice engineering assessments and interviews
          with AI-powered feedback.
        </p>
      </div>
    </div>
  );
}
