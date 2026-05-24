import { createPageShell } from "../components/ui/PageShell";
import { renderButton } from "../components/ui/Button";
import { navigateTo } from "../utils/navigation";

export function renderNotFoundPage() {
  const page = createPageShell({
    title: "404",
    description: "Страница не найдена."
  });

  page.append(
    renderButton({
      text: "На главную",
      onClick: () => navigateTo("/")
    })
  );

  return page;
}
