const ALLOWED_FILTERS = new Set(["q", "sport", "brand", "material", "tech", "page", "sort"]);

export function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const safeParams = {};

  for (const [key, value] of params.entries()) {
    if (ALLOWED_FILTERS.has(key) && value.trim()) {
      safeParams[key] = value.trim();
    }
  }

  return safeParams;
}
