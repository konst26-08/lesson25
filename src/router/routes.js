import { renderHomePage } from "../pages/HomePage";
import { renderCatalogPage } from "../pages/CatalogPage";
import { renderProductPage } from "../pages/ProductPage";
import { renderCartPage } from "../pages/CartPage";
import { renderCheckoutPage } from "../pages/CheckoutPage";
import { renderOrderSuccessPage } from "../pages/OrderSuccessPage";
import { renderOrdersPage } from "../pages/OrdersPage";
import { renderOrderDetailsPage } from "../pages/OrderDetailsPage";
import { renderNotFoundPage } from "../pages/NotFoundPage";
import { renderBugAssistantPage } from "../pages/BugAssistantPage";
import { renderLoginPage } from "../pages/LoginPage";
import { renderOAuthCallbackPage } from "../pages/OAuthCallbackPage.js";

export const routes = [
  {
    match: (pathname) => pathname === "/",
    build: () => ({ page: renderHomePage, params: {} })
  },
  {
    match: (pathname) => pathname === "/catalog",
    build: () => ({ page: renderCatalogPage, params: {} })
  },
  {
    match: (pathname) => pathname === "/login",
    build: () => ({ page: renderLoginPage, params: {} })
  },
  {
    match: (pathname) => pathname === "/login/oauth/callback",
    build: () => ({ page: renderOAuthCallbackPage, params: {} })
  },
  {
    match: (pathname) => pathname.startsWith("/product/"),
    build: (pathname) => ({ page: renderProductPage, params: { slug: pathname.split("/")[2] } })
  },
  {
    match: (pathname) => pathname === "/cart",
    build: () => ({ page: renderCartPage, params: {} })
  },
  {
    match: (pathname) => pathname === "/checkout",
    build: () => ({ page: renderCheckoutPage, params: {} })
  },
  {
    match: (pathname) => pathname === "/order-success",
    build: () => ({ page: renderOrderSuccessPage, params: {} })
  },
  {
    match: (pathname) => pathname === "/ai-debug",
    build: () => ({ page: renderBugAssistantPage, params: {} })
  },
  {
    match: (pathname) => pathname === "/account/orders",
    build: () => ({ page: renderOrdersPage, params: {} })
  },
  {
    match: (pathname) => pathname.startsWith("/account/orders/"),
    build: (pathname) => ({ page: renderOrderDetailsPage, params: { id: pathname.split("/")[3] } })
  }
];

export const fallbackRoute = { page: renderNotFoundPage, params: {} };
