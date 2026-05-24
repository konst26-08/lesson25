const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

export function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Цена по запросу";
  }

  return moneyFormatter.format(value);
}
