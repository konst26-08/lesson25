import { createPageShell } from "../components/ui/PageShell";
import { renderButton } from "../components/ui/Button";
import { renderEmptyState } from "../components/ui/EmptyState";
import { navigateTo } from "../utils/navigation";
import { appendWithFragment } from "../utils/dom";
import { formatCurrency } from "../utils/formatters";
import { fetchOrders } from "../api/hooks/orders.js";
import { ApiError } from "../api/http.js";

function buildOrderCard(order) {
  const card = document.createElement("article");
  card.className = "order-card";

  const title = document.createElement("h3");
  title.textContent = order.orderNumber;

  const info = document.createElement("p");
  info.textContent = `${order.createdAt} • ${order.status} • ${formatCurrency(order.total)}`;

  const details = renderButton({
    text: "Детали",
    variant: "secondary",
    onClick: () => navigateTo(`/account/orders/${order.orderNumber}`)
  });

  card.append(title, info, details);
  return card;
}

export function renderOrdersPage({ store }) {
  const page = createPageShell({
    title: "Мои заказы",
    description: "Список заказов с датой, статусом и суммой."
  });

  const root = document.createElement("section");
  root.className = "orders-list async-page-root";

  const { user } = store.getState();
  if (!user.isAuthenticated || !user.token) {
    root.append(
      renderEmptyState({
        title: "Войдите в аккаунт, чтобы увидеть историю заказов.",
        actionText: "Войти",
        onAction: () => navigateTo("/login")
      })
    );
    page.append(root);
    return page;
  }

  const status = document.createElement("p");
  status.className = "async-page-status";
  status.textContent = "Загрузка заказов…";
  root.append(status);
  page.append(root);

  fetchOrders(user.token)
    .then((orders) => {
      root.replaceChildren();

      if (orders.length === 0) {
        root.append(
          renderEmptyState({
            title: "У вас пока нет заказов.",
            actionText: "В каталог",
            onAction: () => navigateTo("/catalog")
          })
        );
        return;
      }

      appendWithFragment(
        root,
        orders.map((order) => buildOrderCard(order))
      );
    })
    .catch((error) => {
      const message =
        error instanceof ApiError
          ? `${error.message} (${error.status})`
          : "Не удалось загрузить заказы. Проверьте, что API запущен.";
      status.textContent = message;
      status.classList.add("async-page-status-error");
    });

  return page;
}
