
import { useEffect, useState } from "react";

import AssessmentWorkspace from "./components/AssessmentWorkspace";
import ProgressDashboard from "./components/ProgressDashboard";
import InterviewPractice from "./components/InterviewPractice";
import GenerateAssessment from "./components/GenerateAssessment";
import DeveloperProfile from "./components/DeveloperProfile";
import ProfileHeader from "./components/ProfileHeader";
import AccountSettings from "./components/AccountSettings";

import { challenges } from "./data/challenges";
import { getCloudAssessments } from "./lib/cloudProgress";
import { getAssessmentResults } from "./utils/progressStorage";

import {
  saveAssessmentSession,
  getAssessmentSession,
} from "./utils/assessmentSession";

import { readUserStorage } from "./utils/userStorage";

import {
  LayoutDashboard,
  Code2,
  Mic,
  BarChart3,
  Settings,
  ArrowRight,
  Clock3,
  CheckCircle2,
  Menu,
  X,
  Sparkles,
  UserRound,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// PREDEFINED ASSESSMENTS
const assessments = [
  {
    id: 1,
    title: "Debug a Java REST API",
    category: "Backend Development",
    description:
      "Investigate a broken API, fix validation bugs and verify responses.",
    difficulty: "Beginner",
    duration: "45 min",
  },
  {
    id: 2,
    title: "Fix a SQL Query",
    category: "Database",
    description:
      "Find incorrect joins and filtering logic in an employee database.",
    difficulty: "Intermediate",
    duration: "30 min",
  },
  {
    id: 3,
    title: "Frontend API Integration",
    category: "Frontend",
    description:
      "Repair an incomplete React application with API integration issues.",
    difficulty: "Intermediate",
    duration: "60 min",
  },
];

// SIDEBAR NAVIGATION
const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Assessments", icon: Code2 },
  { label: "Interview Practice", icon: Mic },
  { label: "My Progress", icon: BarChart3 },
  { label: "My Profile", icon: UserRound },
  { label: "Settings", icon: Settings },
];

// CREATE INTERVIEW CONTEXT USING ACCOUNT-SPECIFIC DRAFTS
function buildInterviewContext(assessment) {
  if (!assessment) return null;

  const challenge =
    assessment.generatedChallenge ||
    challenges[assessment.id];

  if (!challenge) return null;

  const originalFiles = {
    ...(challenge.files || {}),
  };

  const files = { ...originalFiles };

  // Never use the old shared localStorage draft.
  const savedDraft = readUserStorage(
    `draft:${assessment.id}`,
    null
  );

  if (
    savedDraft &&
    typeof savedDraft === "object" &&
    !Array.isArray(savedDraft)
  ) {
    for (const filename of Object.keys(originalFiles)) {
      if (typeof savedDraft[filename] === "string") {
        files[filename] = savedDraft[filename];
      }
    }
  }

  return {
    title: assessment.title,
    description: [
      challenge.description ||
        assessment.description ||
        "",
      ...(challenge.instructions || []),
    ].join("\n"),

    codeSummary: Object.entries(files)
      .map(
        ([filename, code]) =>
          `File: ${filename}\n${code}`
      )
      .join("\n\n")
      .slice(0, 10000),
  };
}

export default function App() {
  const [activePage, setActivePage] =
    useState("Dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // Restore this user's assessment session.
  const [selectedAssessment, setSelectedAssessment] =
    useState(() => getAssessmentSession());

  const [interviewAssessment, setInterviewAssessment] =
    useState(() =>
      buildInterviewContext(getAssessmentSession())
    );

  // Local progress remains useful for restoring
  // submitted workspace state.
  const [progress, setProgress] =
    useState(() => getAssessmentResults());

  // Dashboard statistics now come from Supabase.
  const [cloudAssessments, setCloudAssessments] =
    useState([]);

  const [cloudStatus, setCloudStatus] =
    useState("loading");

  const [cloudError, setCloudError] =
    useState("");

  const [cloudRefreshCount, setCloudRefreshCount] =
    useState(0);

  // Fetch cloud assessment statistics whenever
  // Dashboard opens or the refresh button is clicked.
  useEffect(() => {
    if (activePage !== "Dashboard") return;

    let cancelled = false;

    async function loadDashboardStats() {
      try {
        const rows = await getCloudAssessments();

        if (cancelled) return;

        setCloudAssessments(
          Array.isArray(rows) ? rows : []
        );
        setCloudError("");
        setCloudStatus("ready");
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Unable to load Dashboard statistics:",
          error
        );

        setCloudError(
          error.message ||
            "Could not load your cloud statistics."
        );

        setCloudStatus("error");
      }
    }

    loadDashboardStats();

    return () => {
      cancelled = true;
    };
  }, [activePage, cloudRefreshCount]);

  const savedAssessment = getAssessmentSession();

  // Statistics are calculated exclusively from
  // the signed-in user's cloud assessment rows.
  const completedCount = cloudAssessments.filter(
    (row) => row.status === "completed"
  ).length;

  const attemptsCount = cloudAssessments.length;

  const savedAssessmentResult = savedAssessment
    ? progress[savedAssessment.id]
    : null;

  const hasSubmittedAssessment = Boolean(
    savedAssessmentResult?.completed &&
      savedAssessmentResult?.evaluationType ===
        "ai-static-review"
  );

  const refreshProgress = () => {
    setProgress(getAssessmentResults());
  };

  const refreshCloudDashboard = () => {
    setCloudStatus("loading");
    setCloudError("");

    setCloudRefreshCount(
      (previous) => previous + 1
    );
  };

  // SIDEBAR NAVIGATION
  const choosePage = (page) => {
    refreshProgress();

    if (page === "Dashboard") {
      refreshCloudDashboard();
    }

    setActivePage(page);
    setSidebarOpen(false);

    if (page === "Interview Practice") {
      setInterviewAssessment(null);
    }
  };

  // OPEN ASSESSMENT
  const openAssessment = (assessment) => {
    if (!assessment?.id) return;

    saveAssessmentSession(assessment);

    setSelectedAssessment(assessment);
    setActivePage("Assessments");
    setSidebarOpen(false);

    setInterviewAssessment(
      buildInterviewContext(assessment)
    );
  };

  // START INTERVIEW FROM ASSESSMENT WORKSPACE
  const startProjectInterview = (context) => {
    setInterviewAssessment(context);
    setActivePage("Interview Practice");
    setSidebarOpen(false);
  };

  // START INTERVIEW FROM SAVED ASSESSMENT
  const startSavedInterview = () => {
    const previous = getAssessmentSession();

    if (!previous) return;

    setInterviewAssessment(
      buildInterviewContext(previous)
    );

    setActivePage("Interview Practice");
    setSidebarOpen(false);
  };

  // CLOSE WORKSPACE WITHOUT DELETING ITS DRAFT
  const closeAssessment = () => {
    refreshProgress();

    setSelectedAssessment(null);
    setActivePage("Assessments");
    setSidebarOpen(false);
  };

  // DASHBOARD DISPLAY VALUES
  const completedDisplay =
    cloudStatus === "loading"
      ? "..."
      : cloudStatus === "error"
        ? "—"
        : completedCount;

  const attemptsDisplay =
    cloudStatus === "loading"
      ? "..."
      : cloudStatus === "error"
        ? "—"
        : attemptsCount;

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="flex min-h-screen">
        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation overlay"
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64
            transform border-r border-slate-200 bg-white
            transition-transform md:static md:translate-x-0
            ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full"
            }`}
        >
          {/* LOGO */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-7">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-600 p-2 text-white">
                <Code2 size={22} />
              </div>

              <span className="text-xl font-bold tracking-tight">
                DevArena{" "}
                <span className="text-indigo-600">
                  AI
                </span>
              </span>
            </div>

            <button
              type="button"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          {/* NAVIGATION */}
          <nav className="space-y-2 px-4 py-6">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                type="button"
                key={label}
                onClick={() => choosePage(label)}
                aria-current={
                  activePage === label
                    ? "page"
                    : undefined
                }
                className={`flex w-full items-center gap-3 rounded-xl
                  px-4 py-3 text-left text-sm font-medium transition
                  ${
                    activePage === label
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </nav>

          {/* SIDEBAR INFORMATION */}
          <div className="mx-4 mt-8 rounded-2xl bg-indigo-50 p-4">
            <Sparkles
              className="text-indigo-600"
              size={22}
            />

            <p className="mt-3 text-sm font-semibold">
              Practice like a developer
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              Solve real engineering tasks,
              not just isolated questions.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1">
          {/* HEADER */}
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-5 md:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={23} />
              </button>

              <h1 className="font-semibold">
                {activePage === "Assessments" &&
                selectedAssessment
                  ? "Assessment Workspace"
                  : activePage}
              </h1>
            </div>

            <ProfileHeader
              key={activePage}
              onNavigate={choosePage}
            />
          </header>

          {/* PAGE CONTENT */}
          <div className="mx-auto max-w-6xl p-5 md:p-10">
            {activePage === "Assessments" &&
            selectedAssessment ? (
              <AssessmentWorkspace
                key={String(selectedAssessment.id)}
                assessment={selectedAssessment}
                onBack={closeAssessment}
                onResultSaved={refreshProgress}
                onCodeChange={setInterviewAssessment}
                onStartInterview={startProjectInterview}
              />
            ) : activePage === "Dashboard" ||
              activePage === "Assessments" ? (
              <>
                {/* HERO */}
                <div className="rounded-3xl bg-slate-900 p-7 text-white md:p-10">
                  <p className="text-sm font-medium text-indigo-300">
                    ENGINEERING PRACTICE PLATFORM
                  </p>

                  <h2 className="mt-4 max-w-2xl text-3xl font-bold md:text-4xl">
                    Learn to solve problems like a real
                    software engineer.
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
                    Debug existing projects, improve code,
                    get guided assistance and practice
                    technical explanations.
                  </p>

                  <button
                    type="button"
                    onClick={() => choosePage("Assessments")}
                    className="mt-7 flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold hover:bg-indigo-400"
                  >
                    Explore assessments
                    <ArrowRight size={17} />
                  </button>
                </div>

                {/* DASHBOARD STATISTICS */}
                {activePage === "Dashboard" && (
                  <>
                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Your Practice Overview
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Assessment statistics from Supabase
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={refreshCloudDashboard}
                        disabled={cloudStatus === "loading"}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RefreshCw
                          size={15}
                          className={
                            cloudStatus === "loading"
                              ? "animate-spin"
                              : ""
                          }
                        />
                        Refresh
                      </button>
                    </div>

                    {cloudError && (
                      <div
                        role="alert"
                        className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                      >
                        <AlertCircle
                          size={18}
                          className="shrink-0"
                        />

                        <span>
                          Could not load cloud statistics:
                          {" "}
                          {cloudError}
                        </span>
                      </div>
                    )}

                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {[
                        [
                          "Available Challenges",
                          assessments.length,
                          Code2,
                        ],
                        [
                          "Completed",
                          completedDisplay,
                          CheckCircle2,
                        ],
                        [
                          "Attempts Recorded",
                          attemptsDisplay,
                          Clock3,
                        ],
                      ].map(([label, value, Icon]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-slate-200 bg-white p-6"
                        >
                          <Icon
                            className="text-indigo-600"
                            size={22}
                          />

                          <p className="mt-4 text-2xl font-bold">
                            {value}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* RESUME PREVIOUS ASSESSMENT */}
                {savedAssessment && (
                  <section className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-indigo-700">
                          CONTINUE WHERE YOU LEFT OFF
                        </p>

                        <h3 className="mt-2 text-lg font-bold text-slate-900">
                          {savedAssessment.title}
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                          {hasSubmittedAssessment
                            ? "Your assessment has been submitted. You can review it or continue to the AI interview."
                            : "Your previous assessment is available to resume."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            openAssessment(savedAssessment)
                          }
                          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                        >
                          {hasSubmittedAssessment
                            ? "Review Assessment"
                            : "Resume Assessment"}
                        </button>

                        {hasSubmittedAssessment && (
                          <button
                            type="button"
                            onClick={startSavedInterview}
                            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white"
                          >
                            <Mic size={17} />
                            Start AI Interview
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* AI ASSESSMENT GENERATOR */}
                <div className="mt-8">
                  <GenerateAssessment onStart={openAssessment} />
                </div>

                {/* ASSESSMENTS HEADING */}
                <div className="mb-5 mt-10">
                  <h3 className="text-xl font-bold">
                    {activePage === "Dashboard"
                      ? "Recommended assessments"
                      : "All assessments"}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Start with a realistic development challenge.
                  </p>
                </div>

                {/* PREDEFINED ASSESSMENTS */}
                <div className="grid gap-5 lg:grid-cols-3">
                  {assessments.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {item.difficulty}
                      </span>

                      <p className="mt-5 text-xs font-medium text-slate-500">
                        {item.category}
                      </p>

                      <h4 className="mt-2 text-lg font-bold">
                        {item.title}
                      </h4>

                      <p className="mt-3 min-h-16 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>

                      <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
                        <Clock3 size={15} />
                        {item.duration}
                      </div>

                      <button
                        type="button"
                        onClick={() => openAssessment(item)}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        View challenge
                        <ArrowRight size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              </>
            ) : activePage === "My Profile" ? (
              <DeveloperProfile />
            ) : activePage === "My Progress" ? (
              <ProgressDashboard />
            ) : activePage === "Interview Practice" ? (
              <InterviewPractice
                key={
                  interviewAssessment?.title || "general"
                }
                assessment={interviewAssessment}
              />
            ) : activePage === "Settings" ? (
              <AccountSettings />
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-8">
                <h2 className="text-2xl font-bold">
                  {activePage}
                </h2>

                <p className="mt-3 text-slate-600">
                  This section is currently unavailable.
                </p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
