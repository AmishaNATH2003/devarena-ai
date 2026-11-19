
const INTERVIEW_STORAGE_KEY = "devarena-interview-progress";

export function saveInterviewResult(
  answers,
  assessment = null,
  totalQuestions = 5
) {
  const averageScore = answers.length
    ? Math.round(
        answers.reduce(
          (sum, item) => sum + item.score,
          0
        ) / answers.length
      )
    : 0;

  const result = {
    assessmentId: assessment?.id || "ai-interview",
    assessmentTitle:
      assessment?.title || "Software Engineering Interview",
    questionsAnswered: answers.length,
    totalQuestions,
    averageScore,
    completed: answers.length >= totalQuestions,
    answers,
    completedAt: new Date().toISOString(),
    evaluationType: "ai-interview-review",
  };

  localStorage.setItem(
    INTERVIEW_STORAGE_KEY,
    JSON.stringify(result)
  );

  return result;
}

export function getInterviewResult() {
  try {
    const saved = localStorage.getItem(
      INTERVIEW_STORAGE_KEY
    );

    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}
