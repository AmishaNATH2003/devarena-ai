
import { useEffect, useState } from "react";
import {
  UserRound,
  BriefcaseBusiness,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const EMPTY_PROFILE = {
  full_name: "",
  headline: "",
  bio: "",
  target_role: "Software Engineer",
  experience_level: "Entry level",
  skills: [],
  github_url: "",
  linkedin_url: "",
};

export default function DeveloperProfile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [skillsText, setSkillsText] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = authData.user;

        if (!user) {
          throw new Error("Please sign in to view your profile.");
        }

        if (cancelled) return;

        setUserId(user.id);
        setEmail(user.email || "");

        const { data, error: queryError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (queryError) throw queryError;
        if (cancelled) return;

        const initialProfile = {
          ...EMPTY_PROFILE,
          full_name: user.user_metadata?.full_name || "",
          ...(data || {}),
        };

        setProfile(initialProfile);
        setSkillsText(
          Array.isArray(initialProfile.skills)
            ? initialProfile.skills.join(", ")
            : ""
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  function update(field, value) {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSuccess("");
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!userId || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const skills = [
        ...new Set(
          skillsText
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        ),
      ].slice(0, 30);

      const payload = {
        id: userId,
        full_name: profile.full_name.trim(),
        headline: profile.headline.trim(),
        bio: profile.bio.trim(),
        target_role: profile.target_role,
        experience_level: profile.experience_level,
        skills,
        github_url: profile.github_url.trim() || null,
        linkedin_url: profile.linkedin_url.trim() || null,
        updated_at: new Date().toISOString(),
      };

      for (const field of ["github_url", "linkedin_url"]) {
        if (!payload[field]) continue;

        const url = new URL(payload[field]);

        if (url.protocol !== "https:") {
          throw new Error("Profile links must use HTTPS.");
        }

        const allowedHost =
          field === "github_url"
            ? "github.com"
            : "linkedin.com";

        const hostname = url.hostname.toLowerCase();

        if (
          hostname !== allowedHost &&
          hostname !== `www.${allowedHost}`
        ) {
          throw new Error(
            `Please enter a valid ${field === "github_url" ? "GitHub" : "LinkedIn"} URL.`
          );
        }
      }

      const { error: saveError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (saveError) throw saveError;

      setProfile((previous) => ({
        ...previous,
        ...payload,
      }));

      setSuccess("Profile saved successfully!");
    } catch (err) {
      setError(err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const initials = (profile.full_name || email || "D")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8 text-indigo-600">
        <Loader2 className="animate-spin" />
        Loading your profile...
      </div>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600">
          MY ACCOUNT
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Developer Profile
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Tell us about your skills, experience, and career goals.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
            {initials || <UserRound size={30} />}
          </div>

          <div className="min-w-0">
            <h3 className="text-xl font-bold text-slate-900">
              {profile.full_name || "Developer"}
            </h3>
            <p className="mt-1 break-all text-sm text-slate-500">
              {email}
            </p>
            <p className="mt-2 text-sm text-indigo-600">
              {profile.headline || profile.target_role}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={saveProfile}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h3 className="text-xl font-semibold">
          Personal Information
        </h3>

        {error && (
          <div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mt-5 flex gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={19} className="shrink-0" />
            {success}
          </div>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Full Name
            <input
              value={profile.full_name || ""}
              onChange={(event) =>
                update("full_name", event.target.value)
              }
              required
              maxLength={100}
              className={inputClass}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Target Job Role
            <select
              value={profile.target_role || "Software Engineer"}
              onChange={(event) =>
                update("target_role", event.target.value)
              }
              className={inputClass}
            >
              <option>Software Engineer</option>
              <option>Java Backend Developer</option>
              <option>Frontend Developer</option>
              <option>Full Stack Developer</option>
              <option>Python Developer</option>
              <option>Data Analyst</option>
              <option>Machine Learning Engineer</option>
              <option>Other</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Professional Headline
            <input
              value={profile.headline || ""}
              onChange={(event) =>
                update("headline", event.target.value)
              }
              maxLength={150}
              placeholder="Aspiring Software Engineer | Java, React and SQL"
              className={inputClass}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <BriefcaseBusiness size={16} />
              Experience Level
            </span>
            <select
              value={profile.experience_level || "Entry level"}
              onChange={(event) =>
                update("experience_level", event.target.value)
              }
              className={inputClass}
            >
              <option>Student</option>
              <option>Entry level</option>
              <option>0–1 years</option>
              <option>1–3 years</option>
              <option>3+ years</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Technical Skills
            <input
              value={skillsText}
              onChange={(event) =>
                setSkillsText(event.target.value)
              }
              placeholder="Java, React, SQL, Python"
              className={inputClass}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Separate skills using commas.
            </span>
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            About Me
            <textarea
              value={profile.bio || ""}
              onChange={(event) =>
                update("bio", event.target.value)
              }
              rows={4}
              maxLength={1000}
              placeholder="Write a short introduction about yourself..."
              className={inputClass}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <ExternalLink size={16} />
              GitHub Profile
            </span>
            <input
              type="url"
              value={profile.github_url || ""}
              onChange={(event) =>
                update("github_url", event.target.value)
              }
              placeholder="https://github.com/username"
              className={inputClass}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <ExternalLink size={16} />
              LinkedIn Profile
            </span>
            <input
              type="url"
              value={profile.linkedin_url || ""}
              onChange={(event) =>
                update("linkedin_url", event.target.value)
              }
              placeholder="https://www.linkedin.com/in/username"
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={saving || !userId}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
