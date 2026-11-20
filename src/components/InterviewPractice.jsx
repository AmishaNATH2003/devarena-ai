
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Send,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Code2,
  FileUser,
  ArrowLeft,
  Upload,
  BriefcaseBusiness,
  FileText,
} from "lucide-react";

import { saveInterviewResult } from "../utils/interviewStorage";
import { getAssessmentSession } from "../utils/assessmentSession";
import { getAssessmentResults } from "../utils/progressStorage";
import { parseResume } from "../utils/resumeParser";
import { challenges } from "../data/challenges";

const MAX_QUESTIONS = 5;

const JOB_ROLES = [
  "Software Engineer",
  "Java Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Python Developer",
  "Data Analyst",
  "Machine Learning Engineer",
  "Other",
];

const INTERVIEW_TYPES = [
  {
    value: "technical",
    label: "Technical",
    description: "Skills, concepts and projects",
  },
  {
    value: "hr",
    label: "HR",
    description: "Behavioral and workplace questions",
  },
  {
    value: "mixed",
    label: "Mixed",
    description: "Technical and HR questions",
  },
];

// Existing Gemini interview API.
async function interviewRequest(payload) {
  const response = await fetch("/api/interview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "The AI interview service is unavailable."
    );
  }

  return data;
}

// Load latest saved source code for an assignment.
function contextForSavedAssessment(item) {
  if (!item) return null;

  const challenge =
    item.generatedChallenge || challenges[item.id];

  if (!challenge) return null;

  const files = { ...(challenge.files || {}) };

  try {
    const savedDraft = localStorage.getItem(
      `devarena-draft-${item.id}`
    );

    if (savedDraft) {
      const parsed = JSON.parse(savedDraft);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        for (const [filename, code] of Object.entries(parsed)) {
          if (
            typeof code === "string" &&
            Object.hasOwn(files, filename)
          ) {
            files[filename] = code;
          }
        }
      }
    }
  } catch {
    // Continue using original files.
  }

  return {
    mode: "assignment",
    title: item.title,
    description: [
      challenge.description || "",
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

// Find assignments available for an interview.
function availableAssessments() {
  const saved = getAssessmentSession();
  const progress = getAssessmentResults();
  const entries = [];

  if (
    saved?.id &&
    (saved.generatedChallenge || challenges[saved.id])
  ) {
    entries.push(saved);
  }

  for (const [id, result] of Object.entries(progress)) {
    if (!result?.title || !challenges[id]) continue;

    const exists = entries.some(
      (item) => String(item.id) === String(id)
    );

    if (!exists) {
      entries.push({
        id,
        title: result.title,
      });
    }
  }

  return entries;
}

export default function InterviewPractice({
  assessment = null,
}) {
  // Assignment button opens assignment mode directly.
  // Sidebar navigation opens the two-mode selector.
  const [mode, setMode] = useState(
    assessment ? "assignment" : null
  );

  const [chosenContext, setChosenContext] =
    useState(assessment);

  const [savedAssignments] = useState(availableAssessments);
  const [chosenId, setChosenId] = useState("");

  // Resume-specific state.
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [parsingResume, setParsingResume] = useState(false);

  const [selectedRole, setSelectedRole] = useState(
    "Software Engineer"
  );
  const [customRole, setCustomRole] = useState("");
  const [interviewType, setInterviewType] =
    useState("technical");

  // Interview state.
  const [currentQuestion, setCurrentQuestion] =
    useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [nextQuestionText, setNextQuestionText] =
    useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const requestIdRef = useRef(0);

  const targetRole =
    selectedRole === "Other"
      ? customRole.trim()
      : selectedRole;

  const interviewContext = chosenContext || {
    mode: "assignment",
    title: "Software Engineering Interview",
    description: "General software engineering practice.",
    codeSummary: "",
  };

  // Stop microphone and ignore pending requests on unmount.
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      recognitionRef.current?.abort();
    };
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // Speech-to-text.
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is unavailable in this browser. Please type your answer."
      );
      return;
    }

    setError("");
    transcriptRef.current = answer.trim();

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalized = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalized += " " + text;
        } else {
          interim += " " + text;
        }
      }

      const combined = [
        transcriptRef.current,
        finalized.trim(),
        interim.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      setAnswer(combined.trim());
    };

    recognition.onerror = (event) => {
      setError(
        `Speech recognition error: ${event.error}`
      );
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      setError("Unable to start speech recognition.");
    }
  };

  // Pick a saved coding assignment.
  const chooseSavedAssignment = (id) => {
    setChosenId(id);

    const item = savedAssignments.find(
      (entry) => String(entry.id) === id
    );

    setChosenContext(contextForSavedAssessment(item));
    setError("");
  };

  // Return to interview mode selection.
  const returnToModes = () => {
    if (loading || currentQuestion) return;

    setMode(null);
    setChosenContext(null);
    setChosenId("");
    setError("");
    setNotice("");
  };

  // Extract resume locally using resumeParser.js.
  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setNotice("");
    setResumeText("");
    setResumeFileName("");
    setChosenContext(null);
    setParsingResume(true);

    try {
      const result = await parseResume(file);

      setResumeText(result.text);
      setResumeFileName(result.fileName);

      if (result.truncated) {
        setNotice(
          "Resume extracted successfully. Only the first 12,000 characters will be used."
        );
      }
    } catch (err) {
      setError(
        err.message || "Unable to read the selected resume."
      );
    } finally {
      setParsingResume(false);
      event.target.value = "";
    }
  };

  // Build the resume interview context for Gemini.
  const prepareResumeInterview = () => {
    if (
      resumeText.trim().length < 50 ||
      !targetRole.trim()
    ) {
      setError(
        "Please upload a readable resume and choose your target job role."
      );
      return;
    }

    setChosenContext({
      mode: "resume",
      title: `${targetRole.trim()} Resume Interview`,
      description:
        `${interviewType} interview for ${targetRole.trim()}`,
      targetRole: targetRole.trim().slice(0, 120),
      interviewType,
      resumeText,
      codeSummary: "",
    });

    setError("");
  };

  // Start assignment or resume interview.
  const startInterview = async () => {
    if (loading || parsingResume || !chosenContext) return;

    stopListening();

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");
    setCurrentQuestion("");
    setQuestionIndex(0);
    setAnswer("");
    setFeedback(null);
    setHistory([]);
    setFinished(false);
    setSaved(false);
    setNextQuestionText(null);

    transcriptRef.current = "";

    try {
      const data = await interviewRequest({
        action: "start",
        questionNumber: 1,
        assessment: interviewContext,
      });

      if (requestId !== requestIdRef.current) return;

      if (
        typeof data.question !== "string" ||
        !data.question.trim()
      ) {
        throw new Error(
          "Gemini did not return a valid interview question."
        );
      }

      setCurrentQuestion(data.question);
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err.message || "Unable to start interview."
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Submit answer for Gemini evaluation.
  const submitAnswer = async () => {
    if (
      loading ||
      feedback !== null ||
      !currentQuestion ||
      listening
    ) {
      return;
    }

    if (!answer.trim()) {
      setError("Please speak or type an answer first.");
      return;
    }

    const requestId = ++requestIdRef.current;
    const submittedAnswer = answer.trim();

    setLoading(true);
    setError("");

    try {
      const data = await interviewRequest({
        action: "answer",
        questionNumber: questionIndex + 1,
        assessment: interviewContext,
        question: currentQuestion,
        answer: submittedAnswer,
        history: history.map((item) => ({
          question: item.question,
          answer: item.answer,
        })),
      });

      if (requestId !== requestIdRef.current) return;

      if (
        !Number.isInteger(data.score) ||
        data.score < 0 ||
        data.score > 100 ||
        typeof data.feedback !== "string"
      ) {
        throw new Error(
          "Gemini returned invalid interview feedback."
        );
      }

      const result = {
        question: currentQuestion,
        answer: submittedAnswer,
        score: data.score,
        feedback: data.feedback,
        guidance: data.feedback,
        strengths: Array.isArray(data.strengths)
          ? data.strengths
          : [],
        improvements: Array.isArray(data.improvements)
          ? data.improvements
          : [],
      };

      const updatedHistory = [...history, result];

      setFeedback(result);
      setHistory(updatedHistory);

      const interviewCompleted =
        updatedHistory.length >= MAX_QUESTIONS ||
        !data.nextQuestion?.trim();

      if (interviewCompleted) {
        setFinished(true);
        setNextQuestionText(null);

        try {
          // Save interview metadata and answers only.
          // Never save full resume text in progress storage.
          saveInterviewResult(
            updatedHistory,
            {
              title: interviewContext.title,
              mode: interviewContext.mode || "assignment",
              targetRole:
                interviewContext.targetRole || "",
              interviewType:
                interviewContext.interviewType ||
                "technical",
            },
            updatedHistory.length
          );

          setSaved(true);
        } catch {
          setSaved(false);
          setError(
            "Interview completed, but saving progress failed."
          );
        }
      } else {
        setNextQuestionText(data.nextQuestion);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err.message || "Unable to evaluate answer."
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Continue to Gemini's adaptive follow-up question.
  const nextQuestion = () => {
    if (!nextQuestionText || loading) return;

    stopListening();

    setCurrentQuestion(nextQuestionText);
    setNextQuestionText(null);
    setQuestionIndex((previous) => previous + 1);
    setAnswer("");
    setFeedback(null);
    setError("");

    transcriptRef.current = "";
  };

  // Restart without losing the selected interview mode.
  const restart = () => {
    requestIdRef.current += 1;
    stopListening();

    setCurrentQuestion("");
    setQuestionIndex(0);
    setAnswer("");
    setFeedback(null);
    setHistory([]);
    setNextQuestionText(null);
    setFinished(false);
    setSaved(false);
    setLoading(false);
    setError("");

    transcriptRef.current = "";
  };

  const averageScore = history.length
    ? Math.round(
        history.reduce(
          (sum, item) => sum + item.score,
          0
        ) / history.length
      )
    : 0;

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
          <Sparkles size={17} />
          GEMINI AI INTERVIEW PRACTICE
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Practice real-world interviews
        </h2>

        <p className="mt-3 text-slate-600">
          Practice interviews based on your coding assignments
          or resume. Answer using your voice or keyboard.
        </p>
      </div>

      {/* MODE SELECTION */}
      {!currentQuestion && !mode && (
        <div className="grid gap-5 md:grid-cols-2">

          <button
            type="button"
            onClick={() => {
              setMode("assignment");
              setChosenContext(null);
              setError("");
            }}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md"
          >
            <div className="mb-5 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Code2 size={26} />
            </div>

            <h3 className="text-xl font-bold">
              Assignment-Based Interview
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Explain your code, debugging decisions,
              testing approach and technical solutions.
            </p>

            <p className="mt-5 font-semibold text-indigo-700">
              Select an assignment →
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("resume");
              setChosenContext(null);
              setError("");
            }}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-violet-400 hover:shadow-md"
          >
            <div className="mb-5 inline-flex rounded-xl bg-violet-50 p-3 text-violet-600">
              <FileUser size={26} />
            </div>

            <h3 className="text-xl font-bold">
              Resume-Based Interview
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Upload your resume and practice role-specific
              technical, HR, or mixed interviews.
            </p>

            <p className="mt-5 font-semibold text-violet-700">
              Upload resume →
            </p>
          </button>
        </div>
      )}

      {/* ASSIGNMENT MODE */}
      {!currentQuestion && mode === "assignment" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">

          <button
            type="button"
            onClick={returnToModes}
            disabled={loading}
            className="mb-5 flex items-center gap-2 text-sm text-indigo-700 disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            Change interview mode
          </button>

          <h3 className="text-xl font-bold">
            Assignment-Based Interview
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Select a saved project to practice explaining
            your implementation to an AI interviewer.
          </p>

          {assessment &&
            chosenContext === assessment && (
              <div className="mt-5 rounded-xl bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">
                  Current project: {assessment.title}
                </p>
              </div>
            )}

          {savedAssignments.length > 0 && (
            <div className="mt-5">
              <label
                htmlFor="interview-assignment"
                className="mb-2 block text-sm font-semibold"
              >
                Select Assignment
              </label>

              <select
                id="interview-assignment"
                value={chosenId}
                disabled={loading}
                onChange={(event) =>
                  chooseSavedAssignment(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="">
                  Choose a saved assignment
                </option>

                {savedAssignments.map((item) => (
                  <option
                    key={item.id}
                    value={String(item.id)}
                  >
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!chosenContext && (
            <p className="mt-4 text-sm text-amber-700">
              {savedAssignments.length
                ? "Select an assignment to begin."
                : "No saved assignments found. Complete an assessment first."}
            </p>
          )}

          {chosenContext && (
            <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <h4 className="font-semibold text-indigo-900">
                Ready for your interview
              </h4>

              <p className="mt-2 text-sm text-indigo-700">
                {chosenContext.title}
              </p>

              <p className="mt-1 text-sm text-indigo-700">
                Up to {MAX_QUESTIONS} adaptive questions
              </p>

              <button
                type="button"
                onClick={startInterview}
                disabled={loading}
                className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Preparing interview...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Start AI Interview
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* RESUME MODE */}
      {!currentQuestion && mode === "resume" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">

          <button
            type="button"
            onClick={returnToModes}
            disabled={loading || parsingResume}
            className="mb-5 flex items-center gap-2 text-sm text-indigo-700 disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            Change interview mode
          </button>

          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <FileUser size={26} />
            </div>

            <div>
              <h3 className="text-xl font-bold">
                Resume-Based AI Interview
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Personalized with Gemini AI
              </p>
            </div>
          </div>

          <div className="space-y-6">

            {/* UPLOAD RESUME */}
            <div>
              <label
                htmlFor="resume-upload"
                className="mb-2 block text-sm font-semibold"
              >
                Upload your resume
              </label>

              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <Upload
                  size={28}
                  className="mx-auto text-indigo-600"
                />

                <p className="mt-3 text-sm font-medium">
                  Select a PDF or DOCX resume
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Maximum 5 MB. Text-based files only.
                </p>

                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleResumeUpload}
                  disabled={parsingResume || loading}
                  className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-4 file:py-2 file:font-semibold file:text-indigo-700"
                />
              </div>

              {parsingResume && (
                <p className="mt-3 flex items-center gap-2 text-sm text-indigo-700">
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Extracting resume text...
                </p>
              )}

              {resumeFileName && !parsingResume && (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle2 size={18} />
                  Resume extracted: {resumeFileName}
                </p>
              )}
            </div>

            {/* TARGET JOB ROLE */}
            <div>
              <label
                htmlFor="target-role"
                className="mb-2 block text-sm font-semibold"
              >
                Target job role
              </label>

              <div className="relative">
                <BriefcaseBusiness
                  size={18}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <select
                  id="target-role"
                  value={selectedRole}
                  onChange={(event) => {
                    setSelectedRole(event.target.value);
                    setChosenContext(null);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm"
                >
                  {JOB_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRole === "Other" && (
                <input
                  type="text"
                  value={customRole}
                  maxLength={120}
                  onChange={(event) => {
                    setCustomRole(event.target.value);
                    setChosenContext(null);
                  }}
                  placeholder="Enter your target job role"
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                />
              )}
            </div>

            {/* INTERVIEW TYPE */}
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">
                Interview Type
              </legend>

              <div className="grid gap-3 sm:grid-cols-3">
                {INTERVIEW_TYPES.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-xl border p-4 ${
                      interviewType === option.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="interview-type"
                      value={option.value}
                      checked={
                        interviewType === option.value
                      }
                      onChange={() => {
                        setInterviewType(option.value);
                        setChosenContext(null);
                      }}
                      className="accent-indigo-600"
                    />

                    <span className="ml-2 text-sm font-semibold">
                      {option.label}
                    </span>

                    <p className="mt-2 text-xs text-slate-500">
                      {option.description}
                    </p>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* PRIVACY NOTICE */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <FileText
                  size={20}
                  className="shrink-0 text-slate-500"
                />

                <p className="text-xs leading-5 text-slate-600">
                  Your resume is parsed in this browser.
                  Starting an interview sends its extracted
                  text to the DevArena AI API and Google Gemini
                  for personalized questions. The uploaded
                  resume is not permanently saved by this
                  prototype. Interview answers and scores
                  are saved locally for progress tracking.
                  Avoid including unnecessary sensitive data.
                </p>
              </div>
            </div>

            {/* PREPARE RESUME INTERVIEW */}
            {!chosenContext && (
              <button
                type="button"
                onClick={prepareResumeInterview}
                disabled={
                  parsingResume ||
                  loading ||
                  !resumeText.trim() ||
                  !targetRole.trim()
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                <Sparkles size={18} />
                Prepare Resume Interview
              </button>
            )}

            {/* START RESUME INTERVIEW */}
            {chosenContext?.mode === "resume" && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                <h4 className="font-semibold text-indigo-900">
                  Ready for your interview
                </h4>

                <p className="mt-2 text-sm text-indigo-700">
                  Role: {targetRole}
                </p>

                <p className="mt-1 text-sm text-indigo-700">
                  Type: {interviewType.toUpperCase()}
                </p>

                <p className="mt-1 text-sm text-indigo-700">
                  Up to {MAX_QUESTIONS} AI questions
                </p>

                <button
                  type="button"
                  onClick={startInterview}
                  disabled={loading}
                  className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Preparing interview...
                    </>
                  ) : (
                    <>
                      <Mic size={18} />
                      Start Resume Interview
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CURRENT INTERVIEW QUESTION */}
      {currentQuestion && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-indigo-600">
              Question {questionIndex + 1} of {MAX_QUESTIONS}
            </span>

            <MessageSquare
              size={20}
              className="text-indigo-600"
            />
          </div>

          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            {mode === "resume"
              ? `${interviewType} resume interview`
              : "Assignment-based interview"}
          </p>

          <h3 className="mt-5 text-xl font-semibold leading-8">
            {currentQuestion}
          </h3>

          {/* ANSWER INPUT */}
          <textarea
            value={answer}
            onChange={(event) =>
              setAnswer(event.target.value)
            }
            placeholder="Speak or type your explanation here..."
            disabled={feedback !== null || loading}
            className="mt-6 min-h-40 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50"
          />

          {/* MICROPHONE AND SUBMIT */}
          {!feedback && (
            <div className="mt-5 flex flex-wrap gap-3">

              <button
                type="button"
                onClick={
                  listening
                    ? stopListening
                    : startListening
                }
                disabled={loading}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 ${
                  listening
                    ? "bg-red-500"
                    : "bg-indigo-600"
                }`}
              >
                {listening ? (
                  <MicOff size={17} />
                ) : (
                  <Mic size={17} />
                )}

                {listening
                  ? "Stop Speaking"
                  : "Start Speaking"}
              </button>

              <button
                type="button"
                onClick={submitAnswer}
                disabled={
                  loading ||
                  listening ||
                  !answer.trim()
                }
                className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={17} />
                )}

                {loading
                  ? "Gemini is evaluating..."
                  : "Submit Answer"}
              </button>
            </div>
          )}

          {/* AI FEEDBACK */}
          {feedback && (
            <div className="mt-6 rounded-xl bg-indigo-50 p-5">

              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={20}
                  className="text-indigo-600"
                />

                <h4 className="font-semibold">
                  AI Interview Feedback
                </h4>
              </div>

              <p className="mt-4 text-3xl font-bold text-indigo-700">
                {feedback.score}%
              </p>

              <p className="mt-1 text-xs text-slate-500">
                AI-estimated answer score
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-700">
                {feedback.feedback}
              </p>

              {/* STRENGTHS */}
              {feedback.strengths.length > 0 && (
                <div className="mt-5">
                  <h5 className="font-semibold text-green-700">
                    Strengths
                  </h5>

                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-700">
                    {feedback.strengths.map(
                      (item, index) => (
                        <li key={index}>{item}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* IMPROVEMENTS */}
              {feedback.improvements.length > 0 && (
                <div className="mt-5">
                  <h5 className="font-semibold text-indigo-700">
                    Areas to Improve
                  </h5>

                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-700">
                    {feedback.improvements.map(
                      (item, index) => (
                        <li key={index}>{item}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* NEXT QUESTION OR FINISH */}
              <div className="mt-6">
                {!finished ? (
                  <button
                    type="button"
                    onClick={nextQuestion}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Next AI Question
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="font-medium text-green-700">
                      Interview completed!
                    </p>

                    {saved && (
                      <p className="text-sm text-green-700">
                        Your interview result was saved.
                        View it under My Progress.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={restart}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                    >
                      <RotateCcw size={17} />
                      New Interview
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* NOTICES AND ERRORS */}
      {notice && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {notice}
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* INTERVIEW SUMMARY */}
      {history.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold">
            Interview Summary
          </h3>

          <p className="mt-3 text-sm text-slate-600">
            Questions answered: {history.length}/{MAX_QUESTIONS}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Average AI answer score: {averageScore}%
          </p>

          <div className="mt-5 space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-100 p-4"
              >
                <p className="text-xs text-slate-500">
                  Question {index + 1}
                </p>

                <p className="mt-2 text-sm font-medium">
                  {item.question}
                </p>

                <p className="mt-2 text-sm font-semibold text-indigo-700">
                  AI Score: {item.score}%
                </p>
              </div>
            ))}
          </div>

          {finished && saved && (
            <p className="mt-4 text-sm font-medium text-green-700">
              Interview results saved successfully.
              Open My Progress to view your report.
            </p>
          )}

          {finished && !saved && (
            <p className="mt-4 text-sm text-red-600">
              Your interview finished, but its results
              could not be saved.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
