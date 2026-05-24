const DEFAULT_COUNTER_ID = 109394182;

function parseCounterId(rawValue) {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COUNTER_ID;
}

export function getMetrikaCounterId() {
  return parseCounterId(import.meta.env.VITE_YM_COUNTER_ID);
}

export function initMetrika() {
  const counterId = getMetrikaCounterId();
  window.dataLayer = window.dataLayer || [];

  (function (m, e, t, r, i, k, a) {
    m[i] =
      m[i] ||
      function () {
        (m[i].a = m[i].a || []).push(arguments);
      };
    m[i].l = 1 * new Date();
    for (let j = 0; j < document.scripts.length; j += 1) {
      if (document.scripts[j].src === r) {
        return;
      }
    }
    k = e.createElement(t);
    a = e.getElementsByTagName(t)[0];
    k.async = 1;
    k.src = r;
    a.parentNode.insertBefore(k, a);
  })(window, document, "script", `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`, "ym");

  window.ym(counterId, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true
  });
}

export function trackPageView(url = `${window.location.pathname}${window.location.search}`) {
  const counterId = getMetrikaCounterId();
  if (typeof window.ym !== "function") {
    return;
  }

  window.ym(counterId, "hit", url, {
    referer: document.referrer
  });
}

export function trackGoal(goalName, params) {
  const counterId = getMetrikaCounterId();
  if (typeof window.ym !== "function") {
    return;
  }

  window.ym(counterId, "reachGoal", goalName, params);
}

export const METRIKA_GOALS = {
  LOGIN_SUCCESS: "login_success",
  REGISTER_SUCCESS: "register_success",
  OAUTH_YANDEX_SUCCESS: "oauth_yandex_success",
  ADD_TO_CART: "add_to_cart",
  BEGIN_CHECKOUT: "begin_checkout",
  PURCHASE: "purchase"
};

function getDataLayer() {
  if (typeof window === "undefined") {
    return null;
  }

  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function toEcommerceProduct(item) {
  return {
    id: String(item.id),
    name: item.name,
    price: Number(item.price),
    quantity: Number(item.quantity) || 1,
    brand: item.brand,
    category: item.sport,
    variant: item.size
  };
}

function pushEcommerce(payload) {
  const dataLayer = getDataLayer();
  if (!dataLayer) {
    return;
  }

  dataLayer.push({
    ecommerce: {
      currencyCode: "RUB",
      ...payload
    }
  });
}

export function trackAddToCart(item) {
  pushEcommerce({
    add: {
      products: [toEcommerceProduct(item)]
    }
  });
  trackGoal(METRIKA_GOALS.ADD_TO_CART, {
    product_id: String(item.id),
    product_name: item.name
  });
}

export function trackBeginCheckout(cartItems) {
  pushEcommerce({
    checkout: {
      actionField: { step: 1 },
      products: cartItems.map(toEcommerceProduct)
    }
  });
  trackGoal(METRIKA_GOALS.BEGIN_CHECKOUT, {
    items_count: cartItems.length
  });
}

export function trackPurchase(order, cartItems) {
  const revenue = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * (Number(item.quantity) || 1),
    0
  );

  pushEcommerce({
    purchase: {
      actionField: {
        id: String(order.orderNumber),
        revenue
      },
      products: cartItems.map(toEcommerceProduct)
    }
  });
  trackGoal(METRIKA_GOALS.PURCHASE, {
    order_number: String(order.orderNumber),
    revenue
  });
}
