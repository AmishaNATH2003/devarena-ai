
const INTERVIEW_STORAGE_KEY = "devarena-interview-progress";

export function saveInterviewResult(answers) {
  const averageScore = answers.length
    ? Math.round(
        answers.reduce((sum, item) => sum + item.score, 0) /
          answers.length
      )
    : 0;

  const result = {
    assessmentId: 1,
    assessmentTitle: "Debug a Java REST API",
    questionsAnswered: answers.length,
    totalQuestions: 3,
    averageScore,
    completed: answers.length === 3,
    answers,
    completedAt: new Date().toISOString(),
  };

  localStorage.setItem(
    INTERVIEW_STORAGE_KEY,
    JSON.stringify(result)
  );

  return result;
}

export function getInterviewResult() {
  try {
    const saved = localStorage.getItem(INTERVIEW_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}
