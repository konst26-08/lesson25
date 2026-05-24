const STATUS_TO_DB = {
  Новый: "new",
  Оплачен: "paid",
  "В обработке": "processing",
  "Передан в доставку": "shipped",
  Доставлен: "delivered",
  Отменён: "cancelled",
  "Ошибка оплаты": "payment_failed"
};

const STATUS_FROM_DB = Object.fromEntries(
  Object.entries(STATUS_TO_DB).map(([label, code]) => [code, label])
);

export function statusToDb(label) {
  return STATUS_TO_DB[label] ?? "paid";
}

export function statusFromDb(code) {
  return STATUS_FROM_DB[code] ?? code;
}
