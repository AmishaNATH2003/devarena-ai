
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Send,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { saveInterviewResult } from "../utils/interviewStorage";

// Interview questions
const questions = [
  {
    question:
      "Walk me through the bug you identified in the Java REST API.",
    keywords: ["validation", "id", "zero", "condition"],
    guidance:
      "Explain the original bug, why ID zero should be rejected, and the change you made.",
  },
  {
    question:
      "How did you handle a user that does not exist in the system?",
    keywords: ["404", "exception", "not found", "http"],
    guidance:
      "Discuss HTTP 404 and how Spring Boot maps exceptions to responses.",
  },
  {
    question:
      "How would you test this API to make sure your changes work?",
    keywords: ["test", "invalid", "valid", "response"],
    guidance:
      "Mention valid IDs, invalid IDs, nonexistent users, and expected HTTP responses.",
  },
];

export default function InterviewPractice() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const recognitionRef = useRef(null);

  // Store finalized speech segments without duplicating text
  const transcriptRef = useRef("");

  const currentQuestion = questions[questionIndex];

  // Cleanup microphone when component unmounts
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  // Start browser speech recognition
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

    // Preserve any text already typed
    transcriptRef.current = answer.trim();

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalized = "";
      let interim = "";

      // Rebuild recognition transcript from the session results.
      // This prevents repeated text from being appended.
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
      setError(`Speech recognition error: ${event.error}`);
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

  // Stop microphone
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setListening(false);
  };

  // Submit one interview answer
  const submitAnswer = () => {
    if (feedback !== null) {
      return;
    }

    if (!answer.trim()) {
      setError("Please speak or type an answer first.");
      return;
    }

    stopListening();
    setError("");

    const normalizedAnswer = answer.toLowerCase();

    const matched = currentQuestion.keywords.filter(
      (keyword) => normalizedAnswer.includes(keyword)
    );

    const score = Math.round(
      (matched.length / currentQuestion.keywords.length) * 100
    );

    const result = {
      question: currentQuestion.question,
      answer: answer.trim(),
      score,
      matched,
      guidance: currentQuestion.guidance,
    };

    // Display feedback
    setFeedback(result);

    // Record current answer
    const updatedHistory = [...history, result];
    setHistory(updatedHistory);

    // Automatically save after final question
    if (questionIndex === questions.length - 1) {
      try {
        saveInterviewResult(updatedHistory);
        setSaved(true);
      } catch {
        setError(
          "Interview finished, but saving failed. Check browser storage permissions."
        );
      }
    }
  };

  // Move to next question
  const nextQuestion = () => {
    if (questionIndex >= questions.length - 1) {
      return;
    }

    stopListening();

    setQuestionIndex((previous) => previous + 1);
    setAnswer("");
    setFeedback(null);
    setError("");

    transcriptRef.current = "";
  };

  // Restart the interview
  const restart = () => {
    stopListening();

    setQuestionIndex(0);
    setAnswer("");
    setFeedback(null);
    setHistory([]);
    setError("");
    setSaved(false);

    transcriptRef.current = "";
  };

  const finished =
    questionIndex === questions.length - 1 &&
    feedback !== null;

  const averageScore =
    history.length > 0
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
        <p className="text-sm font-semibold text-indigo-600">
          TECHNICAL INTERVIEW SIMULATOR
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Practice explaining your code
        </h2>

        <p className="mt-3 text-slate-600">
          Answer technical follow-up questions using your microphone
          or keyboard.
        </p>
      </div>

      {/* QUESTION CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-indigo-600">
            Question {questionIndex + 1} of {questions.length}
          </span>

          <MessageSquare
            size={20}
            className="text-indigo-600"
          />
        </div>

        {/* QUESTION */}
        <h3 className="mt-5 text-xl font-semibold">
          {currentQuestion.question}
        </h3>

        {/* ANSWER INPUT */}
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Speak or type your explanation here..."
          disabled={feedback !== null}
          className="mt-6 min-h-40 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-indigo-500"
        />

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        {/* MICROPHONE AND SUBMIT BUTTONS */}
        {!feedback && (
          <div className="mt-5 flex flex-wrap gap-3">

            <button
              type="button"
              onClick={
                listening ? stopListening : startListening
              }
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white ${
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
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold"
            >
              <Send size={17} />
              Submit Answer
            </button>

          </div>
        )}

        {/* ANSWER FEEDBACK */}
        {feedback && (
          <div className="mt-6 rounded-xl bg-indigo-50 p-5">

            <div className="flex items-center gap-2">
              <CheckCircle2
                size={20}
                className="text-indigo-600"
              />

              <h4 className="font-semibold">
                Answer Feedback
              </h4>
            </div>

            <p className="mt-4 text-2xl font-bold text-indigo-700">
              {feedback.score}%
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Topic coverage based on predefined keywords.
              This is not a validated interview-performance score.
            </p>

            <p className="mt-4 text-sm text-slate-700">
              {feedback.guidance}
            </p>

            {/* NEXT OR RESTART */}
            <div className="mt-5 flex flex-wrap gap-3">

              {!finished ? (
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Next Question
                </button>
              ) : (
                <button
                  type="button"
                  onClick={restart}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  <RotateCcw size={16} />
                  Restart Interview
                </button>
              )}

            </div>

            {finished && saved && (
              <p className="mt-4 text-sm font-medium text-green-700">
                Interview completed and saved successfully.
                View your results under My Progress.
              </p>
            )}
          </div>
        )}

      </div>

      {/* INTERVIEW SUMMARY */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">

          <h3 className="font-semibold">
            Interview Summary
          </h3>

          <p className="mt-3 text-sm text-slate-600">
            Questions answered: {history.length}/{questions.length}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Average topic coverage: {averageScore}%
          </p>

          {finished && saved && (
            <div className="mt-4 rounded-lg bg-green-50 p-4">
              <p className="text-sm font-medium text-green-700">
                Interview results are saved in your browser.
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
