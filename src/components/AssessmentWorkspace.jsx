import { useState } from "react";
import Editor from "@monaco-editor/react";
import { saveAssessmentResult } from "../utils/progressStorage";
import { challenges } from "../data/challenges";
import DebuggingCoach from "./DebuggingCoach";
import {
  ArrowLeft, Play, Lightbulb, FileCode2, CheckCircle2,
  XCircle, RotateCcw,
} from "lucide-react";

// Each assessment has its own virtual files, hints, language and checks.
export default function AssessmentWorkspace({ assessment, onBack, onResultSaved }) {
  const challenge = challenges[assessment.id];
  const [files, setFiles] = useState(() => ({ ...(challenge?.files || {}) }));
  const [activeFile, setActiveFile] = useState(challenge?.startingFile || "");
  const [results, setResults] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Reset when another assessment is selected without unmounting the workspace.

  if (!challenge) {
    return (
      <section className="rounded-xl bg-white p-6">
        <p>This challenge is not available.</p>
        <button type="button" onClick={onBack} className="mt-4 text-indigo-600">
          Back to assessments
        </button>
      </section>
    );
  }

  const languageFor = (name) => {
    if (name.endsWith(".java")) return "java";
    if (name.endsWith(".sql")) return "sql";
    if (name.endsWith(".jsx")) return "javascript";
    if (name.endsWith(".md")) return "markdown";
    return challenge.language;
  };

  const runChecks = () => {
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
        score: Math.round((passed / updated.length) * 100),
        completed: passed === updated.length,
      });
      onResultSaved?.();
    } catch {
      setSaveError("Checks ran, but progress could not be saved in this browser.");
    }
  };

  const resetFiles = () => {
    setFiles({ ...challenge.files });
    setActiveFile(challenge.startingFile);
    setResults(null);
    setShowHint(false);
    setSaveError("");
  };

  const unsolved = results?.filter((result) => !result.passed) || [];

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-indigo-600">
        <ArrowLeft size={16} /> Back to assessments
      </button>

      <div>
        <h2 className="text-2xl font-bold">{assessment.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{challenge.description}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">Your task</h3>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600">
          {challenge.instructions.map((step) => <li key={step}>{step}</li>)}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-xs font-bold uppercase text-slate-500">Project Explorer</h3>
          {Object.keys(files).map((filename) => (
            <button
              type="button"
              key={filename}
              onClick={() => setActiveFile(filename)}
              className={`mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                activeFile === filename ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100"
              }`}
            >
              <FileCode2 size={16} className="shrink-0" />
              <span className="break-all">{filename}</span>
            </button>
          ))}
        </aside>

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="truncate text-sm font-semibold">{activeFile}</span>
            <button type="button" onClick={resetFiles} className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
              <RotateCcw size={14} /> Reset
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
              setFiles((previous) => ({ ...previous, [activeFile]: value ?? "" }));
              setResults(null);
            }}
            options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
          />
        </div>
      </div>
      <DebuggingCoach
  key={assessment.id}
  assessmentId={assessment.id}
  files={files}
  activeFile={activeFile}
/>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={runChecks} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">
          <Play size={16} /> Check Solution
        </button>
        <button type="button" onClick={() => setShowHint((old) => !old)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm">
          <Lightbulb size={16} /> {showHint ? "Hide Hints" : "Get Hints"}
        </button>
      </div>

      {showHint && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold">Debugging hints</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {(unsolved.length ? unsolved : challenge.checks).map((test) => (
              <li key={test.name}>{test.hint}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
      {results && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 font-semibold">Solution Checks</h3>
          {results.map((result) => (
            <div key={result.name} className="flex items-start gap-3 border-b border-slate-100 py-3">
              {result.passed ? <CheckCircle2 className="shrink-0 text-green-600" size={19} /> : <XCircle className="shrink-0 text-red-500" size={19} />}
              <div>
                <p className="text-sm font-medium">{result.name}</p>
                {!result.passed && <p className="mt-1 text-xs text-slate-500">{result.hint}</p>}
              </div>
            </div>
          ))}
          <p className="mt-4 text-sm font-semibold">Passed: {results.filter((r) => r.passed).length}/{results.length}</p>
          <p className="mt-2 text-xs text-slate-500">These are rule-based source checks, not actual compilation, database execution, or runtime tests.</p>
        </section>
      )}
    </div>
  );
}
