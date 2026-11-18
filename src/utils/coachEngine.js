
import { challenges } from "../data/challenges";

export function getCoachReply({
  assessmentId,
  files,
  activeFile,
  message,
}) {
  const challenge = challenges[assessmentId];

  if (!challenge) {
    return "I couldn't find this challenge.";
  }

  const question = message.toLowerCase().trim();
  const checks = challenge.checks.map((test) => ({
    name: test.name,
    passed: test.check(files),
    hint: test.hint,
  }));

  const failed = checks.filter((test) => !test.passed);
  const code = files[activeFile] || "";

  if (
    question.includes("explain") ||
    question.includes("understand")
  ) {
    return (
      `You're viewing ${activeFile}. ` +
      `This file contains ${code.split("\n").length} lines. ` +
      `The challenge is: ${challenge.description} ` +
      `Start by comparing the code with the task requirements.`
    );
  }

  if (
    question.includes("check") ||
    question.includes("progress") ||
    question.includes("test")
  ) {
    const passed = checks.length - failed.length;

    if (failed.length === 0) {
      return (
        `Your code matches all ${checks.length} source checks. ` +
        "Remember that this does not guarantee runtime correctness."
      );
    }

    return (
      `${passed}/${checks.length} source checks currently pass. ` +
      `Investigate: ${failed.map((item) => item.name).join(", ")}.`
    );
  }

  if (
    question.includes("hint") ||
    question.includes("stuck") ||
    question.includes("bug") ||
    question.includes("help")
  ) {
    if (failed.length === 0) {
      return (
        "All current source checks pass. " +
        "Try reasoning about edge cases or explaining your changes."
      );
    }

    return (
      `Let's investigate one issue at a time. ` +
      `First: ${failed[0].name}. ` +
      failed[0].hint
    );
  }

  if (
    question.includes("solution") ||
    question.includes("answer")
  ) {
    return (
      "I won't reveal the full solution immediately. " +
      "Review the expected behavior, identify the failing condition, " +
      "and make one small change before checking again."
    );
  }

  return (
    `For ${activeFile}, I recommend starting with the task requirements. ` +
    (failed.length
      ? `One area to investigate is: ${failed[0].name}.`
      : "Your current code matches the available source checks.")
  );
}
