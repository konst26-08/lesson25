import { apiFetch } from "../http.js";

/**
 * Справочник видов спорта для главной и фильтров каталога.
 */
export async function fetchSports() {
  const json = await apiFetch("/api/sports");
  return json.data;
}
