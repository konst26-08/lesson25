const initialState = {
  user: {
    isAuthenticated: false,
    token: null,
    id: null,
    email: null,
    role: null
  },
  cart: [],
  checkout: {
    contacts: {
      name: "",
      phone: "",
      email: ""
    },
    address: {
      city: "",
      street: "",
      house: "",
      apartment: "",
      zip: ""
    },
    paymentMethod: "card"
  },
  orders: [],
  lastOrder: null
};

export function createStore() {
  let state = structuredClone(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(updater) {
    state = updater(state);
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState,
    setState,
    subscribe
  };
}
