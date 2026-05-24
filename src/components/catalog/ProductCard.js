import { formatCurrency } from "../../utils/formatters";
import { renderButton } from "../ui/Button";
import { navigateTo } from "../../utils/navigation";

export function renderProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const image = document.createElement("div");
  image.className = "product-card-image";
  image.textContent = "Фото";

  const title = document.createElement("h3");
  title.className = "product-card-title";
  title.textContent = product.name;

  const type = document.createElement("p");
  type.className = "product-card-type";
  type.textContent = `Тип: ${product.sport}`;

  const price = document.createElement("p");
  price.className = "product-card-price";
  price.textContent = formatCurrency(product.price);

  const openButton = renderButton({
    text: "Открыть карточку",
    variant: "secondary",
    onClick: () => navigateTo(`/product/${product.id}`)
  });

  card.append(image, title, type, price, openButton);
  return card;
}
