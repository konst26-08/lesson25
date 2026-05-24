export function renderStepper({ currentStep, totalSteps }) {
  const wrapper = document.createElement("div");
  wrapper.className = "stepper";

  const text = document.createElement("span");
  text.className = "stepper-label";
  text.textContent = `${currentStep}/${totalSteps}`;

  const progress = document.createElement("div");
  progress.className = "stepper-progress";

  const progressBar = document.createElement("div");
  progressBar.className = "stepper-progress-value";
  progressBar.style.width = `${Math.max(0, Math.min(100, (currentStep / totalSteps) * 100))}%`;

  progress.append(progressBar);
  wrapper.append(text, progress);
  return wrapper;
}
