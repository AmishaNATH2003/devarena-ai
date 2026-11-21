
import { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const { data, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!cancelled) {
          setUser(data.user);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load account.");
        }
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  async function updatePassword(event) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) throw updateError;

      setNewPassword("");
      setConfirmPassword("");

      setMessage("Your password was updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update password.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setError("");

    try {
      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) throw signOutError;
    } catch (err) {
      setError(err.message || "Unable to sign out.");
      setSigningOut(false);
    }
  }

  if (loadingUser) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2
          size={30}
          className="animate-spin text-indigo-600"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600">
          ACCOUNT PREFERENCES
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Settings
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Manage your DevArena AI account and security.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {/* ACCOUNT INFORMATION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <UserRound className="text-indigo-600" />

          <h3 className="text-lg font-semibold">
            Account Information
          </h3>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              FULL NAME
            </p>

            <p className="mt-2 text-sm font-medium">
              {user?.user_metadata?.full_name ||
                "Not provided"}
            </p>
          </div>

          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Mail size={14} />
              EMAIL ADDRESS
            </p>

            <p className="mt-2 break-all text-sm font-medium">
              {user?.email || "Unavailable"}
            </p>
          </div>

          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <ShieldCheck size={14} />
              VERIFICATION STATUS
            </p>

            <p className="mt-2 text-sm font-medium">
              {user?.email_confirmed_at
                ? "Verified"
                : "Not verified"}
            </p>
          </div>
        </div>
      </section>

      {/* PASSWORD MANAGEMENT */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <LockKeyhole className="text-indigo-600" />

          <h3 className="text-lg font-semibold">
            Change Password
          </h3>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Choose a strong password to protect your account.
          Depending on your account settings, Supabase may
          require additional verification.
        </p>

        <form
          onSubmit={updatePassword}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-medium"
            >
              New Password
            </label>

            <div className="flex items-center rounded-xl border border-slate-200 px-4">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                className="min-w-0 flex-1 py-3 text-sm outline-none"
                placeholder="Minimum 8 characters"
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
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium"
            >
              Confirm New Password
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
              placeholder="Re-enter your new password"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !user}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving && (
              <Loader2 size={17} className="animate-spin" />
            )}

            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      {/* SESSION MANAGEMENT */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold">
          Session Management
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Sign out of DevArena AI on this device.
          Your cloud progress will remain saved.
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {signingOut ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <LogOut size={17} />
          )}

          {signingOut ? "Signing Out..." : "Sign Out"}
        </button>
      </section>
    </div>
  );
}
