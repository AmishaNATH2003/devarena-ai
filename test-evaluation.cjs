
const BASE_URL =
  process.env.TEST_BASE_URL ||
  "http://localhost:3001";

async function sendEvaluation(label, payload) {
  console.log(`\n--- ${label} ---`);

  try {
    const response = await fetch(
      `${BASE_URL}/api/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000),
      }
    );

    const data = await response.json();

    console.log("HTTP Status:", response.status);

    if (!response.ok) {
      console.log("Error:", data.error);

      if (data.invalidFields) {
        console.log(
          "Invalid Fields:",
          data.invalidFields
        );
      }

      return {
        status: response.status,
        data,
      };
    }

    console.log(
      "Evaluation:",
      JSON.stringify(data.evaluation, null, 2)
    );
    console.log("Overall Score:", data.overallScore);
    console.log("Changed Files:", data.changedFiles);
    console.log("Source Checks:", data.sourceChecks);
    console.log("Tests Executed:", data.testsExecuted);

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    console.error("Request failed:", error.message);
    process.exitCode = 1;
    return null;
  }
}

function expectStatus(label, result, expected) {
  if (!result) {
    console.error(`FAIL: ${label} - no response`);
    process.exitCode = 1;
    return;
  }

  if (result.status === expected) {
    console.log(`PASS: ${label}`);
  } else {
    console.error(
      `FAIL: ${label} - expected ${expected}, got ${result.status}`
    );
    process.exitCode = 1;
  }
}

async function main() {
  const { challenges } = await import(
    "./src/data/challenges.js"
  );

  const originalFiles = {
    "Cart.java": `
public class Cart {
    public double calculateSubtotal(
        double price, int quantity
    ) {
        return price;
    }

    public double calculateTotal(
        double subtotal
    ) {
        return subtotal * 10;
    }
}
`,
  };

  const correctedFiles = {
    "Cart.java": `
public class Cart {
    public double calculateSubtotal(
        double price, int quantity
    ) {
        return price * quantity;
    }

    public double calculateTotal(
        double subtotal
    ) {
        return subtotal * 1.10;
    }
}
`,
  };

  const generatedBase = {
    assessmentId: "ai-shopping-cart-test",
    title: "Fix Shopping Cart Calculations",
    description:
      "Fix subtotal and tax calculations in a Java shopping cart.",
    instructions: [
      "Multiply price by quantity to calculate subtotal.",
      "Apply a tax rate of 10%.",
      "Return the correct final total.",
    ],
    originalFiles,
  };

  const missingId = await sendEvaluation(
    "Missing Assessment ID",
    {
      title: "Test Assessment",
      description: "Test description",
      instructions: ["Fix the bug"],
      files: {
        "Main.java": "class Main {}",
      },
    }
  );

  expectStatus(
    "Missing Assessment ID",
    missingId,
    400
  );

  const generatedUnchanged = await sendEvaluation(
    "Unchanged Generated Assignment",
    {
      ...generatedBase,
      files: { ...originalFiles },
    }
  );

  expectStatus(
    "Unchanged Generated Assignment",
    generatedUnchanged,
    422
  );

  const missingOriginal = await sendEvaluation(
    "Missing Generated Baseline",
    {
      assessmentId: generatedBase.assessmentId,
      title: generatedBase.title,
      description: generatedBase.description,
      instructions: generatedBase.instructions,
      files: correctedFiles,
    }
  );

  expectStatus(
    "Missing Generated Baseline",
    missingOriginal,
    400
  );

  const generatedChanged = await sendEvaluation(
    "Corrected Generated Assignment",
    {
      ...generatedBase,
      files: correctedFiles,
    }
  );

const cosmeticEdit = await sendEvaluation(
  "Comment-Only Generated Assignment",
  {
    ...generatedBase,
    files: {
      "Cart.java":
        originalFiles["Cart.java"] +
        "\n// TODO: Fix the shopping cart bugs",
    },
  }
);

if (cosmeticEdit?.status === 200) {
  const correctness =
    cosmeticEdit.data.evaluation.correctness;

  console.log(
    "Comment-only correctness score:",
    correctness
  );

  if (correctness > 20) {
    console.warn(
      "WARNING: Cosmetic changes received too much credit."
    );
  } else {
    console.log(
      "PASS: Cosmetic changes received low correctness."
    );
  }
}


  if (generatedChanged) {
    expectStatus(
      "Corrected Generated Assignment",
      generatedChanged,
      200
    );

    if (
      generatedChanged.status === 200 &&
      !generatedChanged.data.changedFiles?.includes(
        "Cart.java"
      )
    ) {
      console.error(
        "FAIL: Cart.java was not detected as changed."
      );
      process.exitCode = 1;
    }
  }

  const sqlChallenge = challenges[2];

  const unchangedSql = await sendEvaluation(
    "Unchanged SQL Assignment",
    {
      assessmentId: 2,
      title: "Fix SQL Query",
      description: sqlChallenge.description,
      instructions: sqlChallenge.instructions,
      files: { ...sqlChallenge.files },
    }
  );

  expectStatus(
    "Unchanged SQL Assignment",
    unchangedSql,
    422
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
