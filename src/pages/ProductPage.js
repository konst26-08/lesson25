import { createPageShell } from "../components/ui/PageShell";
import { renderButton } from "../components/ui/Button";
import { formatCurrency } from "../utils/formatters";
import { appendWithFragment } from "../utils/dom";
import { fetchProductById } from "../api/hooks/products.js";
import { ApiError } from "../api/http.js";
import { trackAddToCart } from "../analytics/metrika.js";

const availableSizes = ["39", "40", "41", "42", "43", "44"];

export function renderProductPage({ params, store }) {
  const productId = Number.parseInt(params.slug, 10);

  if (Number.isNaN(productId)) {
    return createPageShell({
      title: "Товар не найден",
      description: "Проверьте ссылку или вернитесь в каталог."
    });
  }

  const page = createPageShell({
    title: "Товар",
    description: "Карточка товара с технологиями, ценой и выбором размера."
  });

  const root = document.createElement("div");
  root.className = "async-page-root";

  const status = document.createElement("p");
  status.className = "async-page-status";
  status.textContent = "Загрузка карточки…";
  root.append(status);
  page.append(root);

  fetchProductById(productId)
    .then((product) => {
      const heading = page.querySelector(".page-title");
      const desc = page.querySelector(".page-description");
      if (heading) {
        heading.textContent = product.name;
      }
      if (desc) {
        desc.textContent = `Бренд: ${product.brand} · Тип: ${product.sport}`;
      }

      root.replaceChildren();

      if (!product.isActive) {
        const note = document.createElement("p");
        note.className = "async-page-status";
        note.textContent = "Товар временно недоступен.";
        root.append(note);
        return;
      }

      renderProductContent(root, product, store);
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        const heading = page.querySelector(".page-title");
        const desc = page.querySelector(".page-description");
        if (heading) {
          heading.textContent = "Товар не найден";
        }
        if (desc) {
          desc.textContent = "Проверьте ссылку или вернитесь в каталог.";
        }
        root.replaceChildren();
        return;
      }

      const message =
        error instanceof ApiError
          ? `${error.message} (${error.status})`
          : "Не удалось загрузить товар.";
      status.textContent = message;
      status.classList.add("async-page-status-error");
    });

  return page;
}

function renderProductContent(container, product, store) {
  const layout = document.createElement("section");
  layout.className = "product-layout";

  const gallery = document.createElement("div");
  gallery.className = "product-gallery";
  gallery.textContent = "Галерея фото";

  const details = document.createElement("div");
  details.className = "product-details";

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatCurrency(product.price);

  const sizesLabel = document.createElement("p");
  sizesLabel.className = "sizes-label";
  sizesLabel.textContent = "Выберите размер";

  const sizes = document.createElement("div");
  sizes.className = "sizes-row";

  const validation = document.createElement("p");
  validation.className = "validation-message";

  let selectedSize = "";
  let activeSizeChip = null;

  const sizeChips = availableSizes.map((sizeValue) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = sizeValue;
    chip.addEventListener("click", () => {
      selectedSize = sizeValue;
      validation.textContent = "";
      if (activeSizeChip) {
        activeSizeChip.classList.remove("chip-active");
      }
      chip.classList.add("chip-active");
      activeSizeChip = chip;
      addToCartButton.disabled = false;
    });
    return chip;
  });
  appendWithFragment(sizes, sizeChips);

  const addToCartButton = renderButton({
    text: "Добавить в корзину",
    disabled: true,
    onClick: () => {
      if (!selectedSize) {
        validation.textContent = "Выберите размер";
        return;
      }

      store.setState((current) => ({
        ...current,
        cart: [
          ...current.cart,
          {
            id: Number.parseInt(product.id, 10),
            name: product.name,
            price: Number(product.price),
            sport: product.sport,
            brand: product.brand,
            size: selectedSize,
            quantity: 1
          }
        ]
      }));

      trackAddToCart({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        sport: product.sport,
        brand: product.brand,
        size: selectedSize,
        quantity: 1
      });

      validation.textContent = "Товар добавлен в корзину";
    }
  });

  details.append(price, sizesLabel, sizes, addToCartButton, validation);
  layout.append(gallery, details);
  container.append(layout);
}
