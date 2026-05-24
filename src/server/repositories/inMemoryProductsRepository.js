export function createInMemoryProductsRepository(initialProducts = []) {
  const products = [...initialProducts];
  let nextId = products.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;

  return {
    list() {
      return [...products];
    },

    findById(id) {
      return products.find((item) => item.id === id) ?? null;
    },

    create(payload) {
      const created = {
        id: nextId++,
        name: payload.name,
        price: payload.price,
        sport: payload.sport,
        brand: payload.brand,
        isActive: payload.isActive ?? true
      };
      products.push(created);
      return created;
    },

    update(id, payload) {
      const index = products.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      const updated = {
        ...products[index],
        ...payload
      };
      products[index] = updated;
      return updated;
    },

    remove(id) {
      const index = products.findIndex((item) => item.id === id);
      if (index === -1) {
        return false;
      }
      products.splice(index, 1);
      return true;
    }
  };
}
