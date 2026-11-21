
import {
  readUserStorage,
  writeUserStorage,
} from "./userStorage";

const STORAGE_KEY = "assessment-progress";

/**
 * Return coding assessment results belonging to
 * the currently signed-in user.
 */
export function getAssessmentResults() {
  const stored = readUserStorage(STORAGE_KEY, {});

  if (
    !stored ||
    typeof stored !== "object" ||
    Array.isArray(stored)
  ) {
    return {};
  }

  return stored;
}

/**
 * Save the most recent result for an assessment.
 * Preserve the existing return format used by
 * AssessmentWorkspace.jsx.
 */
export function saveAssessmentResult(result) {
  if (!result?.assessmentId) {
    throw new Error("Assessment ID is required.");
  }

  const existing = getAssessmentResults();

  const updated = {
    ...existing,
    [result.assessmentId]: {
      ...result,
      completedAt: new Date().toISOString(),
    },
  };

  writeUserStorage(STORAGE_KEY, updated);

  return updated;
}
