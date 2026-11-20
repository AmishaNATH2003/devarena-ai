
import { useState } from "react";

import AssessmentWorkspace from "./components/AssessmentWorkspace";
import ProgressDashboard from "./components/ProgressDashboard";
import InterviewPractice from "./components/InterviewPractice";
import GenerateAssessment from "./components/GenerateAssessment";

import { challenges } from "./data/challenges";
import { getAssessmentResults } from "./utils/progressStorage";
import {
  saveAssessmentSession,
  getAssessmentSession,
} from "./utils/assessmentSession";

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
} from "lucide-react";

// Predefined assessments.
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

// Sidebar navigation.
const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Assessments", icon: Code2 },
  { label: "Interview Practice", icon: Mic },
  { label: "My Progress", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

// Create interview context from the candidate's saved code.
function buildInterviewContext(assessment) {
  if (!assessment) return null;

  const challenge =
    assessment.generatedChallenge ||
    challenges[assessment.id];

  let files = { ...(challenge?.files || {}) };

  // Prefer the latest code saved by Monaco Editor.
  try {
    const savedDraft = localStorage.getItem(
      `devarena-draft-${assessment.id}`
    );

    if (savedDraft) {
      const parsed = JSON.parse(savedDraft);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        const validEntries = Object.entries(parsed).filter(
          ([filename, code]) =>
            typeof filename === "string" &&
            typeof code === "string"
        );

        files = {
          ...files,
          ...Object.fromEntries(validEntries),
        };
      }
    }
  } catch {
    // Use original files when browser storage is unavailable.
  }

  return {
    title: assessment.title,
    description: [
      challenge?.description || assessment.description || "",
      ...(challenge?.instructions || []),
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
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Restore previously opened assessment.
  const [selectedAssessment, setSelectedAssessment] =
    useState(() => getAssessmentSession());

  // Restore interview context from the saved project.
  const [interviewAssessment, setInterviewAssessment] =
    useState(() =>
      buildInterviewContext(getAssessmentSession())
    );

  // Saved assessment results.
  const [progress, setProgress] = useState(
    () => getAssessmentResults()
  );

  // Keep a reference to the saved assessment.
  const savedAssessment = getAssessmentSession();

  const results = Object.values(progress);

  const completedCount = results.filter(
    (result) => result.completed
  ).length;

  const savedAssessmentResult = savedAssessment
    ? progress[savedAssessment.id]
    : null;

  const hasSubmittedAssessment = Boolean(
    savedAssessmentResult?.completed &&
    savedAssessmentResult?.evaluationType ===
      "ai-static-review"
  );

  // Refresh saved assessment data.
  const refreshProgress = () => {
    setProgress(getAssessmentResults());
  };

  // Sidebar navigation.
  const choosePage = (page) => {
  refreshProgress();
  setActivePage(page);
  setSidebarOpen(false);

  if (page === "Interview Practice") {
    setInterviewAssessment(null);
  }
};

  // Open a predefined or AI-generated assessment.
  const openAssessment = (assessment) => {
    setSelectedAssessment(assessment);
    setActivePage("Assessments");
    setSidebarOpen(false);

    saveAssessmentSession(assessment);

    // Restore latest saved source code for interviewing.
    setInterviewAssessment(
      buildInterviewContext(assessment)
    );
  };

  // Start an interview from the assessment workspace.
  const startProjectInterview = (context) => {
    setInterviewAssessment(context);
    setActivePage("Interview Practice");
    setSidebarOpen(false);
  };

  // Start an interview from the Resume Assessment card.
  const startSavedInterview = () => {
    const previous = getAssessmentSession();

    if (!previous) return;

    setInterviewAssessment(
      buildInterviewContext(previous)
    );

    setActivePage("Interview Practice");
    setSidebarOpen(false);
  };

  // Return to assessment list without deleting the draft.
  const closeAssessment = () => {
    refreshProgress();
    setSelectedAssessment(null);
    setActivePage("Assessments");
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="flex min-h-screen">

        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
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
              Solve real engineering tasks, not just isolated questions.
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

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
              D
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div className="mx-auto max-w-6xl p-5 md:p-10">

            {/* ASSESSMENT WORKSPACE */}
            {activePage === "Assessments" &&
            selectedAssessment ? (
              <AssessmentWorkspace
                key={selectedAssessment.id}
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
                    Learn to solve problems like a real software engineer.
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
                  <div className="mt-7 grid gap-4 sm:grid-cols-3">
                    {[
                      [
                        "Available Challenges",
                        assessments.length,
                        Code2,
                      ],
                      [
                        "Completed",
                        completedCount,
                        CheckCircle2,
                      ],
                      [
                        "Attempts Recorded",
                        results.length,
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
            ) : activePage === "My Progress" ? (
              <ProgressDashboard />
            ) : activePage === "Interview Practice" ? (
              <InterviewPractice
                key={interviewAssessment?.title || "general"}
                assessment={interviewAssessment}
              />
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-8">
                <h2 className="text-2xl font-bold">
                  {activePage}
                </h2>

                <p className="mt-3 text-slate-600">
                  This section will be implemented in an
                  upcoming development stage.
                </p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
