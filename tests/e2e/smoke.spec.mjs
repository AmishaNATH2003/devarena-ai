import { test, expect } from "@playwright/test";

const fakeChallenge = {
  title: "E2E Debugging Challenge",
  description: "Repair the calculation in a tiny project.",
  technology: "java",
  difficulty: "beginner",
  startingFile: "Calculator.java",
  instructions: ["Return the sum instead of the difference."],
  files: {
    "Calculator.java": "class Calculator { int add(int a, int b) { return a - b; } }",
    "README.md": "# Debugging challenge",
  },
};

async function login(page, email = "tester@example.com") {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.locator("#auth-password").fill("testing-only-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Learn to solve problems/i })).toBeVisible();
}

async function navigate(page, name) {
  const mobileMenuButton = page.getByRole("button", {
    name: "Open navigation",
  });

  // Mobile sidebar is translated offscreen; Playwright's isVisible()
  // can still report its child buttons as visible.
  if (await mobileMenuButton.isVisible()) {
    await mobileMenuButton.click();
  }

  const nav = page.getByRole("navigation").getByRole("button", {
    name,
    exact: true,
  });

  await nav.click();
}

async function openAssessments(page) {
  await navigate(page, "Assessments");
  await expect(page.getByText("All assessments")).toBeVisible();
}

async function signOut(page) {
  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
}

test("public login, signup and password reset screens", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.getByRole("button", { name: "Sign In", exact: true }).last().click();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Login" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("mock login, dashboard, navigation and logout", async ({ page }) => {
  await login(page);
  await openAssessments(page);
  await navigate(page, "Dashboard");
  await expect(page.getByText("Your Practice Overview")).toBeVisible();
  await signOut(page);
});

test("predefined challenge opens; unchanged code is blocked", async ({ page }) => {
  await login(page);
  await openAssessments(page);
  const card = page.locator("article").filter({ hasText: "Debug a Java REST API" });
  await card.getByRole("button", { name: "View challenge" }).click();
  await expect(page.getByRole("heading", { name: "Your task" })).toBeVisible();
  await expect(page.getByText("Project Explorer")).toBeVisible();
  await page.getByRole("button", { name: "Evaluate Solution with AI" }).click();
  await expect(page.getByRole("alert")).toContainText("haven't modified");
  await page.getByRole("button", { name: "Get Hints" }).click();
  await expect(page.getByText("Debugging hints")).toBeVisible();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your task" })).toBeVisible();
});

test("generated challenge works with mocked Gemini response", async ({ page }) => {
  await page.route("**/api/generate-assessment", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ assessment: fakeChallenge }),
    })
  );
  await login(page);
  await openAssessments(page);
  await page.getByRole("button", { name: "Generate Assessment", exact: true }).click();
  await expect(page.getByText("Assessment generated successfully")).toBeVisible();
  await page.getByRole("button", { name: "Start Assessment" }).click();
  await expect(page.getByRole("heading", { name: "E2E Debugging Challenge" })).toBeVisible();
  await page.getByRole("button", { name: "Evaluate Solution with AI" }).click();
  await expect(page.getByRole("alert")).toContainText("haven't modified");
});

test("a second user's account does not read the first user's saved draft", async ({ page }) => {
  await login(page, "one@example.com");
  await page.evaluate(() => localStorage.setItem(
    "devarena:v2:e2e-one-example-com:draft:1",
    JSON.stringify({ "UserService.java": "// private draft user one" })
  ));
  await signOut(page);
  await login(page, "two@example.com");
  await openAssessments(page);
  const card = page.locator("article").filter({ hasText: "Debug a Java REST API" });
  await card.getByRole("button", { name: "View challenge" }).click();
  await expect(page.getByText("Project Explorer")).toBeVisible();
  const secondDraft = await page.evaluate(
    () => localStorage.getItem("devarena:v2:e2e-two-example-com:draft:1")
  );
  expect(secondDraft).toBeNull();
  await expect(page.locator(".monaco-editor .view-lines").first())
    .not.toContainText("private draft user one");
});
