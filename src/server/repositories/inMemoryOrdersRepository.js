export function createInMemoryOrdersRepository(initialOrders = []) {
  const orders = [...initialOrders];
  let nextId = orders.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;

  return {
    listByUserId(userId) {
      return orders
        .filter((order) => String(order.userId) === String(userId))
        .map(toListItem)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    findByOrderNumber(orderNumber, userId) {
      const order = orders.find(
        (item) => item.orderNumber === orderNumber && String(item.userId) === String(userId)
      );
      return order ? toDetail(order) : null;
    },

    create(payload) {
      const lineTotal = (payload.items ?? []).reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const created = {
        id: nextId++,
        orderNumber: payload.orderNumber,
        userId: payload.userId,
        createdAt: payload.createdAt ?? new Date().toISOString().slice(0, 10),
        status: payload.status ?? "Оплачен",
        total: payload.total ?? lineTotal,
        trackingNumber: payload.trackingNumber ?? null,
        items: payload.items ?? [],
        contacts: payload.contacts ?? null,
        address: payload.address ?? null
      };
      orders.push(created);
      return toDetail(created);
    }
  };
}

function toListItem(order) {
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    total: order.total
  };
}

function toDetail(order) {
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    total: order.total,
    trackingNumber: order.trackingNumber,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }))
  };
}
