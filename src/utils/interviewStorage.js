
const INTERVIEW_STORAGE_KEY = "devarena-interview-progress";

const INTERVIEW_HISTORY_KEY = "devarena-interview-history";

// Safely read data from localStorage.
function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

// Retrieve all completed interview attempts.
export function getInterviewHistory() {
  const history = readStorage(INTERVIEW_HISTORY_KEY, []);

  if (Array.isArray(history)) {
    if (history.length > 0) {
      return history;
    }

    // If the history is empty, import the old
    // single-result format when available.
    const legacy = getInterviewResult();

    return legacy ? [legacy] : [];
  }

  return [];
}

// Keep backward compatibility with ProgressDashboard.jsx.
export function getInterviewResult() {
  const latest = readStorage(INTERVIEW_STORAGE_KEY, null);

  if (latest) {
    return latest;
  }

  const history = readStorage(INTERVIEW_HISTORY_KEY, []);

  return Array.isArray(history) && history.length > 0
    ? history[0]
    : null;
}

// Save a completed interview as a new attempt.
export function saveInterviewResult(
  answers,
  assessment = null,
  totalQuestions = 5
) {
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error(
      "Cannot save an interview without answers."
    );
  }

  const averageScore = Math.round(
    answers.reduce(
      (sum, item) => sum + Number(item.score || 0),
      0
    ) / answers.length
  );

  const mode =
    assessment?.mode === "resume"
      ? "resume"
      : "assignment";

  const result = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `interview-${Date.now()}`,

    assessmentId: assessment?.id || "ai-interview",

    assessmentTitle:
      assessment?.title || "Software Engineering Interview",

    mode,

    targetRole:
      mode === "resume"
        ? assessment?.targetRole || ""
        : "",

    interviewType:
      assessment?.interviewType || "technical",

    questionsAnswered: answers.length,
    totalQuestions,
    averageScore,

    completed: answers.length >= totalQuestions,

    answers,

    completedAt: new Date().toISOString(),

    evaluationType: "ai-interview-review",
  };

  // Existing history, including any legacy result.
  const history = getInterviewHistory();

  const updatedHistory = [
    result,
    ...history,
  ];

  // Save full history.
  localStorage.setItem(
    INTERVIEW_HISTORY_KEY,
    JSON.stringify(updatedHistory)
  );

  // Also maintain the latest result for existing components.
  localStorage.setItem(
    INTERVIEW_STORAGE_KEY,
    JSON.stringify(result)
  );

  return result;
}
