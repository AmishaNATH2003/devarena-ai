
async function testAssessment() {
  try {
    const response = await fetch(
      "http://localhost:3003/api/generate-assessment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          technology: "java",
          difficulty: "beginner",
        }),
      }
    );

    const data = await response.json();

    console.log("Status:", response.status);

    if (!response.ok) {
      console.log("Error:", data.error);
      return;
    }

    const assessment = data.assessment;

    console.log("Title:", assessment.title);
    console.log("Description:", assessment.description);
    console.log("Technology:", assessment.technology);
    console.log("Difficulty:", assessment.difficulty);
    console.log("Starting file:", assessment.startingFile);
    console.log("Files:", Object.keys(assessment.files));
    console.log("Instructions:", assessment.instructions);
  } catch (error) {
    console.error("Request failed:", error.message);
  }
}

testAssessment();
