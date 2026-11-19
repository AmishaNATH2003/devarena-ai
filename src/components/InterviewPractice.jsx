
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
} from "lucide-react";

import { saveInterviewResult } from "../utils/interviewStorage";

const MAX_QUESTIONS = 5;

// Send interview requests to Gemini.
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
      data.error ||
        "The AI interview service is unavailable."
    );
  }

  return data;
}

export default function InterviewPractice({
  assessment = null,
}) {
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [nextQuestionText, setNextQuestionText] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const requestIdRef = useRef(0);

  // Current project context.
  const interviewContext = {
    title:
      assessment?.title ||
      "Software Engineering Interview",
    description:
      assessment?.description ||
      "General software engineering debugging, problem solving, testing, and development practices.",
    codeSummary: assessment?.codeSummary || "",
  };

  // Cleanup when leaving the interview page.
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      recognitionRef.current?.abort();
    };
  }, []);

  // Stop microphone.
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setListening(false);
  };

  // Start speech recognition.
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
      setError("Unable to start speech recognition.");
      setListening(false);
    }
  };

  // Start a new Gemini interview.
  const startInterview = async () => {
    if (loading) return;

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

      if (requestId !== requestIdRef.current) {
        return;
      }

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

  // Submit the current answer to Gemini.
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
      setError(
        "Please speak or type an answer first."
      );
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

      if (requestId !== requestIdRef.current) {
        return;
      }

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
          saveInterviewResult(
            updatedHistory,
            interviewContext,
            updatedHistory.length >= MAX_QUESTIONS
              ? MAX_QUESTIONS
              : updatedHistory.length
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

  // Continue with the adaptive follow-up question.
  const nextQuestion = () => {
    if (!nextQuestionText || loading) {
      return;
    }

    stopListening();

    setCurrentQuestion(nextQuestionText);
    setNextQuestionText(null);
    setQuestionIndex((previous) => previous + 1);
    setAnswer("");
    setFeedback(null);
    setError("");

    transcriptRef.current = "";
  };

  // Restart the entire interview.
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

  // Calculate AI-estimated average score.
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
          GEMINI AI TECHNICAL INTERVIEW
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Practice explaining your code
        </h2>

        <p className="mt-3 text-slate-600">
          Answer technical questions using your voice or
          keyboard. Gemini evaluates your explanation and
          generates adaptive follow-up questions.
        </p>
      </div>

      {/* START INTERVIEW */}
      {!currentQuestion && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <MessageSquare size={24} />
            </div>

            <div>
              <h3 className="font-semibold">
                AI Mock Interview
              </h3>

              <p className="text-sm text-slate-500">
                Up to {MAX_QUESTIONS} adaptive technical questions
              </p>
            </div>
          </div>

          <p className="mb-5 text-sm text-slate-600">
            Interview topic: {interviewContext.title}
          </p>

          <button
            type="button"
            onClick={startInterview}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
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

          {/* MICROPHONE AND SUBMIT BUTTONS */}
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

          {/* GEMINI FEEDBACK */}
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
                AI-estimated interview answer score
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

      {/* ERROR MESSAGE */}
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
