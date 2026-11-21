
import { useState } from "react";
import Editor from "@monaco-editor/react";

import {
  saveAssessmentResult,
  getAssessmentResults,
} from "../utils/progressStorage";

import { saveCloudAssessment } from "../lib/cloudProgress";

import {
  readUserStorage,
  writeUserStorage,
  removeUserStorage,
} from "../utils/userStorage";

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

function isValidDraft(draft) {
  return (
    draft !== null &&
    typeof draft === "object" &&
    !Array.isArray(draft) &&
    Object.keys(draft).length > 0 &&
    Object.values(draft).every(
      (value) => typeof value === "string"
    )
  );
}

function loadDraft(assessmentId, originalFiles) {
  const saved = readUserStorage(
    `draft:${assessmentId}`,
    null
  );

  if (!isValidDraft(saved)) {
    return { ...originalFiles };
  }

  const restored = { ...originalFiles };

  for (const filename of Object.keys(originalFiles)) {
    if (typeof saved[filename] === "string") {
      restored[filename] = saved[filename];
    }
  }

  return restored;
}

function normalizeCode(code) {
  return String(code ?? "").replace(/\s+/g, "");
}

function getChangedFiles(originalFiles, submittedFiles) {
  return Object.keys(originalFiles).filter(
    (filename) =>
      normalizeCode(originalFiles[filename]) !==
      normalizeCode(submittedFiles[filename])
  );
}

function safeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, number));
}

function FeedbackItems({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        No additional feedback.
      </p>
    );
  }

  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function AssessmentWorkspace({
  assessment,
  onBack,
  onResultSaved,
  onCodeChange,
  onStartInterview,
}) {
  const challenge =
    assessment.generatedChallenge ||
    challenges[assessment.id];

  const isGenerated = Boolean(
    assessment.generatedChallenge
  );

  const draftKey = `draft:${assessment.id}`;

  const [files, setFiles] = useState(() =>
    loadDraft(
      assessment.id,
      challenge?.files || {}
    )
  );

  const [activeFile, setActiveFile] = useState(
    () =>
      challenge?.startingFile ||
      Object.keys(challenge?.files || {})[0] ||
      ""
  );

  const [results, setResults] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const [saveError, setSaveError] = useState("");
  const [evaluationError, setEvaluationError] =
    useState("");
  const [cloudStatus, setCloudStatus] = useState("");

  const [evaluation, setEvaluation] = useState(() => {
    const saved =
      getAssessmentResults()[assessment.id];

    const matchesFiles =
      JSON.stringify(saved?.submittedFiles) ===
      JSON.stringify(files);

    return saved?.evaluationType ===
      "ai-static-review" &&
      matchesFiles
      ? saved.evaluation || null
      : null;
  });

  const [submitted, setSubmitted] = useState(() => {
    const saved =
      getAssessmentResults()[assessment.id];

    return Boolean(
      saved?.evaluationType === "ai-static-review" &&
      JSON.stringify(saved.submittedFiles) ===
        JSON.stringify(files)
    );
  });

  const shareCodeWithInterview = (updatedFiles) => {
    onCodeChange?.({
      title: assessment.title,
      description: [
        challenge?.description || "",
        ...(challenge?.instructions || []),
      ].join("\n"),
      codeSummary: Object.entries(updatedFiles)
        .map(
          ([filename, code]) =>
            `File: ${filename}\n${code}`
        )
        .join("\n\n")
        .slice(0, 10000),
    });
  };

  const languageFor = (filename) => {
    if (filename.endsWith(".java")) return "java";
    if (filename.endsWith(".sql")) return "sql";
    if (filename.endsWith(".jsx")) return "javascript";
    if (filename.endsWith(".js")) return "javascript";
    if (filename.endsWith(".tsx")) return "typescript";
    if (filename.endsWith(".ts")) return "typescript";
    if (filename.endsWith(".json")) return "json";
    if (filename.endsWith(".css")) return "css";
    if (filename.endsWith(".html")) return "html";
    if (filename.endsWith(".md")) return "markdown";
    if (filename.endsWith(".py")) return "python";
    return challenge?.language || "plaintext";
  };

  const updateFile = (filename, value) => {
    if (saving || evaluating) return;

    const updatedFiles = {
      ...files,
      [filename]: value ?? "",
    };

    setFiles(updatedFiles);

    try {
      writeUserStorage(draftKey, updatedFiles);
    } catch (error) {
      console.error(
        "Unable to save editor draft:",
        error
      );
    }

    shareCodeWithInterview(updatedFiles);

    setResults(null);
    setEvaluation(null);
    setEvaluationError("");
    setSubmitted(false);
    setCloudStatus("");
    setSaveError("");
  };

  // Built-in static checks; no code execution.
  const runChecks = () => {
    if (
      isGenerated ||
      !Array.isArray(challenge?.checks) ||
      saving ||
      evaluating
    ) {
      return;
    }

    const updated = challenge.checks.map((test) => {
      let passed;

      try {
        passed = test.check(files) === true;
      } catch {
        passed = false;
      }

      return {
        name: test.name,
        passed,
        hint: test.hint,
      };
    });

    setResults(updated);

    const passed = updated.filter(
      (test) => test.passed
    ).length;

    setSaveError("");
    setCloudStatus("");

    try {
      saveAssessmentResult({
        assessmentId: assessment.id,
        title: assessment.title,
        passed,
        total: updated.length,
        score: updated.length
          ? Math.round(
              (passed / updated.length) * 100
            )
          : 0,
        completed:
          updated.length > 0 &&
          passed === updated.length,
        evaluationType: "source-pattern-check",
      });

      onResultSaved?.();
    } catch (error) {
      console.error(
        "Unable to save source checks:",
        error
      );

      setSaveError(
        "Checks ran, but local progress could not be saved."
      );
    }
  };

  const evaluateSolution = async () => {
    if (evaluating || saving || !challenge) return;

    const changedFiles = getChangedFiles(
      challenge.files || {},
      files
    );

    if (changedFiles.length === 0) {
      setEvaluation(null);
      setSubmitted(false);
      setCloudStatus("");
      setSaveError("");
      setEvaluationError(
        "You haven't modified the project yet. Fix the bugs before requesting an AI evaluation."
      );
      return;
    }

    setEvaluating(true);
    setEvaluation(null);
    setEvaluationError("");
    setSubmitted(false);
    setSaveError("");
    setCloudStatus("");

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentId: assessment.id,
          title: assessment.title,
          description: challenge.description,
          instructions: challenge.instructions || [],
          files,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to evaluate your solution."
        );
      }

      if (!data.evaluation) {
        throw new Error(
          "No evaluation was returned."
        );
      }

      setEvaluation(data.evaluation);

      if (Array.isArray(data.sourceChecks?.checks)) {
        setResults(
          data.sourceChecks.checks.map((check) => ({
            name: check.name,
            passed: check.passed,
            hint: check.hint || "",
          }))
        );
      }
    } catch (error) {
      setEvaluationError(
        error.message || "Evaluation failed."
      );
    } finally {
      setEvaluating(false);
    }
  };

  const submitAssessment = async () => {
    if (
      !evaluation ||
      submitted ||
      evaluating ||
      saving
    ) {
      return;
    }

    const scores = [
      Number(evaluation.correctness),
      Number(evaluation.codeQuality),
      Number(evaluation.requirements),
    ];

    if (
      scores.some(
        (score) =>
          !Number.isFinite(score) ||
          score < 0 ||
          score > 100
      )
    ) {
      setSaveError(
        "Invalid evaluation scores. Please evaluate again."
      );
      return;
    }

    const score = Math.round(
      scores.reduce(
        (total, value) => total + value,
        0
      ) / scores.length
    );

    setSaving(true);
    setSaveError("");
    setCloudStatus("");

    let savedResult;

    try {
      const savedResults = saveAssessmentResult({
        assessmentId: assessment.id,
        title: assessment.title,
        language: challenge.language || null,
        score,
        passed:
          results?.filter((item) => item.passed).length || 0,
        total: results?.length || 0,
        completed: true,
        evaluationType: "ai-static-review",
        evaluation,
        submittedFiles: { ...files },
      });

      savedResult = savedResults[assessment.id];

      setSubmitted(true);
      onResultSaved?.();
      setCloudStatus("Saving to Supabase...");
    } catch (error) {
      console.error(
        "Local assessment saving failed:",
        error
      );

      setSaveError(
        "Unable to save the assessment locally."
      );
      setSaving(false);
      return;
    }

    try {
      await saveCloudAssessment(savedResult);

      setCloudStatus(
        "Assessment saved to Supabase successfully."
      );
    } catch (error) {
      console.error(
        "Assessment cloud save failed:",
        error
      );

      setCloudStatus(
        `Saved locally, but cloud sync failed: ${
          error.message || "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const startProjectInterview = () => {
    if (!submitted || !challenge) return;

    onStartInterview?.({
      title: assessment.title,
      description: [
        challenge.description,
        ...(challenge.instructions || []),
      ].join("\n"),
      codeSummary: Object.entries(files)
        .map(
          ([filename, code]) =>
            `File: ${filename}\n${code}`
        )
        .join("\n\n")
        .slice(0, 10000),
    });
  };

  const resetFiles = () => {
    if (!challenge || saving || evaluating) return;

    const restoredFiles = {
      ...challenge.files,
    };

    let resetError = "";

    try {
      removeUserStorage(draftKey);
    } catch (error) {
      console.error(
        "Unable to remove editor draft:",
        error
      );

      resetError =
        "Files were reset, but the saved draft could not be removed.";
    }

    setFiles(restoredFiles);
    setActiveFile(
      challenge.startingFile ||
        Object.keys(restoredFiles)[0] ||
        ""
    );

    shareCodeWithInterview(restoredFiles);

    setResults(null);
    setShowHint(false);
    setEvaluation(null);
    setEvaluationError("");
    setSubmitted(false);
    setCloudStatus("");
    setSaveError(resetError);
  };

  const unsolved =
    results?.filter((result) => !result.passed) || [];

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

  return (
    <div className="space-y-5">
      {/* BACK */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-indigo-600"
      >
        <ArrowLeft size={16} />
        Back to assessments
      </button>

      {/* TITLE */}
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
          {(challenge.instructions || []).map(
            (step, index) => (
              <li key={index}>{step}</li>
            )
          )}
        </ul>
      </section>

      {/* FILE EXPLORER + MONACO */}
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
              disabled={saving || evaluating}
              className="flex shrink-0 items-center gap-2 text-xs text-slate-500 disabled:opacity-50"
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
            value={files[activeFile] ?? ""}
            onChange={(value) =>
              updateFile(activeFile, value)
            }
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              readOnly: saving || evaluating,
            }}
          />
        </div>
      </div>

      {/* AI COACH */}
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
              disabled={saving || evaluating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Play size={16} />
              Check Solution
            </button>

            <button
              type="button"
              onClick={() =>
                setShowHint((previous) => !previous)
              }
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm"
            >
              <Lightbulb size={16} />
              {showHint ? "Hide Hints" : "Get Hints"}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={evaluateSolution}
          disabled={evaluating || saving}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {evaluating ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />
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

      {/* ERRORS */}
      {evaluationError && (
        <p
          role="alert"
          className="flex items-center gap-2 text-sm text-red-600"
        >
          <AlertCircle size={17} />
          {evaluationError}
        </p>
      )}

      {/* AI EVALUATION */}
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
                  {safeScore(score)}%
                </p>
                <p className="mt-2 text-xs font-medium text-slate-600">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="font-semibold text-slate-900">
              Overall Feedback
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {evaluation.summary}
            </p>
          </div>

          <div className="mt-6">
            <h4 className="flex items-center gap-2 font-semibold text-green-700">
              <CheckCircle2 size={18} />
              Strengths
            </h4>
            <FeedbackItems items={evaluation.strengths} />
          </div>

          <div className="mt-6">
            <h4 className="flex items-center gap-2 font-semibold text-red-700">
              <XCircle size={18} />
              Issues Found
            </h4>
            <FeedbackItems items={evaluation.issues} />
          </div>

          <div className="mt-6">
            <h4 className="flex items-center gap-2 font-semibold text-indigo-700">
              <Lightbulb size={18} />
              Suggested Improvements
            </h4>
            <FeedbackItems items={evaluation.improvements} />
          </div>

          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
            These scores are estimates based on static AI
            review and source-pattern checks. No code
            compilation or automated tests were performed.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={submitAssessment}
              disabled={submitted || evaluating || saving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-green-600"
            >
              {saving ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {saving
                ? "Saving..."
                : submitted
                  ? "Assessment Submitted"
                  : "Submit Assessment"}
            </button>

            {submitted && (
              <button
                type="button"
                onClick={startProjectInterview}
                disabled={!onStartInterview || saving}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Sparkles size={18} />
                Start AI Interview
              </button>
            )}
          </div>

          {submitted && (
            <p className="mt-4 text-sm text-green-700">
              Your AI-reviewed assessment has been saved.
              You can now continue to your project-based interview.
            </p>
          )}
        </section>
      )}

      {/* CLOUD STATUS */}
      {cloudStatus && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm ${
            cloudStatus.includes("failed")
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : cloudStatus.includes("successfully")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-indigo-200 bg-indigo-50 text-indigo-700"
          }`}
        >
          {cloudStatus}
        </div>
      )}

      {saveError && (
        <p role="alert" className="text-sm text-red-600">
          {saveError}
        </p>
      )}

      {/* HINTS */}
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

      {/* SOLUTION CHECKS */}
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

                {!result.passed && result.hint && (
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
            These are static source-pattern checks,
            not executed tests.
          </p>
        </section>
      )}
    </div>
  );
}
