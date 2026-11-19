
import process from "node:process";

const ALLOWED_TECHNOLOGIES = ["java", "sql", "react"];

const ALLOWED_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
];

const GEMINI_MODEL = "gemini-3.5-flash-lite";

const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RETRYABLE_STATUS_CODES = [502, 503, 504];

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export default async function handler(req, res) {
  // Accept POST requests only.
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are supported.",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "AI service is not configured.",
    });
  }

  const { technology, difficulty } = req.body || {};

  // Validate candidate selections.
  if (
    !ALLOWED_TECHNOLOGIES.includes(technology) ||
    !ALLOWED_DIFFICULTIES.includes(difficulty)
  ) {
    return res.status(400).json({
      error: "Invalid technology or difficulty.",
    });
  }

  // Define assessment complexity.
  const complexity = {
    beginner: {
      bugs: "1 to 2",
      description:
        "Focus on foundational debugging, simple business logic, and clear requirements.",
    },
    intermediate: {
      bugs: "2 to 3",
      description:
        "Include interactions between files, realistic business logic, validation, and error handling.",
    },
    advanced: {
      bugs: "3 to 4",
      description:
        "Include more complex interactions, edge cases, and realistic architectural or state-management problems.",
    },
  };

  const selectedComplexity = complexity[difficulty];

  const prompt = `
You are DevArena AI's software engineering assessment designer.

Generate ONE original, practical software debugging assessment.

Technology: ${technology}
Difficulty: ${difficulty}

Complexity requirements:
- Include ${selectedComplexity.bugs} intentional bugs.
- ${selectedComplexity.description}
- Generate 2 to 4 related source files.
- Make the scenario feel like a real engineering assignment.
- Keep the project small enough to inspect in a browser editor.
- All supplied source files must be internally consistent.
- Include clear and testable acceptance criteria.
- Describe expected behavior and existing problems.
- Do not reveal the corrected code or complete solution.
- Do not include Markdown code fences.
- Do not claim that code has been compiled or tested.

Technology guidelines:

JAVA:
Create a small Java application or backend-related task.
Use realistic classes and methods.

SQL:
Create realistic database queries and debugging tasks.
Include sample table schemas or data where appropriate.

REACT:
Create a small React application with JavaScript or JSX.
Focus on component behavior, state, API integration,
or error handling.

Return valid JSON only in this exact structure:

{
  "title": "Assessment title",
  "description": "Real-world scenario and expected behavior",
  "technology": "${technology}",
  "difficulty": "${difficulty}",
  "startingFile": "Main.java",
  "instructions": [
    "First acceptance criterion",
    "Second acceptance criterion",
    "Third acceptance criterion"
  ],
  "files": {
    "Main.java": "Actual source code",
    "OtherFile.java": "Actual source code"
  }
}

Important:
The filenames above are examples only.
Choose filenames and extensions appropriate for ${technology}.
The startingFile must exist in the files object.
All file values must contain source code or relevant project data.
`;

  const requestBody = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
  });

  try {
    let response;

    // Retry temporary upstream service failures.
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: requestBody,
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        break;
      }

      console.error(
        `Assessment generation attempt ${attempt + 1} failed:`,
        response.status
      );

      if (!RETRYABLE_STATUS_CODES.includes(response.status)) {
        break;
      }

      if (attempt < 2) {
        const delay = 1000 * 2 ** attempt;
        await sleep(delay);
      }
    }

    // Handle unsuccessful Gemini responses.
    if (!response.ok) {
      console.error(
        "Assessment generation failed:",
        response.status
      );

      const errorMessage =
        response.status === 429
          ? "AI request quota reached. Please try again later."
          : RETRYABLE_STATUS_CODES.includes(response.status)
            ? "Gemini is temporarily unavailable. Please try again later."
            : "AI assessment generation failed.";

      return res.status(502).json({
        error: errorMessage,
      });
    }

    // Read Gemini response.
    const data = await response.json();

    const raw = data.candidates?.[0]?.content?.parts
      ?.filter((part) => typeof part.text === "string")
      .map((part) => part.text)
      .join("");

    if (!raw) {
      return res.status(502).json({
        error: "Gemini returned an empty assessment.",
      });
    }

    let generated;

    try {
      generated = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: "Gemini returned invalid JSON.",
      });
    }

    // Validate generated assessment structure.
    const files = generated?.files;

    const validFiles =
      files &&
      typeof files === "object" &&
      !Array.isArray(files) &&
      Object.keys(files).length >= 2 &&
      Object.keys(files).length <= 8 &&
      Object.entries(files).every(
        ([name, code]) =>
          typeof name === "string" &&
          name.length <= 120 &&
          typeof code === "string" &&
          code.trim().length > 0 &&
          code.length <= 12000
      );

    const validInstructions =
      Array.isArray(generated?.instructions) &&
      generated.instructions.length > 0 &&
      generated.instructions.length <= 15 &&
      generated.instructions.every(
        (instruction) =>
          typeof instruction === "string" &&
          instruction.trim().length > 0 &&
          instruction.length <= 1000
      );

    if (
      typeof generated?.title !== "string" ||
      !generated.title.trim() ||
      generated.title.length > 200 ||
      typeof generated.description !== "string" ||
      !generated.description.trim() ||
      generated.description.length > 4000 ||
      generated.technology !== technology ||
      generated.difficulty !== difficulty ||
      typeof generated.startingFile !== "string" ||
      !validFiles ||
      !validInstructions ||
      !Object.prototype.hasOwnProperty.call(
        files,
        generated.startingFile
      )
    ) {
      return res.status(502).json({
        error: "Gemini returned an invalid assessment format.",
      });
    }

    // Return assessment to React frontend.
    return res.status(200).json({
      assessment: {
        title: generated.title,
        description: generated.description,
        technology,
        difficulty,
        startingFile: generated.startingFile,
        instructions: generated.instructions,
        files: generated.files,
      },
    });
  } catch (error) {
    console.error(
      "Assessment generation error:",
      error.message
    );

    return res.status(502).json({
      error:
        "Unable to generate an assessment. Please try again.",
    });
  }
}
