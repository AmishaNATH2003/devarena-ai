
import { useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Code2,
  ArrowRight,
  FileCode2,
  CheckCircle2,
} from "lucide-react";

export default function GenerateAssessment({ onGenerated, onStart }) {
  const [technology, setTechnology] = useState("java");
  const [difficulty, setDifficulty] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assessment, setAssessment] = useState(null);

  const generateAssessment = async () => {
    if (loading) return;

    setLoading(true);
    setError("");
    setAssessment(null);

    try {
      const response = await fetch("/api/generate-assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          technology,
          difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to generate assessment."
        );
      }

      const generated = data.assessment;

      if (
        !generated ||
        typeof generated.title !== "string" ||
        !generated.files ||
        typeof generated.files !== "object" ||
        Array.isArray(generated.files) ||
        Object.keys(generated.files).length === 0 ||
        !Object.prototype.hasOwnProperty.call(
          generated.files,
          generated.startingFile
        )
      ) {
        throw new Error("Invalid assessment data received.");
      }

      setAssessment(generated);
      onGenerated?.(generated);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = () => {
    if (!assessment || typeof onStart !== "function") return;

    onStart({
      id: `ai-${Date.now()}`,
      title: assessment.title,
      description: assessment.description,
      category: assessment.technology,
      difficulty: assessment.difficulty,
      generatedChallenge: assessment,
    });
  };

  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-600 p-3 text-white">
          <Sparkles size={22} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            AI Assessment Generator
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Generate realistic debugging projects using Gemini AI.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="assessment-technology"
            className="mb-2 block text-sm font-medium"
          >
            Technology
          </label>

          <select
            id="assessment-technology"
            value={technology}
            disabled={loading}
            onChange={(event) => {
              setTechnology(event.target.value);
              setAssessment(null);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white p-3"
          >
            <option value="java">Java</option>
            <option value="sql">SQL</option>
            <option value="react">React</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="assessment-difficulty"
            className="mb-2 block text-sm font-medium"
          >
            Difficulty
          </label>

          <select
            id="assessment-difficulty"
            value={difficulty}
            disabled={loading}
            onChange={(event) => {
              setDifficulty(event.target.value);
              setAssessment(null);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white p-3"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={generateAssessment}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generating your project...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            Generate Assessment
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-center gap-2 text-sm text-red-600"
        >
          <AlertCircle size={17} />
          {error}
        </p>
      )}

      {assessment && (
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
            <CheckCircle2 size={18} />
            Assessment generated successfully
          </div>

          <h3 className="mt-4 text-xl font-bold text-slate-900">
            {assessment.title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {assessment.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg bg-white px-3 py-1 text-xs font-medium uppercase text-indigo-700">
              {assessment.technology || technology}
            </span>

            <span className="rounded-lg bg-white px-3 py-1 text-xs font-medium capitalize text-indigo-700">
              {assessment.difficulty || difficulty}
            </span>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <FileCode2 size={17} className="text-indigo-600" />
              <h4 className="font-semibold text-slate-900">
                Project Files
              </h4>
            </div>

            <div className="space-y-2">
              {Object.keys(assessment.files).map((filename) => (
                <div
                  key={filename}
                  className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <Code2 size={15} className="text-indigo-600" />
                  <span className="break-all">{filename}</span>
                </div>
              ))}
            </div>
          </div>

          {Array.isArray(assessment.instructions) &&
            assessment.instructions.length > 0 && (
              <div className="mt-5">
                <h4 className="font-semibold text-slate-900">
                  Your Task
                </h4>

                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                  {assessment.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              </div>
            )}

          <button
            type="button"
            onClick={startAssessment}
            disabled={typeof onStart !== "function"}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Code2 size={18} />
            Start Assessment
            <ArrowRight size={17} />
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        AI-generated projects may contain mistakes.
        Automated code execution and evaluation are not yet available.
      </p>
    </section>
  );
}
