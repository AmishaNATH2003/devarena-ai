
const SESSION_KEY = "devarena-active-assessment";

export function saveAssessmentSession(assessment) {
  if (!assessment || !assessment.id) {
    return false;
  }

  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(assessment)
    );

    return true;
  } catch {
    return false;
  }
}

export function getAssessmentSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);

    if (!saved) {
      return null;
    }

    const assessment = JSON.parse(saved);

    if (
      !assessment ||
      typeof assessment !== "object" ||
      !assessment.id ||
      typeof assessment.title !== "string"
    ) {
      return null;
    }

    return assessment;
  } catch {
    return null;
  }
}

export function clearAssessmentSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
