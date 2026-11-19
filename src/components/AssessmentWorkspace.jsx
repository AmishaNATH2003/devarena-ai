
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { saveAssessmentResult } from "../utils/progressStorage";
import { challenges } from "../data/challenges";
import DebuggingCoach from "./DebuggingCoach";

import {
  ArrowLeft,
  Play,
  Lightbulb,
  FileCode2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";

export default function AssessmentWorkspace({
  assessment,
  onBack,
  onResultSaved,
}) {
  const challenge =
    assessment.generatedChallenge || challenges[assessment.id];

  const isGenerated = Boolean(assessment.generatedChallenge);

  const [files, setFiles] = useState(() => ({
    ...(challenge?.files || {}),
  }));

  const [activeFile, setActiveFile] = useState(
    challenge?.startingFile || ""
  );

  const [results, setResults] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [saveError, setSaveError] = useState("");

  // AI evaluation state
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState("");

  if (!challenge) {
    return (
      <section className="rounded-xl bg-white p-6">
        <p>This challenge is not available.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 text-indigo-600"
        >
          Back to assessments
        </button>
      </section>
    );
  }

  // Monaco language detection
  const languageFor = (name) => {
    if (name.endsWith(".java")) return "java";
    if (name.endsWith(".sql")) return "sql";
    if (name.endsWith(".jsx")) return "javascript";
    if (name.endsWith(".js")) return "javascript";
    if (name.endsWith(".tsx")) return "typescript";
    if (name.endsWith(".ts")) return "typescript";
    if (name.endsWith(".json")) return "json";
    if (name.endsWith(".css")) return "css";
    if (name.endsWith(".html")) return "html";
    if (name.endsWith(".md")) return "markdown";
    if (name.endsWith(".py")) return "python";

    return challenge.language || "plaintext";
  };

  // Existing predefined source checks
  const runChecks = () => {
    if (isGenerated || !Array.isArray(challenge.checks)) {
      return;
    }

    const updated = challenge.checks.map((test) => ({
      name: test.name,
      passed: test.check(files),
      hint: test.hint,
    }));

    setResults(updated);

    const passed = updated.filter((test) => test.passed).length;

    setSaveError("");

    try {
      saveAssessmentResult({
        assessmentId: assessment.id,
        title: assessment.title,
        passed,
        total: updated.length,
        score: updated.length
          ? Math.round((passed / updated.length) * 100)
          : 0,
        completed:
          updated.length > 0 && passed === updated.length,
      });

      onResultSaved?.();
    } catch {
      setSaveError(
        "Checks ran, but progress could not be saved."
      );
    }
  };

  // AI-powered code evaluation
  const evaluateSolution = async () => {
    if (evaluating) return;

    setEvaluating(true);
    setEvaluation(null);
    setEvaluationError("");

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: assessment.title,
          description: challenge.description,
          instructions: challenge.instructions || [],
          files,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to evaluate your solution."
        );
      }

      if (!data.evaluation) {
        throw new Error("No evaluation was returned.");
      }

      setEvaluation(data.evaluation);
    } catch (error) {
      setEvaluationError(
        error.message || "Evaluation failed."
      );
    } finally {
      setEvaluating(false);
    }
  };

  // Restore original files
  const resetFiles = () => {
    setFiles({ ...challenge.files });
    setActiveFile(challenge.startingFile);
    setResults(null);
    setShowHint(false);
    setSaveError("");
    setEvaluation(null);
    setEvaluationError("");
  };

  const unsolved =
    results?.filter((result) => !result.passed) || [];

  return (
    <div className="space-y-5">
      {/* BACK BUTTON */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-indigo-600"
      >
        <ArrowLeft size={16} />
        Back to assessments
      </button>

      {/* HEADER */}
      <div>
        {isGenerated && (
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-indigo-600">
            <Sparkles size={16} />
            Gemini AI Generated Assessment
          </div>
        )}

        <h2 className="text-2xl font-bold">
          {assessment.title}
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {challenge.description}
        </p>
      </div>

      {/* INSTRUCTIONS */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">Your task</h3>

        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600">
          {(challenge.instructions || []).map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </section>

      {/* PROJECT EXPLORER AND EDITOR */}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-xs font-bold uppercase text-slate-500">
            Project Explorer
          </h3>

          {Object.keys(files).map((filename) => (
            <button
              type="button"
              key={filename}
              onClick={() => setActiveFile(filename)}
              className={`mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                activeFile === filename
                  ? "bg-indigo-50 text-indigo-700"
                  : "hover:bg-slate-100"
              }`}
            >
              <FileCode2 size={16} className="shrink-0" />
              <span className="break-all">{filename}</span>
            </button>
          ))}
        </aside>

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="truncate text-sm font-semibold">
              {activeFile}
            </span>

            <button
              type="button"
              onClick={resetFiles}
              className="flex shrink-0 items-center gap-2 text-xs text-slate-500"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          <Editor
            key={`${assessment.id}-${activeFile}`}
            height="390px"
            language={languageFor(activeFile)}
            theme="vs-dark"
            path={`${assessment.id}/${activeFile}`}
            value={files[activeFile] || ""}
            onChange={(value) => {
              setFiles((previous) => ({
                ...previous,
                [activeFile]: value ?? "",
              }));

              setResults(null);
              setEvaluation(null);
              setEvaluationError("");
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true,
              wordWrap: "on",
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>

      {/* AI DEBUGGING COACH */}
      <DebuggingCoach
        key={assessment.id}
        assessmentId={assessment.id}
        files={files}
        activeFile={activeFile}
        challengeDescription={[
          challenge.description,
          ...(challenge.instructions || []),
        ].join("\n")}
      />

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap items-center gap-3">
        {!isGenerated && (
          <>
            <button
              type="button"
              onClick={runChecks}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
            >
              <Play size={16} />
              Check Solution
            </button>

            <button
              type="button"
              onClick={() => setShowHint((old) => !old)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm"
            >
              <Lightbulb size={16} />
              {showHint ? "Hide Hints" : "Get Hints"}
            </button>
          </>
        )}

        {/* AVAILABLE FOR BOTH ASSESSMENT TYPES */}
        <button
          type="button"
          onClick={evaluateSolution}
          disabled={evaluating}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {evaluating ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Evaluating...
            </>
          ) : (
            <>
              <Sparkles size={17} />
              Evaluate Solution with AI
            </>
          )}
        </button>
      </div>

      {evaluationError && (
        <p
          role="alert"
          className="flex items-center gap-2 text-sm text-red-600"
        >
          <AlertCircle size={17} />
          {evaluationError}
        </p>
      )}

      {/* AI EVALUATION REPORT */}
      {evaluation && (
        <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ClipboardCheck
              size={24}
              className="text-violet-600"
            />
            <div>
              <h3 className="text-xl font-bold">
                AI Code Evaluation Report
              </h3>
              <p className="text-xs text-slate-500">
                Static analysis by Gemini AI
              </p>
            </div>
          </div>

          {/* SCORES */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Correctness", evaluation.correctness],
              ["Code Quality", evaluation.codeQuality],
              ["Requirements", evaluation.requirements],
            ].map(([label, score]) => (
              <div
                key={label}
                className="rounded-xl bg-violet-50 p-5 text-center"
              >
                <p className="text-3xl font-bold text-violet-700">
                  {score}%
                </p>
                <p className="mt-2 text-xs font-medium text-slate-600">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* SUMMARY */}
          <div className="mt-6">
            <h4 className="font-semibold text-slate-900">
              Overall Feedback
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {evaluation.summary}
            </p>
          </div>

          {/* STRENGTHS */}
          <div className="mt-6">
            <h4 className="flex items-center gap-2 font-semibold text-green-700">
              <CheckCircle2 size={18} />
              Strengths
            </h4>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {evaluation.strengths.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          {/* ISSUES */}
          <div className="mt-6">
            <h4 className="flex items-center gap-2 font-semibold text-red-700">
              <XCircle size={18} />
              Issues Found
            </h4>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {evaluation.issues.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          {/* IMPROVEMENTS */}
          <div className="mt-6">
            <h4 className="flex items-center gap-2 font-semibold text-indigo-700">
              <Lightbulb size={18} />
              Suggested Improvements
            </h4>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {evaluation.improvements.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
            These scores are AI estimates based on source code review.
            No code compilation, runtime execution, or automated tests
            were performed.
          </p>
        </section>
      )}

      {/* PREDEFINED HINTS */}
      {!isGenerated && showHint && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold">
            Debugging hints
          </h3>

          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {(
              unsolved.length
                ? unsolved
                : challenge.checks || []
            ).map((test) => (
              <li key={test.name}>{test.hint}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <p role="alert" className="text-sm text-red-600">
          {saveError}
        </p>
      )}

      {/* EXISTING SOURCE-BASED CHECK RESULTS */}
      {!isGenerated && results && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 font-semibold">
            Solution Checks
          </h3>

          {results.map((result) => (
            <div
              key={result.name}
              className="flex items-start gap-3 border-b border-slate-100 py-3"
            >
              {result.passed ? (
                <CheckCircle2
                  className="shrink-0 text-green-600"
                  size={19}
                />
              ) : (
                <XCircle
                  className="shrink-0 text-red-500"
                  size={19}
                />
              )}

              <div>
                <p className="text-sm font-medium">
                  {result.name}
                </p>

                {!result.passed && (
                  <p className="mt-1 text-xs text-slate-500">
                    {result.hint}
                  </p>
                )}
              </div>
            </div>
          ))}

          <p className="mt-4 text-sm font-semibold">
            Passed:{" "}
            {results.filter((result) => result.passed).length}
            /{results.length}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            These are source-pattern checks, not executed tests.
          </p>
        </section>
      )}
    </div>
  );
}
