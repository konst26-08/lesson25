import { navigateTo } from "../../utils/navigation";
import { appendWithFragment } from "../../utils/dom";

const links = [
  { href: "/", text: "Главная" },
  { href: "/catalog", text: "Каталог" },
  { href: "/cart", text: "Корзина" },
  { href: "/checkout", text: "Checkout" },
  { href: "/login", text: "Вход" },
  { href: "/ai-debug", text: "AI Debug" }
];

export function renderAppHeader() {
  const header = document.createElement("header");
  header.className = "app-header";

  const brand = document.createElement("button");
  brand.type = "button";
  brand.className = "brand";
  brand.textContent = "StepUp";
  brand.addEventListener("click", () => navigateTo("/"));

  const nav = document.createElement("nav");
  nav.className = "main-nav";
  nav.setAttribute("aria-label", "Основная навигация");

  const navItems = links.map((link) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "main-nav-link";
    button.textContent = link.text;
    button.addEventListener("click", () => navigateTo(link.href));
    return button;
  });
  appendWithFragment(nav, navItems);

  header.append(brand, nav);
  return header;
}
