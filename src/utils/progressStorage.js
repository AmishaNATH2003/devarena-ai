
const STORAGE_KEY = "devarena-assessment-progress";

export function saveAssessmentResult(result) {
  const existing = getAssessmentResults();

  const updated = {
    ...existing,
    [result.assessmentId]: {
      ...result,
      completedAt: new Date().toISOString(),
    },
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getAssessmentResults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
