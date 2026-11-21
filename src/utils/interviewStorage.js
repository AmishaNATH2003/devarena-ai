
import {
  readUserStorage,
  writeUserStorage,
} from "./userStorage";

const INTERVIEW_STORAGE_KEY = "interview-progress";
const INTERVIEW_HISTORY_KEY = "interview-history";

/**
 * Retrieve all interview attempts for the
 * currently signed-in user.
 */
export function getInterviewHistory() {
  const history = readUserStorage(
    INTERVIEW_HISTORY_KEY,
    []
  );

  if (Array.isArray(history) && history.length > 0) {
    return history;
  }

  // Backward compatibility with the scoped
  // single-result format.
  const latest = readUserStorage(
    INTERVIEW_STORAGE_KEY,
    null
  );

  return latest ? [latest] : [];
}

/**
 * Retrieve the most recent interview result.
 */
export function getInterviewResult() {
  const latest = readUserStorage(
    INTERVIEW_STORAGE_KEY,
    null
  );

  if (latest) return latest;

  const history = readUserStorage(
    INTERVIEW_HISTORY_KEY,
    []
  );

  return Array.isArray(history) && history.length > 0
    ? history[0]
    : null;
}

/**
 * Save a completed interview attempt.
 *
 * The existing return format is preserved so
 * cloudProgress.js can upload this record.
 */
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
    id: crypto.randomUUID(),

    assessmentId:
      assessment?.id || "ai-interview",

    assessmentTitle:
      assessment?.title ||
      "Software Engineering Interview",

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

  const history = getInterviewHistory();

  const updatedHistory = [
    result,
    ...history,
  ];

  // Save the history and latest result separately.
  writeUserStorage(
    INTERVIEW_HISTORY_KEY,
    updatedHistory
  );

  writeUserStorage(
    INTERVIEW_STORAGE_KEY,
    result
  );

  return result;
}
