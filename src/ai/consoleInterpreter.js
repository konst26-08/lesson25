const severityByToken = {
  error: "high",
  failed: "high",
  exception: "high",
  warning: "medium",
  warn: "medium"
};

function normalizeLine(line) {
  return line.trim().replace(/\s+/g, " ");
}

function detectSeverity(line) {
  const lowerLine = line.toLowerCase();

  for (const [token, severity] of Object.entries(severityByToken)) {
    if (lowerLine.includes(token)) {
      return severity;
    }
  }

  return "low";
}

export function interpretConsoleErrors(consoleOutput) {
  if (typeof consoleOutput !== "string" || !consoleOutput.trim()) {
    return {
      summary: "Консольные ошибки не переданы.",
      issues: []
    };
  }

  const issues = consoleOutput
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean)
    .map((line) => ({
      message: line,
      severity: detectSeverity(line)
    }));

  const highCount = issues.filter((issue) => issue.severity === "high").length;
  const summary =
    highCount > 0
      ? `Найдено ${issues.length} сообщений, критичных: ${highCount}.`
      : `Найдено ${issues.length} сообщений, критичных не обнаружено.`;

  return { summary, issues };
}
