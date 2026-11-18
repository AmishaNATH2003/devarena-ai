
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { saveAssessmentResult } from "../utils/progressStorage";
import {
  ArrowLeft, Play, Lightbulb, FileCode2, CheckCircle2,
  XCircle, RotateCcw
} from "lucide-react";

const initialFiles = {
  "UserController.java": `@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity&lt;User&gt; getUser(@PathVariable int id) {
        User user = service.findById(id);
        return ResponseEntity.ok(user);
    }
}`,
  "UserService.java": `public class UserService {

    public User findById(int id) {
        if (id &lt; 0) {
            throw new IllegalArgumentException("Invalid ID");
        }

        // TODO: Handle missing users correctly
        return null;
    }
}`,
  "UserServiceTest.java": `public class UserServiceTest {

    // Expected behavior:
    // Invalid IDs should be rejected.
    // Missing users should return HTTP 404.
    // Existing users should return HTTP 200.
}`,
};

const checks = [
  
{
  name: "Reject invalid user IDs",
  check: (files) =>
    /id\s*<=\s*0/.test(files["UserService.java"]),
  hint: "Consider whether zero is a valid user ID."
},
  {
    name: "Handle missing users",
    check: (files) =>
      /ResponseStatusException/.test(files["UserService.java"]),
    hint: "Spring Boot can map exceptions to HTTP status codes."
  },
  {
    name: "Avoid returning null",
    check: (files) =>
      !/return\s+null\s*;/.test(files["UserService.java"]),
    hint: "Returning null hides the actual problem."
  }
];

export default function AssessmentWorkspace({ assessment, onBack }) {
  const [files, setFiles] = useState(initialFiles);
  const [activeFile, setActiveFile] = useState("UserService.java");
  const [results, setResults] = useState(null);
  const [showHint, setShowHint] = useState(false);

  
function runChecks() {
  const updated = checks.map((test) => ({
    name: test.name,
    passed: test.check(files),
    hint: test.hint,
  }));

  setResults(updated);

  const passedCount = updated.filter((test) => test.passed).length;

  saveAssessmentResult({
    assessmentId: assessment.id,
    title: assessment.title,
    passed: passedCount,
    total: updated.length,
    score: Math.round((passedCount / updated.length) * 100),
    completed: passedCount === updated.length,
  });
}


  function resetFiles() {
    setFiles(initialFiles);
    setResults(null);
    setShowHint(false);
  }

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-indigo-600"
      >
        <ArrowLeft size={16} /> Back to assessments
      </button>

      <div>
        <h2 className="text-2xl font-bold">
          {assessment.title}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Debug the provided project and verify your fixes.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-xs font-bold uppercase text-slate-500">
            Project Explorer
          </h3>

          {Object.keys(files).map((filename) => (
            <button
              key={filename}
              onClick={() => setActiveFile(filename)}
              className={`mb-2 flex w-full items-center gap-2 rounded-lg
                px-3 py-2 text-left text-xs
                ${activeFile === filename
                  ? "bg-indigo-50 text-indigo-700"
                  : "hover:bg-slate-100"}`}
            >
              <FileCode2 size={16} />
              {filename}
            </button>
          ))}
        </aside>

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold">{activeFile}</span>
            <button
              onClick={resetFiles}
              className="flex items-center gap-2 text-xs text-slate-500"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <Editor
            height="390px"
            language="java"
            theme="vs-dark"
            path={activeFile}
            value={files[activeFile]}
            onChange={(value) =>
              setFiles((previous) => ({
                ...previous,
                [activeFile]: value ?? ""
              }))
            }
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={runChecks}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
        >
          <Play size={16} /> Check Solution
        </button>

        <button
          onClick={() => setShowHint(!showHint)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm"
        >
          <Lightbulb size={16} /> {showHint ? "Hide Hint" : "Get Hint"}
        </button>
      </div>

      {showHint && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold">Debugging Hint</h3>
          <p className="mt-2 text-sm text-slate-700">
            Check how the service validates user IDs and handles
            users that do not exist.
          </p>
        </div>
      )}

      {results && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 font-semibold">Solution Checks</h3>

          {results.map((result) => (
            <div
              key={result.name}
              className="flex items-center gap-3 border-b border-slate-100 py-3"
            >
              {result.passed ? (
                <CheckCircle2 className="text-green-600" size={19} />
              ) : (
                <XCircle className="text-red-500" size={19} />
              )}

              <div>
                <p className="text-sm font-medium">{result.name}</p>
                {!result.passed && (
                  <p className="mt-1 text-xs text-slate-500">
                    {result.hint}
                  </p>
                )}
              </div>
            </div>
          ))}

          <p className="mt-4 text-sm font-semibold">
            Passed: {results.filter((r) => r.passed).length}
            /{results.length}
          </p>
        </div>
      )}
    </div>
  );
}
