import { analyzeScreenshotWithMultimodalModel } from "./screenshotAnalyzer";
import { interpretConsoleErrors } from "./consoleInterpreter";
import { generateFixSuggestions } from "./bugFixGenerator";

export async function runBugAssistant({
  screenshotFile,
  consoleOutput,
  note,
  multimodalModel,
  textModel
}) {
  const screenshotAnalysis = await analyzeScreenshotWithMultimodalModel({
    screenshotFile,
    note,
    multimodalModel
  });
  const interpretation = interpretConsoleErrors(consoleOutput);
  const fixes = await generateFixSuggestions({ interpretation, textModel });

  return {
    screenshotAnalysis,
    interpretation,
    fixes
  };
}
