import { apiFetch } from "../http.js";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

/**
 * Список заказов текущего пользователя.
 */
export async function fetchOrders(token) {
  const json = await apiFetch("/api/orders", {
    headers: authHeaders(token)
  });
  return json.data;
}

/**
 * Детали заказа по номеру (orderNumber).
 */
export async function fetchOrderByNumber(orderNumber, token) {
  const json = await apiFetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
    headers: authHeaders(token)
  });
  return json.data;
}

/**
 * Создание заказа из корзины и данных checkout.
 */
export async function createOrder(token, payload) {
  const json = await apiFetch("/api/orders", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  return json.data;
}
