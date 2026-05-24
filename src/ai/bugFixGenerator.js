function buildFallbackFixes(issues) {
  if (!issues.length) {
    return ["Проверьте шаги воспроизведения и добавьте консольные логи."];
  }

  return issues.slice(0, 5).map((issue) => {
    if (issue.message.toLowerCase().includes("undefined")) {
      return "Добавить защитные проверки (null/undefined) перед обращением к полям объекта.";
    }

    if (issue.message.toLowerCase().includes("404")) {
      return "Проверить роуты и URL API/страниц, добавить fallback-обработчик для отсутствующего ресурса.";
    }

    if (issue.message.toLowerCase().includes("network")) {
      return "Добавить retry/fallback для сетевых ошибок и отображение понятного сообщения пользователю.";
    }

    return `Проверить источник ошибки: "${issue.message}" и добавить целевую обработку исключения.`;
  });
}

export async function generateFixSuggestions({ interpretation, textModel }) {
  const payload = {
    task: "suggest-fixes",
    issues: interpretation.issues
  };

  if (typeof textModel === "function") {
    try {
      const result = await textModel(payload);
      if (Array.isArray(result) && result.length) {
        return result;
      }
    } catch {
      return buildFallbackFixes(interpretation.issues);
    }
  }

  return buildFallbackFixes(interpretation.issues);
}
