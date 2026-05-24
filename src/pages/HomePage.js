import { createPageShell } from "../components/ui/PageShell";
import { renderButton } from "../components/ui/Button";
import { renderSportTile } from "../components/home/SportTile";
import { navigateTo } from "../utils/navigation";
import { appendWithFragment } from "../utils/dom";
import { fetchSports } from "../api/hooks/sports.js";
import { ApiError } from "../api/http.js";

export function renderHomePage() {
  const page = createPageShell({
    title: "StepUp",
    description: "Спортивная обувь для бега, зала, фитнеса и повседневной носки."
  });

  const cta = renderButton({
    text: "Перейти в каталог",
    onClick: () => navigateTo("/catalog")
  });
  cta.classList.add("home-cta");

  const root = document.createElement("div");
  root.className = "async-page-root";

  const status = document.createElement("p");
  status.className = "async-page-status";
  status.textContent = "Загрузка видов спорта…";
  root.append(status);
  page.append(cta, root);

  fetchSports()
    .then((sports) => {
      root.replaceChildren();
      const list = document.createElement("div");
      list.className = "sports-grid";
      appendWithFragment(
        list,
        sports.map((sport) => renderSportTile(sport))
      );
      root.append(list);
    })
    .catch((error) => {
      const message =
        error instanceof ApiError
          ? `${error.message} (${error.status})`
          : "Не удалось загрузить данные с сервера.";
      status.textContent = message;
      status.classList.add("async-page-status-error");
    });

  return page;
}
