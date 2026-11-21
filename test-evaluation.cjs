
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

    console.log(
      "Overall Score:",
      data.overallScore
    );

    console.log(
      "Source Checks:",
      data.sourceChecks
    );

    console.log(
      "Tests Executed:",
      data.testsExecuted
    );

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    console.error(
      "Request failed:",
      error.message
    );

    return null;
  }
}

async function main() {
  // Test 1: Missing assessment ID must return 400.
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

  if (
    missingId &&
    missingId.status !== 400
  ) {
    console.error(
      "FAIL: Missing ID should return HTTP 400."
    );
    process.exitCode = 1;
  }

  // Test 2: Valid generated-assignment request.
  // The API performs static Gemini evaluation.
  const generated = await sendEvaluation(
    "Generated Assessment",
    {
      assessmentId: "ai-shopping-cart-test",

      title: "Fix Shopping Cart Calculations",

      description:
        "Fix subtotal and tax calculations in a Java shopping cart.",

      instructions: [
        "Multiply price by quantity to calculate subtotal.",
        "Apply a tax rate of 10%.",
        "Return the correct final total.",
      ],

      files: {
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
      },
    }
  );

  if (
    generated &&
    generated.status !== 200
  ) {
    console.warn(
      "Generated assessment was not scored.",
      "Check Gemini availability and server logs."
    );
  }

  // Test 3: Original predefined assignment.
  // Must return 422 without making a Gemini call.
  const unchanged = await sendEvaluation(
    "Unchanged SQL Assignment",
    {
      assessmentId: 2,

      title: "Fix a SQL Query",

      description:
        "Repair the employee report query so it returns active employees and their departments in salary order.",

      instructions: [
        "Join employees.department_id to departments.id.",
        "Include only active employees (status = 'active').",
        "Sort by salary from highest to lowest.",
      ],

      files: {
        "schema.sql": `CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INTEGER,
  status VARCHAR(20) NOT NULL,
  salary INTEGER NOT NULL
);`,

        "sample-data.sql": `INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Support');

INSERT INTO employees VALUES
  (101, 'Asha', 1, 'active', 80000),
  (102, 'Ravi', 2, 'inactive', 50000),
  (103, 'Neha', 1, 'active', 95000);

-- Expected result: Neha (95000), Asha (80000).`,

        "report.sql": `SELECT e.name, d.name AS department, e.salary
FROM employees e
JOIN departments d ON e.id = d.id
WHERE e.status = 'inactive'
ORDER BY e.salary ASC;`,
      },
    }
  );

  if (
    unchanged &&
    unchanged.status !== 422
  ) {
    console.error(
      "FAIL: Unchanged assignment should return HTTP 422."
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
