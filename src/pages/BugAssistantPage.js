import { createPageShell } from "../components/ui/PageShell";
import { renderButton } from "../components/ui/Button";
import { runBugAssistant } from "../ai/bugAssistant";

function renderResultList(items) {
  const list = document.createElement("ol");
  list.className = "ai-result-list";

  items.forEach((item) => {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.append(entry);
  });

  return list;
}

export function renderBugAssistantPage() {
  const page = createPageShell({
    title: "AI Debug Assistant",
    description:
      "Мультимодальный анализ скриншотов, интерпретация ошибок из консоли и генерация вариантов исправления."
  });

  const form = document.createElement("form");
  form.className = "checkout-form";
  form.noValidate = true;

  const screenshotLabel = document.createElement("label");
  screenshotLabel.className = "field";
  screenshotLabel.textContent = "Скриншот бага";

  const screenshotInput = document.createElement("input");
  screenshotInput.type = "file";
  screenshotInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  screenshotInput.className = "field-input";
  screenshotLabel.append(screenshotInput);

  const noteLabel = document.createElement("label");
  noteLabel.className = "field";
  noteLabel.textContent = "Контекст (шаги воспроизведения)";

  const noteInput = document.createElement("textarea");
  noteInput.className = "field-input";
  noteInput.placeholder = "Опишите, где и как появляется ошибка";
  noteLabel.append(noteInput);

  const consoleLabel = document.createElement("label");
  consoleLabel.className = "field";
  consoleLabel.textContent = "Логи консоли";

  const consoleInput = document.createElement("textarea");
  consoleInput.className = "field-input";
  consoleInput.placeholder = "TypeError: ...";
  consoleLabel.append(consoleInput);

  const validation = document.createElement("p");
  validation.className = "validation-message";

  const resultSection = document.createElement("section");
  resultSection.className = "ai-result";

  const submit = renderButton({
    text: "Проанализировать",
    onClick: async () => {
      const screenshotFile = screenshotInput.files?.[0];
      const consoleOutput = consoleInput.value;
      const note = noteInput.value;

      if (!consoleOutput.trim() && !screenshotFile) {
        validation.textContent = "Добавьте хотя бы скриншот или консольные ошибки.";
        return;
      }

      validation.textContent = "";
      submit.disabled = true;
      try {
        const result = await runBugAssistant({
          screenshotFile,
          consoleOutput,
          note
        });

        resultSection.replaceChildren();

        const screenshotText = document.createElement("p");
        screenshotText.textContent = `Скриншот: ${result.screenshotAnalysis}`;

        const consoleSummary = document.createElement("p");
        consoleSummary.textContent = `Консоль: ${result.interpretation.summary}`;

        const fixesTitle = document.createElement("h3");
        fixesTitle.textContent = "AI-варианты исправлений";

        resultSection.append(
          screenshotText,
          consoleSummary,
          fixesTitle,
          renderResultList(result.fixes)
        );
      } catch {
        validation.textContent = "Не удалось выполнить AI-анализ. Повторите попытку.";
      } finally {
        submit.disabled = false;
      }
    }
  });

  form.append(screenshotLabel, noteLabel, consoleLabel, validation, submit);
  page.append(form, resultSection);
  return page;
}
