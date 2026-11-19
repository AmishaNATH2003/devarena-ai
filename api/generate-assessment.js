
const ALLOWED_TECHNOLOGIES = ["java", "sql", "react"];
const ALLOWED_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
];

export default async function handler(req, res) {
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

Generate ONE realistic ${difficulty} debugging assessment
using ${technology}.

The assessment should resemble a small, broken project
that a junior software engineer might receive at work.

Requirements:
- Create an original, practical debugging scenario.
- Include 2 or 3 related source files.
- Introduce 1 to 3 intentional bugs.
- Explain the expected behavior.
- Provide clear acceptance criteria.
- Do not reveal the complete solution.
- Do not include markdown code fences.
- Keep the challenge reasonably small.

Return JSON only, using this structure:
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

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
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
            maxOutputTokens: 4096,
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      console.error(
        "Assessment generation failed:",
        response.status
      );

      return res.status(502).json({
        error: "AI assessment generation failed.",
      });
    }

    const data = await response.json();

    const raw = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("");

    if (!raw) {
      return res.status(502).json({
        error: "AI returned an empty assessment.",
      });
    }

    const generated = JSON.parse(raw);

    if (
      typeof generated.title !== "string" ||
      typeof generated.description !== "string" ||
      !Array.isArray(generated.instructions) ||
      !generated.files ||
      typeof generated.files !== "object" ||
      Array.isArray(generated.files) ||
      !Object.prototype.hasOwnProperty.call(
        generated.files,
        generated.startingFile
      )
    ) {
      return res.status(502).json({
        error: "AI returned an invalid assessment format.",
      });
    }

    return res.status(200).json({
      assessment: generated,
    });
  } catch (error) {
    console.error(
      "Assessment generation error:",
      error.message
    );

    return res.status(502).json({
      error: "Unable to generate an assessment.",
    });
  }
}
