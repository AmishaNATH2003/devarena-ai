
async function testGemini() {
  try {
    const response = await fetch(
      "http://localhost:3003/api/coach",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message:
            "Find the validation bug in my code. Give me a hint without revealing the complete solution.",

          activeFile: "UserService.java",

          challengeDescription:
            "Debug a Java REST API that incorrectly handles invalid user IDs.",

          files: {
            "UserService.java": `
public class UserService {
    public User findById(int id) {
        if (id < 0) {
            throw new IllegalArgumentException("Invalid ID");
        }
        return null;
    }
}
`,
          },
        }),
      }
    );

    const data = await response.text();

    console.log("Status:", response.status);
    console.log("Response:", data);
  } catch (error) {
    console.error("Request failed:", error.message);
  }
}

testGemini();
