import { apiFetch } from "../http.js";

/**
 * Загрузка списка товаров с сервера.
 */
export async function fetchProducts() {
  const json = await apiFetch("/api/products");
  return json.data;
}

/**
 * Загрузка одного товара по числовому id.
 */
export async function fetchProductById(id) {
  const json = await apiFetch(`/api/products/${encodeURIComponent(id)}`);
  return json.data;
}
