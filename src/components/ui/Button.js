export function renderButton({
  text,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false
}) {
  const button = document.createElement("button");
  button.type = type;
  button.className = `btn btn-${variant}`;
  button.textContent = text;
  button.disabled = disabled;

  if (onClick) {
    button.addEventListener("click", onClick);
  }

  return button;
}
