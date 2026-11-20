
import process from "node:process";

const ALLOWED_TECHNOLOGIES = ["java", "sql", "react"];
const ALLOWED_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
];

const MODEL = "gemini-3.5-flash-lite";
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([
  429, 500, 502, 503, 504,
]);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function validAssessment(data) {
  return (
    data &&
    typeof data.title === "string" &&
    typeof data.description === "string" &&
    Array.isArray(data.instructions) &&
    data.files &&
    typeof data.files === "object" &&
    !Array.isArray(data.files) &&
    Object.keys(data.files).length >= 2 &&
    Object.values(data.files).every(
      (value) => typeof value === "string"
    ) &&
    typeof data.startingFile === "string" &&
    Object.prototype.hasOwnProperty.call(
      data.files,
      data.startingFile
    )
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
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

Requirements:
- A realistic broken project with 2 or 3 files.
- Include 1 to 3 deliberate bugs.
- Keep each file concise.
- Show realistic source code.
- Provide clear instructions and acceptance criteria.
- State expected behavior without giving away the fix.
- All file values must be source-code strings.
- Return valid JSON only.
- Do not use Markdown code fences.

Return exactly this JSON structure:
{
  "title": "string",
  "description": "string",
  "technology": "${technology}",
  "difficulty": "${difficulty}",
  "startingFile": "filename",
  "instructions": ["string", "string"],
  "files": {
    "filename": "source code"
  }
}
`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${MODEL}:generateContent`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        const details = await response.text();

        // Server-side debugging only.
        console.error("Gemini generation failed", {
          attempt,
          status: response.status,
          details: details.slice(0, 1000),
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
              "Gemini is temporarily unavailable. Please retry.",
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
        console.error("Gemini returned empty content", {
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
        console.error(
          "Gemini returned invalid JSON",
          { attempt }
        );

        if (attempt < MAX_ATTEMPTS) {
          await sleep(800 * attempt);
          continue;
        }

        return res.status(502).json({
          error:
            "Gemini returned invalid assessment JSON.",
        });
      }

      if (!validAssessment(generated)) {
        console.error(
          "Assessment validation failed",
          { attempt }
        );

        if (attempt < MAX_ATTEMPTS) {
          await sleep(800 * attempt);
          continue;
        }

        return res.status(502).json({
          error:
            "Gemini returned an invalid assessment format.",
        });
      }

      return res.status(200).json({
        assessment: generated,
      });
    } catch (error) {
      console.error(
        "AI assessment request error",
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
          "Assessment generation request failed. Check server logs.",
      });
    }
  }

  return res.status(502).json({
    error: "Assessment generation failed.",
  });
}
