export function renderInputField({
  id,
  label,
  placeholder,
  type = "text",
  value = "",
  required = false
}) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  wrapper.htmlFor = id;

  const title = document.createElement("span");
  title.className = "field-label";
  title.textContent = label;

  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.className = "field-input";
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  input.required = required;

  wrapper.append(title, input);
  return { wrapper, input };
}
