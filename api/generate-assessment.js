
import process from "node:process";

import {
  validateGeneratedAssessment,
  ASSESSMENT_LIMITS,
} from "../src/utils/assessmentValidation.js";

const ALLOWED_TECHNOLOGIES = [
  "java",
  "sql",
  "react",
];

const ALLOWED_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
];

const MODEL = "gemini-3.5-flash-lite";
const MAX_ATTEMPTS = 3;

const RETRYABLE_STATUSES = new Set([
  429,
  500,
  502,
  503,
  504,
]);

const sleep = (milliseconds) =>
  new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );

function isValidGeneratedProject(project) {
  const errors = validateGeneratedAssessment(project);

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  const fileCount = Object.keys(project.files).length;

  if (fileCount < 2 || fileCount > 3) {
    return {
      valid: false,
      errors: ["files: expected 2 or 3"],
    };
  }

  if (
    !ALLOWED_TECHNOLOGIES.includes(
      project.technology
    ) ||
    !ALLOWED_DIFFICULTIES.includes(
      project.difficulty
    )
  ) {
    return {
      valid: false,
      errors: ["technology or difficulty"],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Only POST requests are supported.",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "Gemini API key is not configured.",
    });
  }

  const { technology, difficulty } = req.body || {};

  if (
    !ALLOWED_TECHNOLOGIES.includes(technology) ||
    !ALLOWED_DIFFICULTIES.includes(difficulty)
  ) {
    return res.status(400).json({
      error: "Invalid technology or difficulty.",
    });
  }

  const prompt = `
You are an expert software engineering assessment designer.

Create ONE original ${difficulty} debugging assessment
in ${technology} for a software engineer.

The project must contain:
- Exactly 2 or 3 source files.
- Between 1 and 3 deliberate functional bugs.
- Realistic source code suitable for debugging.
- Clear instructions and acceptance criteria.
- Expected behavior without revealing solutions.

STRICT OUTPUT LIMITS:
- Title: 1-${ASSESSMENT_LIMITS.maxTitleLength} characters.
- Description: maximum ${ASSESSMENT_LIMITS.maxDescriptionLength} characters.
- Maximum ${ASSESSMENT_LIMITS.maxInstructions} instructions.
- Each instruction: maximum ${ASSESSMENT_LIMITS.maxInstructionLength} characters.
- Each filename: maximum ${ASSESSMENT_LIMITS.maxFilenameLength} characters.
- Each file: maximum ${ASSESSMENT_LIMITS.maxFileLength} characters.
- File contents must be source-code strings.
- Keep files compact and realistic.
- startingFile must exactly match an existing filename.

Return only valid JSON.
Do not include Markdown code fences.

Return this JSON structure:

{
  "title": "string",
  "description": "string",
  "technology": "${technology}",
  "difficulty": "${difficulty}",
  "startingFile": "filename",
  "instructions": [
    "Requirement one",
    "Requirement two"
  ],
  "files": {
    "filename1": "source code",
    "filename2": "source code"
  }
}
`;

  const url =
    "https://generativelanguage.googleapis.com/" +
    `v1beta/models/${MODEL}:generateContent`;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      const response = await fetch(url, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],

          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        }),

        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const details = await response.text();

        console.error("Gemini generation failed", {
          attempt,
          status: response.status,
          details: details.slice(0, 500),
        });

        if (
          RETRYABLE_STATUSES.has(response.status) &&
          attempt < MAX_ATTEMPTS
        ) {
          await sleep(800 * attempt);
          continue;
        }

        if (response.status === 429) {
          return res.status(503).json({
            error:
              "Gemini rate limit reached. Please try again later.",
          });
        }

        if (response.status === 503) {
          return res.status(503).json({
            error:
              "Gemini is temporarily unavailable.",
          });
        }

        return res.status(502).json({
          error:
            "Gemini could not generate the assessment.",
        });
      }

      const data = await response.json();

      const raw = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("");

      if (!raw) {
        console.error("Empty Gemini response", {
          attempt,
          finishReason:
            data.candidates?.[0]?.finishReason,
        });

        if (attempt < MAX_ATTEMPTS) {
          await sleep(800 * attempt);
          continue;
        }

        return res.status(502).json({
          error:
            "Gemini returned no assessment content.",
        });
      }

      let generated;

      try {
        generated = JSON.parse(raw);
      } catch {
        console.error("Invalid generated JSON", {
          attempt,
        });

        if (attempt < MAX_ATTEMPTS) {
          await sleep(800 * attempt);
          continue;
        }

        return res.status(502).json({
          error:
            "Gemini returned invalid assessment JSON.",
        });
      }

      const validation =
        isValidGeneratedProject(generated);

      if (
        !validation.valid ||
        generated.technology !== technology ||
        generated.difficulty !== difficulty
      ) {
        console.error("Generated assessment rejected", {
          attempt,
          errors: validation.errors,
        });

        if (attempt < MAX_ATTEMPTS) {
          await sleep(800 * attempt);
          continue;
        }

        return res.status(502).json({
          error:
            "The generated assessment did not meet the required format or size limits. Try generating another.",
        });
      }

      return res.status(200).json({
        assessment: generated,
      });
    } catch (error) {
      console.error(
        "Assessment generation request error",
        {
          attempt,
          message: error.message,
        }
      );

      if (attempt < MAX_ATTEMPTS) {
        await sleep(800 * attempt);
        continue;
      }

      return res.status(502).json({
        error:
          "Assessment generation request failed.",
      });
    }
  }

  return res.status(502).json({
    error: "Assessment generation failed.",
  });
}
