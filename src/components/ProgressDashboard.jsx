
import { useState } from "react";
import {
  Trophy,
  CheckCircle2,
  Target,
  Code2,
  CalendarDays,
  Mic,
  MessageSquare,
} from "lucide-react";

import { getAssessmentResults } from "../utils/progressStorage";
import { getInterviewResult } from "../utils/interviewStorage";

export default function ProgressDashboard() {
  const [results] = useState(() => getAssessmentResults());
  const [interviewResult] = useState(() => getInterviewResult());

  const attempts = Object.values(results);

  const completed = attempts.filter(
    (item) => item.completed
  ).length;

  const averageScore = attempts.length
    ? Math.round(
        attempts.reduce(
          (sum, item) => sum + item.score,
          0
        ) / attempts.length
      )
    : 0;

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
      ? "Date unavailable"
      : parsed.toLocaleString();
  };

  return (
    <div className="space-y-8">

      {/* PAGE HEADING */}
      <div>
        <p className="text-sm font-semibold text-indigo-600">
          YOUR DEVELOPMENT JOURNEY
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Developer Readiness Report
        </h2>

        <p className="mt-3 text-slate-600">
          Review your coding assessments and technical interview
          performance in one place.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">

        {[
          ["Coding Results Recorded", attempts.length, Code2],
          ["Challenges Completed", completed, CheckCircle2],
          ["Average Coding Score", `${averageScore}%`, Target],
        ].map(([label, value, Icon]) => (

          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <Icon
              size={23}
              className="text-indigo-600"
            />

            <p className="mt-4 text-3xl font-bold">
              {value}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {label}
            </p>
          </div>

        ))}

      </div>

      {/* CODING ASSESSMENT PERFORMANCE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">

        <div className="flex items-center gap-3">
          <Trophy className="text-indigo-600" />

          <h3 className="text-xl font-semibold">
            Coding Assessment Performance
          </h3>
        </div>

        {attempts.length === 0 ? (

          <p className="mt-6 text-sm text-slate-500">
            No coding assessments recorded yet.
            Complete your first challenge to see your results.
          </p>

        ) : (

          <div className="mt-6 space-y-6">

            {attempts.map((attempt) => (

              <div key={attempt.assessmentId}>

                <div className="flex items-center justify-between gap-3">

                  <div>
                    <p className="font-semibold">
                      {attempt.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {attempt.passed}/{attempt.total} checks passed
                    </p>
                  </div>

                  <span className="font-bold text-indigo-600">
                    {attempt.score}%
                  </span>

                </div>

                {/* CODING PROGRESS BAR */}
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{
                      width: `${Math.min(100, Math.max(0, attempt.score))}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays size={14} />
                  {formatDate(attempt.completedAt)}
                </div>

              </div>

            ))}

          </div>

        )}

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Coding percentages currently represent source-pattern checks,
          not actual Java compilation or execution-based testing.
        </p>

      </section>

      {/* INTERVIEW PERFORMANCE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">

        <div className="flex items-center gap-3">
          <Mic className="text-indigo-600" />

          <h3 className="text-xl font-semibold">
            Technical Interview Performance
          </h3>
        </div>

        {!interviewResult ? (

          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-600">
              No completed interview recorded yet.
              Answer all three technical questions to generate
              your interview report.
            </p>
          </div>

        ) : (

          <div className="mt-6 space-y-6">

            {/* INTERVIEW STATISTICS */}
            <div className="grid gap-4 sm:grid-cols-2">

              <div className="rounded-xl bg-indigo-50 p-5">
                <Target
                  size={22}
                  className="text-indigo-600"
                />

                <p className="mt-3 text-sm text-indigo-800">
                  Average Topic Coverage
                </p>

                <p className="mt-2 text-3xl font-bold text-indigo-700">
                  {interviewResult.averageScore}%
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <MessageSquare
                  size={22}
                  className="text-slate-600"
                />

                <p className="mt-3 text-sm text-slate-600">
                  Questions Answered
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {interviewResult.questionsAnswered}/
                  {interviewResult.totalQuestions}
                </p>
              </div>

            </div>

            {/* INDIVIDUAL INTERVIEW QUESTIONS */}
            <div className="space-y-4">

              {(interviewResult.answers || []).map(
                (item, index) => (

                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 p-4"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Question {index + 1}
                        </p>

                        <p className="mt-2 text-sm font-semibold">
                          {item.question}
                        </p>
                      </div>

                      <span className="font-bold text-indigo-600">
                        {item.score}%
                      </span>

                    </div>

                    {/* QUESTION SCORE BAR */}
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.score))}%`,
                        }}
                      />
                    </div>

                  </div>

                )
              )}

            </div>

            {/* SAVED DATE */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays size={15} />
              Last completed:{" "}
              {formatDate(interviewResult.completedAt)}
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Interview results measure predefined keyword coverage.
              They do not independently verify English fluency,
              technical accuracy, or communication confidence.
            </p>

          </div>

        )}

      </section>

      {/* RECOMMENDATION SECTION */}
      <div className="rounded-2xl bg-indigo-50 p-6">

        <h3 className="font-semibold text-indigo-900">
          Your Next Step
        </h3>

        <p className="mt-2 text-sm leading-6 text-indigo-800">
          Continue practicing debugging, API testing,
          and explaining technical decisions.
          Future versions will include more advanced code
          evaluation and contextual interview feedback.
        </p>

      </div>

    </div>
  );
}
