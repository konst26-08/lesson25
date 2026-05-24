import { renderButton } from "./Button";

export function renderEmptyState({ title, actionText, onAction }) {
  const container = document.createElement("section");
  container.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "empty-state-icon";
  icon.textContent = "◎";

  const message = document.createElement("p");
  message.className = "empty-state-title";
  message.textContent = title;

  container.append(icon, message);

  if (actionText && onAction) {
    container.append(renderButton({ text: actionText, onClick: onAction }));
  }

  return container;
}
