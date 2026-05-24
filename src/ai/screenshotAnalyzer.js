function createImageContext(file) {
  if (!file) {
    return null;
  }

  return {
    name: file.name,
    type: file.type,
    size: file.size
  };
}

export async function analyzeScreenshotWithMultimodalModel({
  screenshotFile,
  note,
  multimodalModel
}) {
  const imageContext = createImageContext(screenshotFile);

  if (!imageContext) {
    return "Скриншот не приложен. Анализ ограничен консольными логами.";
  }

  const payload = {
    task: "analyze-bug-screenshot",
    image: imageContext,
    note
  };

  if (typeof multimodalModel === "function") {
    try {
      const modelAnswer = await multimodalModel(payload);
      if (typeof modelAnswer === "string" && modelAnswer.trim()) {
        return modelAnswer.trim();
      }
    } catch {
      return `Скриншот "${imageContext.name}" получен. Модель недоступна, используйте локальный fallback-анализ.`;
    }
  }

  return `Скриншот "${imageContext.name}" (${imageContext.type}, ${imageContext.size} bytes) принят для анализа.`;
}
