import { createPageShell } from "../components/ui/PageShell";
import { formatCurrency } from "../utils/formatters";
import { renderButton } from "../components/ui/Button";
import { renderEmptyState } from "../components/ui/EmptyState";
import { navigateTo } from "../utils/navigation";
import { trackBeginCheckout } from "../analytics/metrika.js";

function renderCartItem(item, onRemove) {
  const row = document.createElement("article");
  row.className = "cart-item";

  const title = document.createElement("h3");
  title.className = "cart-item-title";
  title.textContent = `${item.name} / ${item.size}`;

  const details = document.createElement("p");
  details.className = "cart-item-details";
  details.textContent = `${item.quantity} x ${formatCurrency(item.price)}`;

  const remove = renderButton({
    text: "Удалить",
    variant: "secondary",
    onClick: onRemove
  });

  row.append(title, details, remove);
  return row;
}

export function renderCartPage({ store }) {
  const page = createPageShell({
    title: "Корзина",
    description: "Проверьте состав заказа перед оформлением."
  });

  const { cart } = store.getState();

  if (!cart.length) {
    page.append(
      renderEmptyState({
        title: "Корзина пуста",
        actionText: "Перейти в каталог",
        onAction: () => navigateTo("/catalog")
      })
    );
    return page;
  }

  const list = document.createElement("section");
  list.className = "cart-list";

  cart.forEach((item, index) => {
    list.append(
      renderCartItem(item, () => {
        store.setState((current) => ({
          ...current,
          cart: current.cart.filter((_, itemIndex) => itemIndex !== index)
        }));
        window.dispatchEvent(new Event("popstate"));
      })
    );
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const summary = document.createElement("p");
  summary.className = "cart-total";
  summary.textContent = `Итого: ${formatCurrency(total)} + доставка`;

  const summaryBox = document.createElement("section");
  summaryBox.className = "cart-summary";

  const checkout = renderButton({
    text: "Перейти к оформлению",
    onClick: () => {
      trackBeginCheckout(cart);
      navigateTo("/checkout");
    }
  });

  summaryBox.append(summary, checkout);
  page.append(list, summaryBox);
  return page;
}
