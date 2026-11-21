
export const ASSESSMENT_LIMITS = Object.freeze({
  maxTitleLength: 200,
  maxDescriptionLength: 4000,
  maxInstructions: 15,
  maxInstructionLength: 1000,
  maxFiles: 8,
  maxFilenameLength: 120,
  maxFileLength: 12000,
});

export function isValidAssessmentId(id) {
  return (
    (typeof id === "string" &&
      id.trim().length > 0 &&
      id.length <= 150) ||
    (Number.isInteger(id) && id > 0)
  );
}

export function validateAssessmentContent(data) {
  const errors = [];

  if (!data || typeof data !== "object" ||
      Array.isArray(data)) {
    return ["assessment"];
  }

  const { title, description, instructions, files } = data;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.length > ASSESSMENT_LIMITS.maxTitleLength
  ) {
    errors.push("title");
  }

  if (
    typeof description !== "string" ||
    description.length >
      ASSESSMENT_LIMITS.maxDescriptionLength
  ) {
    errors.push("description");
  }

  if (
    !Array.isArray(instructions) ||
    instructions.length > ASSESSMENT_LIMITS.maxInstructions ||
    instructions.some(
      (item) =>
        typeof item !== "string" ||
        item.length > ASSESSMENT_LIMITS.maxInstructionLength
    )
  ) {
    errors.push("instructions");
  }

  if (
    !files ||
    typeof files !== "object" ||
    Array.isArray(files)
  ) {
    errors.push("files");
  } else {
    const entries = Object.entries(files);

    if (
      entries.length === 0 ||
      entries.length > ASSESSMENT_LIMITS.maxFiles ||
      entries.some(
        ([name, code]) =>
          !name ||
          name.length >
            ASSESSMENT_LIMITS.maxFilenameLength ||
          typeof code !== "string" ||
          code.length > ASSESSMENT_LIMITS.maxFileLength
      )
    ) {
      errors.push("files");
    }
  }

  return errors;
}

export function validateGeneratedAssessment(data) {
  const errors = validateAssessmentContent(data);

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return errors;
  }

  if (
    typeof data.startingFile !== "string" ||
    !data.files ||
    typeof data.files !== "object" ||
    Array.isArray(data.files) ||
    !Object.hasOwn(data.files, data.startingFile)
  ) {
    errors.push("startingFile");
  }

  return [...new Set(errors)];
}
