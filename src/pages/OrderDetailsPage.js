import { createPageShell } from "../components/ui/PageShell";
import { renderEmptyState } from "../components/ui/EmptyState";
import { navigateTo } from "../utils/navigation";
import { formatCurrency } from "../utils/formatters";
import { fetchOrderByNumber } from "../api/hooks/orders.js";
import { ApiError } from "../api/http.js";

export function renderOrderDetailsPage({ params, store }) {
  const page = createPageShell({
    title: `Заказ ${params.id}`,
    description: "Статус, трек-номер и состав заказа."
  });

  const root = document.createElement("div");
  root.className = "async-page-root";

  const { user } = store.getState();
  if (!user.isAuthenticated || !user.token) {
    root.append(
      renderEmptyState({
        title: "Войдите в аккаунт, чтобы открыть детали заказа.",
        actionText: "Войти",
        onAction: () => navigateTo("/login")
      })
    );
    page.append(root);
    return page;
  }

  const status = document.createElement("p");
  status.className = "async-page-status";
  status.textContent = "Загрузка заказа…";
  root.append(status);
  page.append(root);

  fetchOrderByNumber(params.id, user.token)
    .then((order) => {
      root.replaceChildren();

      const statusLine = document.createElement("p");
      statusLine.className = "order-status";
      statusLine.textContent = `Статус: ${order.status}`;

      if (order.trackingNumber) {
        const tracking = document.createElement("a");
        tracking.className = "order-tracking";
        tracking.href = "https://www.pochta.ru/tracking";
        tracking.target = "_blank";
        tracking.rel = "noreferrer";
        tracking.textContent = `Трек-номер: ${order.trackingNumber}`;
        root.append(statusLine, tracking);
      } else {
        root.append(statusLine);
      }

      const meta = document.createElement("p");
      meta.className = "order-meta";
      meta.textContent = `${order.createdAt} • ${formatCurrency(order.total)}`;
      root.append(meta);

      const itemsTitle = document.createElement("h3");
      itemsTitle.textContent = "Состав заказа";
      root.append(itemsTitle);

      const itemsList = document.createElement("ul");
      itemsList.className = "order-content";
      order.items.forEach((item) => {
        const line = document.createElement("li");
        line.textContent = `${item.productName} x${item.quantity} — ${formatCurrency(item.unitPrice)}`;
        itemsList.append(line);
      });
      root.append(itemsList);
    })
    .catch((error) => {
      const message =
        error instanceof ApiError
          ? `${error.message} (${error.status})`
          : "Не удалось загрузить заказ. Проверьте, что API запущен.";
      status.textContent = message;
      status.classList.add("async-page-status-error");
    });

  return page;
}
