
import { useEffect, useRef, useState } from "react";

import {
  ChevronDown,
  UserRound,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function ProfileHeader({ onNavigate }) {
  const [profile, setProfile] = useState({
    name: "",
    role: "",
    email: "",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const menuRef = useRef(null);

  // Load the authenticated user's profile.
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user || cancelled) {
        return;
      }

      const user = authData.user;

      const { data, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, target_role, headline")
          .eq("id", user.id)
          .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error(
          "Unable to load profile header:",
          profileError.message
        );
      }

      const fallbackName =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Developer";

      setProfile({
        name: data?.full_name || fallbackName,
        role:
          data?.target_role ||
          data?.headline ||
          "Developer",
        email: user.email || "",
      });
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    if (!menuOpen) return;

    function handleOutsideClick(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [menuOpen]);

  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  function navigateTo(page) {
    setMenuOpen(false);
    onNavigate(page);
  }

  // Supabase Auth handles the actual sign-out.
  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const { error: authError } =
        await supabase.auth.signOut();

      if (authError) {
        throw authError;
      }

      setMenuOpen(false);

      // AuthGate listens for SIGNED_OUT and
      // automatically displays the login screen.
    } catch (err) {
      setError(
        err.message || "Unable to sign out."
      );
      setLoggingOut(false);
    }
  }

  return (
    <div
      ref={menuRef}
      className="relative shrink-0"
    >
      {/* PROFILE TRIGGER */}
      <button
        type="button"
        onClick={() => {
          setError("");
          setMenuOpen((previous) => !previous);
        }}
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
          {initials || <UserRound size={20} />}
        </div>

        <div className="hidden min-w-0 sm:block">
          <p className="max-w-36 truncate text-sm font-semibold text-slate-900">
            {profile.name || "My Profile"}
          </p>

          <p className="max-w-36 truncate text-xs text-slate-500">
            {profile.role || "Developer"}
          </p>
        </div>

        <ChevronDown
          size={17}
          className={`hidden text-slate-400 transition-transform sm:block ${
            menuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* DROPDOWN */}
      {menuOpen && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          {/* USER INFORMATION */}
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {profile.name || "Developer"}
            </p>

            <p className="mt-1 truncate text-xs text-slate-500">
              {profile.email}
            </p>

            <p className="mt-2 truncate text-xs font-medium text-indigo-600">
              {profile.role}
            </p>
          </div>

          <div className="space-y-1 py-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => navigateTo("My Profile")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              <UserRound size={18} />
              My Profile
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => navigateTo("Settings")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Settings size={18} />
              Settings
            </button>
          </div>

          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <LogOut size={18} />
              )}

              {loggingOut ? "Signing out..." : "Logout"}
            </button>

            {error && (
              <p
                role="alert"
                className="px-3 py-2 text-xs text-red-600"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
