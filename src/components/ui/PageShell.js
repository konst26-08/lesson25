export function createPageShell({ title, description }) {
  const section = document.createElement("section");
  section.className = "page";

  const heading = document.createElement("h1");
  heading.className = "page-title";
  heading.textContent = title;

  section.append(heading);

  if (description) {
    const text = document.createElement("p");
    text.className = "page-description";
    text.textContent = description;
    section.append(text);
  }

  return section;
}
