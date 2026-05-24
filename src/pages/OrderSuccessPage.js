import { createPageShell } from "../components/ui/PageShell";
import { renderButton } from "../components/ui/Button";
import { navigateTo } from "../utils/navigation";
import { formatCurrency } from "../utils/formatters";

export function renderOrderSuccessPage({ store }) {
  const lastOrder = store.getState().lastOrder;

  if (!lastOrder?.orderNumber) {
    navigateTo("/");
    return createPageShell({
      title: "Перенаправление",
      description: "Страница доступна после оформления заказа."
    });
  }

  const page = createPageShell({
    title: "Заказ подтвержден",
    description: "Мы отправили письмо с деталями заказа на ваш email."
  });

  const orderId = document.createElement("p");
  orderId.className = "order-id";
  orderId.textContent = `Номер заказа: ${lastOrder.orderNumber}`;

  const summary = document.createElement("p");
  summary.className = "order-success-summary";
  summary.textContent = `Сумма: ${formatCurrency(lastOrder.total)} · ${lastOrder.createdAt}`;

  const buttons = document.createElement("div");
  buttons.className = "actions-row";
  buttons.append(
    renderButton({
      text: "К заказам",
      variant: "secondary",
      onClick: () => navigateTo("/account/orders")
    }),
    renderButton({
      text: "На главную",
      onClick: () => navigateTo("/")
    })
  );

  page.append(orderId, summary, buttons);
  return page;
}
