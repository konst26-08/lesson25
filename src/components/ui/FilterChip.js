export function renderFilterChip({ text, isActive = false, onClick }) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = `chip ${isActive ? "chip-active" : ""}`.trim();
  chip.textContent = text;

  if (onClick) {
    chip.addEventListener("click", onClick);
  }

  return chip;
}
