
import { useEffect, useState } from "react";

import {
  Trophy,
  CheckCircle2,
  Target,
  Code2,
  CalendarDays,
  Mic,
  MessageSquare,
  History,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BriefcaseBusiness,
  FileUser,
  Lightbulb,
  AlertCircle,
  RefreshCw,
  Cloud,
  Loader2,
} from "lucide-react";

import {
  getCloudAssessments,
  getCloudInterviews,
} from "../lib/cloudProgress";

// Keep every displayed score between 0 and 100.
function safeScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.min(100, Math.max(0, number));
}

// Display a readable date.
function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

// Progress bar shared by assessment and interview cards.
function ScoreBar({ score, height = "h-2" }) {
  return (
    <div
      className={`${height} overflow-hidden rounded-full bg-slate-100`}
    >
      <div
        className="h-full rounded-full bg-indigo-600 transition-all"
        style={{ width: `${safeScore(score)}%` }}
      />
    </div>
  );
}

// Reusable statistics card.
function StatCard({ label, value, Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex rounded-xl bg-indigo-50 p-3">
        <Icon size={22} className="text-indigo-600" />
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {label}
      </p>
    </div>
  );
}

// Reusable feedback list.
function FeedbackList({
  title,
  items,
  Icon,
  color = "text-indigo-700",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div>
      <h5
        className={`flex items-center gap-2 text-sm font-semibold ${color}`}
      >
        <Icon size={17} />
        {title}
      </h5>

      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// One coding assessment with expandable Gemini feedback.
function AssessmentResultCard({ attempt }) {
  const [expanded, setExpanded] = useState(false);

  const isAiEvaluation =
    attempt.evaluationType === "ai-static-review";

  const evaluation = attempt.evaluation;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-900">
            {attempt.title || "Coding Assessment"}
          </h4>

          <p className="mt-2 text-xs text-slate-500">
            {isAiEvaluation
              ? "Gemini AI Static Code Evaluation"
              : "Predefined Source-Pattern Checks"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-indigo-600">
            {safeScore(attempt.score)}%
          </p>

          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              attempt.completed
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {attempt.completed ? "Completed" : "Attempted"}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <ScoreBar score={attempt.score} />
      </div>

      {!isAiEvaluation && (
        <p className="mt-3 text-sm text-slate-600">
          {attempt.passed ?? 0}/{attempt.total ?? 0} source
          checks passed
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <CalendarDays size={14} />
        {formatDate(attempt.completedAt)}
      </div>

      {isAiEvaluation && evaluation && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="flex w-full items-center justify-between text-sm font-semibold text-indigo-700"
          >
            View AI Evaluation Details

            {expanded ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {expanded && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Correctness", evaluation.correctness],
                  ["Code Quality", evaluation.codeQuality],
                  ["Requirements", evaluation.requirements],
                ].map(([label, score]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-indigo-50 p-4 text-center"
                  >
                    <p className="text-xl font-bold text-indigo-700">
                      {safeScore(score)}%
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {evaluation.summary && (
                <div>
                  <h5 className="text-sm font-semibold">
                    Overall Feedback
                  </h5>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {evaluation.summary}
                  </p>
                </div>
              )}

              <FeedbackList
                title="Strengths"
                items={evaluation.strengths}
                Icon={CheckCircle2}
                color="text-green-700"
              />

              <FeedbackList
                title="Issues Found"
                items={evaluation.issues}
                Icon={AlertCircle}
                color="text-red-700"
              />

              <FeedbackList
                title="Suggested Improvements"
                items={evaluation.improvements}
                Icon={Lightbulb}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// Individual interview result with all questions and answers.
function InterviewAttemptCard({ interview, index }) {
  const [expanded, setExpanded] = useState(false);

  const isResume = interview.mode === "resume";

  const answers = Array.isArray(interview.answers)
    ? interview.answers
    : [];

  const Icon = isResume ? FileUser : Code2;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={`shrink-0 rounded-xl p-3 ${
                isResume
                  ? "bg-violet-50 text-violet-600"
                  : "bg-indigo-50 text-indigo-600"
              }`}
            >
              <Icon size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                Attempt {index + 1}
              </p>

              <h4 className="mt-1 break-words font-semibold text-slate-900">
                {interview.assessmentTitle ||
                  "Software Engineering Interview"}
              </h4>

              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  isResume
                    ? "bg-violet-50 text-violet-700"
                    : "bg-indigo-50 text-indigo-700"
                }`}
              >
                {isResume
                  ? "Resume-Based"
                  : "Assignment-Based"}
              </span>

              {isResume && interview.targetRole && (
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <BriefcaseBusiness size={14} />
                  {interview.targetRole}
                </p>
              )}

              <p className="mt-2 text-xs capitalize text-slate-500">
                Interview type:{" "}
                {interview.interviewType || "technical"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">
              {safeScore(interview.averageScore)}%
            </p>

            <p className="mt-1 text-xs text-slate-500">
              AI Average
            </p>
          </div>
        </div>

        <div className="mt-5">
          <ScoreBar score={interview.averageScore} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <MessageSquare size={15} />
            {interview.questionsAnswered ?? answers.length}/
            {interview.totalQuestions ?? 5} questions
          </span>

          <span className="flex items-center gap-2">
            <CalendarDays size={15} />
            {formatDate(interview.completedAt)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-5 flex w-full items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-indigo-700"
        >
          {expanded
            ? "Hide Interview Report"
            : "View Interview Report"}

          {expanded ? (
            <ChevronUp size={18} />
          ) : (
            <ChevronDown size={18} />
          )}
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-5">
          {answers.length === 0 ? (
            <p className="text-sm text-slate-500">
              No question-level feedback was saved for this
              interview.
            </p>
          ) : (
            answers.map((item, questionIndex) => (
              <div
                key={questionIndex}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-indigo-700">
                    Question {questionIndex + 1}
                  </p>

                  <span className="font-bold text-indigo-700">
                    {safeScore(item.score)}%
                  </span>
                </div>

                <h5 className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                  {item.question}
                </h5>

                <div className="mt-4">
                  <ScoreBar score={item.score} />
                </div>

                {item.answer && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-700">
                      Your Answer
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {item.answer}
                    </p>
                  </div>
                )}

                {(item.feedback || item.guidance) && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-indigo-700">
                      Gemini Feedback
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {item.feedback || item.guidance}
                    </p>
                  </div>
                )}

                <FeedbackList
                  title="Strengths"
                  items={item.strengths}
                  Icon={CheckCircle2}
                  color="text-green-700"
                />

                <FeedbackList
                  title="Areas to Improve"
                  items={item.improvements}
                  Icon={Lightbulb}
                />
              </div>
            ))
          )}
        </div>
      )}
    </article>
  );
}

// Convert a Supabase assessment row into the existing UI format.
function normalizeAssessment(row) {
  const saved =
    row.result &&
    typeof row.result === "object" &&
    !Array.isArray(row.result)
      ? row.result
      : {};

  return {
    ...saved,
    assessmentId: row.assessment_id,
    title: row.title,
    score: row.score,
    completed: row.status === "completed",
    completedAt: row.completed_at,
  };
}

// Convert a Supabase interview row into the existing UI format.
function normalizeInterview(row) {
  const saved =
    row.result &&
    typeof row.result === "object" &&
    !Array.isArray(row.result)
      ? row.result
      : {};

  return {
    ...saved,
    id: row.id,
    assessmentTitle: row.title,
    interviewType: row.interview_type,
    mode: row.interview_mode,
    targetRole: row.target_role || "",
    averageScore: row.score,
    questionsAnswered: row.questions_count,
    answers: Array.isArray(saved.answers)
      ? saved.answers
      : [],
    completedAt: row.completed_at,
  };
}

export default function ProgressDashboard() {
  const [assessmentResults, setAssessmentResults] =
    useState([]);

  const [interviewHistory, setInterviewHistory] =
    useState([]);

  const [activeFilter, setActiveFilter] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  // Load cloud data when My Progress is opened or refreshed.
  useEffect(() => {
    let cancelled = false;

    async function loadCloudProgress() {
      setLoading(true);
      setCloudError("");

      try {
        const [assessmentRows, interviewRows] =
          await Promise.all([
            getCloudAssessments(),
            getCloudInterviews(),
          ]);

        if (cancelled) return;

        setAssessmentResults(
          assessmentRows.map(normalizeAssessment)
        );

        setInterviewHistory(
          interviewRows.map(normalizeInterview)
        );
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Unable to load cloud progress:",
          error
        );

        setCloudError(
          error.message ||
            "Unable to load your progress from Supabase."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCloudProgress();

    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  // Coding assessment calculations.
  const attempts = [...assessmentResults].sort(
    (a, b) =>
      new Date(b.completedAt || 0).getTime() -
      new Date(a.completedAt || 0).getTime()
  );

  const completedAssessments = attempts.filter(
    (item) => item.completed
  ).length;

  const averageCodingScore = attempts.length
    ? Math.round(
        attempts.reduce(
          (sum, item) => sum + safeScore(item.score),
          0
        ) / attempts.length
      )
    : 0;

  // Interview calculations.
  const interviews = [...interviewHistory].sort(
    (a, b) =>
      new Date(b.completedAt || 0).getTime() -
      new Date(a.completedAt || 0).getTime()
  );

  const assignmentInterviews = interviews.filter(
    (item) => item.mode !== "resume"
  );

  const resumeInterviews = interviews.filter(
    (item) => item.mode === "resume"
  );

  const completedInterviews = interviews.filter(
    (item) => item.completed
  ).length;

  const averageInterviewScore = interviews.length
    ? Math.round(
        interviews.reduce(
          (sum, item) =>
            sum + safeScore(item.averageScore),
          0
        ) / interviews.length
      )
    : 0;

  const bestInterviewScore = interviews.length
    ? Math.max(
        ...interviews.map((item) =>
          safeScore(item.averageScore)
        )
      )
    : 0;

  const filteredInterviews = interviews.filter(
    (item) =>
      activeFilter === "all" ||
      (activeFilter === "resume" &&
        item.mode === "resume") ||
      (activeFilter === "assignment" &&
        item.mode !== "resume")
  );

  // Loading screen.
  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8"
      >
        <div className="text-center">
          <Loader2
            size={38}
            className="mx-auto animate-spin text-indigo-600"
          />

          <h3 className="mt-5 font-semibold text-slate-900">
            Loading your progress...
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Fetching your coding and interview results
            from Supabase.
          </p>
        </div>
      </div>
    );
  }

  // Show errors instead of misleading empty results.
  if (cloudError) {
    return (
      <section
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-8"
      >
        <AlertCircle
          size={26}
          className="text-red-600"
        />

        <h3 className="mt-4 text-lg font-semibold text-red-700">
          Unable to load your progress
        </h3>

        <p className="mt-3 text-sm text-slate-600">
          {cloudError}
        </p>

        <button
          type="button"
          onClick={() =>
            setRefreshCount((count) => count + 1)
          }
          className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <RefreshCw size={17} />
          Try Again
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {/* PAGE HEADING */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-indigo-600">
            YOUR DEVELOPMENT JOURNEY
          </p>

          <button
            type="button"
            onClick={() =>
              setRefreshCount((count) => count + 1)
            }
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Developer Readiness Report
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Track your coding assessments, assignment-based
          interviews, and resume-based interviews.
          Your results are loaded from your Supabase account.
        </p>

        <p className="mt-4 flex items-center gap-2 text-xs font-medium text-green-700">
          <Cloud size={16} />
          Cloud progress connected
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Coding Assessments Completed"
          value={completedAssessments}
          Icon={Code2}
        />

        <StatCard
          label="Interview Attempts"
          value={interviews.length}
          Icon={Mic}
        />

        <StatCard
          label="Average Interview Score"
          value={`${averageInterviewScore}%`}
          Icon={Target}
        />

        <StatCard
          label="Best Interview Score"
          value={`${bestInterviewScore}%`}
          Icon={Trophy}
        />
      </div>

      {/* CODING ASSESSMENT PERFORMANCE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Code2 className="text-indigo-600" />

            <h3 className="text-xl font-semibold">
              Coding Assessment Performance
            </h3>
          </div>

          <span className="text-sm text-slate-500">
            {attempts.length} recorded
          </span>
        </div>

        {attempts.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-600">
              No cloud assessments recorded yet.
              Complete and submit an assessment to see
              your results here.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-indigo-50 p-5">
                <Target
                  size={21}
                  className="text-indigo-600"
                />

                <p className="mt-3 text-sm text-indigo-800">
                  Average Coding Score
                </p>

                <p className="mt-2 text-3xl font-bold text-indigo-700">
                  {averageCodingScore}%
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-5">
                <CheckCircle2
                  size={21}
                  className="text-green-600"
                />

                <p className="mt-3 text-sm text-green-800">
                  Completed Challenges
                </p>

                <p className="mt-2 text-3xl font-bold text-green-700">
                  {completedAssessments}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {attempts.map((attempt) => (
                <AssessmentResultCard
                  key={attempt.assessmentId}
                  attempt={attempt}
                />
              ))}
            </div>
          </>
        )}

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Coding scores are based on Gemini AI static
          evaluation or predefined source-pattern checks.
          These results do not represent actual code
          compilation, runtime execution, or automated tests.
        </p>
      </section>

      {/* INTERVIEW PERFORMANCE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Mic className="text-indigo-600" />

            <h3 className="text-xl font-semibold">
              AI Interview Performance
            </h3>
          </div>

          <span className="text-sm text-slate-500">
            {completedInterviews} completed
          </span>
        </div>

        {/* INTERVIEW STATISTICS */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-indigo-50 p-5">
            <History
              size={22}
              className="text-indigo-600"
            />

            <p className="mt-3 text-sm text-indigo-800">
              Total Attempts
            </p>

            <p className="mt-2 text-3xl font-bold text-indigo-700">
              {interviews.length}
            </p>
          </div>

          <div className="rounded-xl bg-violet-50 p-5">
            <FileUser
              size={22}
              className="text-violet-600"
            />

            <p className="mt-3 text-sm text-violet-800">
              Resume Interviews
            </p>

            <p className="mt-2 text-3xl font-bold text-violet-700">
              {resumeInterviews.length}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-5">
            <BriefcaseBusiness
              size={22}
              className="text-slate-600"
            />

            <p className="mt-3 text-sm text-slate-600">
              Assignment Interviews
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {assignmentInterviews.length}
            </p>
          </div>
        </div>

        {/* INTERVIEW HISTORY FILTERS */}
        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <MessageSquare
              size={20}
              className="text-indigo-600"
            />

            <h4 className="text-lg font-semibold">
              Interview History
            </h4>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              {
                value: "all",
                label: "All Interviews",
              },
              {
                value: "assignment",
                label: "Assignment-Based",
              },
              {
                value: "resume",
                label: "Resume-Based",
              },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  setActiveFilter(filter.value)
                }
                aria-pressed={
                  activeFilter === filter.value
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.value
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* INTERVIEW ATTEMPTS */}
          {filteredInterviews.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
              <p className="text-sm text-slate-600">
                {interviews.length === 0
                  ? "No cloud interview attempts recorded yet. Finish an AI interview to see your report here."
                  : "No interviews found for this filter."}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredInterviews.map(
                (interview, index) => (
                  <InterviewAttemptCard
                    key={
                      interview.id ||
                      `${interview.completedAt}-${index}`
                    }
                    interview={interview}
                    index={index}
                  />
                )
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Interview scores are subjective Gemini AI estimates
          based on the answers provided. They are not verified
          measures of professional readiness, English fluency,
          or actual interview success.
        </p>
      </section>

      {/* NEXT STEP */}
      <section className="rounded-2xl bg-indigo-50 p-6">
        <div className="flex items-center gap-2">
          <TrendingUp
            size={21}
            className="text-indigo-700"
          />

          <h3 className="font-semibold text-indigo-900">
            Your Next Step
          </h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-indigo-800">
          Review your interview feedback, identify recurring
          weaknesses, and practice another assessment or
          resume-based interview. Compare your results over
          time to see how your explanations and technical
          reasoning improve.
        </p>
      </section>

      {/* STORAGE INFORMATION */}
      <p className="text-xs leading-5 text-slate-500">
        This report displays your Supabase cloud records only.
        Older browser-only results are not automatically imported
        or assigned to your account.
      </p>
    </div>
  );
}
