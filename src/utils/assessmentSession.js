
import {
  readUserStorage,
  writeUserStorage,
  removeUserStorage,
} from "./userStorage";

const SESSION_KEY = "active-assessment";

/**
 * Save the currently selected assessment for
 * the authenticated user.
 */
export function saveAssessmentSession(assessment) {
  if (
    !assessment ||
    typeof assessment !== "object" ||
    !assessment.id ||
    typeof assessment.title !== "string"
  ) {
    return false;
  }

  try {
    writeUserStorage(SESSION_KEY, assessment);
    return true;
  } catch (error) {
    console.error(
      "Unable to save assessment session:",
      error
    );

    return false;
  }
}

/**
 * Retrieve the current user's active assessment.
 *
 * Never read another user's assessment or
 * fall back to the old shared localStorage key.
 */
export function getAssessmentSession() {
  const assessment = readUserStorage(
    SESSION_KEY,
    null
  );

  if (
    !assessment ||
    typeof assessment !== "object" ||
    Array.isArray(assessment) ||
    !assessment.id ||
    typeof assessment.title !== "string"
  ) {
    return null;
  }

  return assessment;
}

/**
 * Clear only the currently authenticated user's
 * active assessment.
 */
export function clearAssessmentSession() {
  try {
    removeUserStorage(SESSION_KEY);
    return true;
  } catch (error) {
    console.error(
      "Unable to clear assessment session:",
      error
    );

    return false;
  }
}
