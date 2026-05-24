import { createPageShell } from "../components/ui/PageShell";
import { renderFilterChip } from "../components/ui/FilterChip";
import { renderProductCard } from "../components/catalog/ProductCard";
import { renderEmptyState } from "../components/ui/EmptyState";
import { getQueryParams } from "../utils/queryParams";
import { navigateTo } from "../utils/navigation";
import { appendWithFragment } from "../utils/dom";
import { fetchProducts } from "../api/hooks/products.js";
import { fetchSports } from "../api/hooks/sports.js";
import { ApiError } from "../api/http.js";

function filterProducts(items, params) {
  const normalizedQuery = params.q ? params.q.toLowerCase() : "";

  return items.filter((item) => {
    if (params.sport && item.sport !== params.sport) {
      return false;
    }

    if (normalizedQuery && !item.name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }

    return true;
  });
}

function buildFilterChips(activeSport, sports) {
  const chips = [
    renderFilterChip({
      text: "Все",
      isActive: !activeSport,
      onClick: () => navigateTo("/catalog")
    })
  ];

  sports.forEach((sport) => {
    chips.push(
      renderFilterChip({
        text: sport.label,
        isActive: activeSport === sport.id,
        onClick: () => navigateTo(`/catalog?sport=${encodeURIComponent(sport.id)}`)
      })
    );
  });

  return chips;
}

export function renderCatalogPage() {
  const page = createPageShell({
    title: "Каталог",
    description: "Фильтруйте обувь по спорту, бренду, материалам и технологиям."
  });
  const params = getQueryParams();

  const root = document.createElement("div");
  root.className = "async-page-root";

  const status = document.createElement("p");
  status.className = "async-page-status";
  status.textContent = "Загрузка каталога…";
  root.append(status);
  page.append(root);

  Promise.all([fetchSports(), fetchProducts()])
    .then(([sports, products]) => {
      root.replaceChildren();

      const chips = document.createElement("div");
      chips.className = "chips-row";
      appendWithFragment(chips, buildFilterChips(params.sport, sports));

      const cardsGrid = document.createElement("section");
      cardsGrid.className = "products-grid";

      const visibleProducts = filterProducts(products, params);

      if (visibleProducts.length === 0) {
        cardsGrid.append(
          renderEmptyState({
            title: "По выбранным фильтрам ничего не найдено",
            actionText: "Сбросить фильтры",
            onAction: () => navigateTo("/catalog")
          })
        );
      } else {
        appendWithFragment(
          cardsGrid,
          visibleProducts.map((product) => renderProductCard(product))
        );
      }

      root.append(chips, cardsGrid);
    })
    .catch((error) => {
      const message =
        error instanceof ApiError
          ? `${error.message} (${error.status})`
          : "Не удалось загрузить каталог. Проверьте, что API запущен.";
      status.textContent = message;
      status.classList.add("async-page-status-error");
    });

  return page;
}
