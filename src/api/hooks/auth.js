import { apiFetch } from "../http.js";

/**
 * Регистрация пользователя (отправка данных на сервер).
 */
export async function registerUser({ email, password }) {
  const json = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return json.data;
}

/**
 * Вход пользователя.
 */
export async function loginUser({ email, password }) {
  const json = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return json.data;
}

/**
 * Текущий пользователь по Bearer-токену.
 */
export async function fetchMe(token) {
  const json = await apiFetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return json.data;
}
