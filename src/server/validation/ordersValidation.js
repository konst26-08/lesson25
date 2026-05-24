import { MAX_MEDIUM_TEXT, MAX_SHORT_TEXT, pushMaxLengthError } from "./stringLimits.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidOrderNumber(value) {
  return typeof value === "string" && /^SU-\d{6}$/.test(value.trim());
}

/**
 * PostgreSQL (BIGINT) и JSON иногда отдают id как строку — приводим к целому.
 */
export function parsePositiveInteger(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

export function parseNonNegativeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

export function validateCreateOrderPayload(payload) {
  const errors = [];

  if (!Array.isArray(payload?.items) || payload.items.length === 0) {
    errors.push("Field 'items' is required and must be a non-empty array.");
  } else {
    payload.items.forEach((item, index) => {
      if (parsePositiveInteger(item?.productId) === null) {
        errors.push(`Field 'items[${index}].productId' must be a positive integer.`);
      }
      if (!isNonEmptyString(item?.productName)) {
        errors.push(`Field 'items[${index}].productName' is required.`);
      }
      pushMaxLengthError(errors, `items[${index}].productName`, item?.productName, MAX_SHORT_TEXT);
      if (parsePositiveInteger(item?.quantity) === null) {
        errors.push(`Field 'items[${index}].quantity' must be a positive integer.`);
      }
      if (parseNonNegativeNumber(item?.unitPrice) === null) {
        errors.push(`Field 'items[${index}].unitPrice' must be a non-negative number.`);
      }
    });
  }

  const contacts = payload?.contacts;
  if (!isNonEmptyString(contacts?.name)) {
    errors.push("Field 'contacts.name' is required.");
  }
  if (!isNonEmptyString(contacts?.phone)) {
    errors.push("Field 'contacts.phone' is required.");
  }
  if (!isEmail(contacts?.email)) {
    errors.push("Field 'contacts.email' is required and must be a valid email.");
  }
  pushMaxLengthError(errors, "contacts.name", contacts?.name, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "contacts.phone", contacts?.phone, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "contacts.email", contacts?.email, MAX_SHORT_TEXT);

  const address = payload?.address;
  if (!isNonEmptyString(address?.city)) {
    errors.push("Field 'address.city' is required.");
  }
  if (!isNonEmptyString(address?.street)) {
    errors.push("Field 'address.street' is required.");
  }
  if (!isNonEmptyString(address?.house)) {
    errors.push("Field 'address.house' is required.");
  }
  pushMaxLengthError(errors, "address.city", address?.city, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "address.street", address?.street, MAX_MEDIUM_TEXT);
  pushMaxLengthError(errors, "address.house", address?.house, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "address.apartment", address?.apartment, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "address.zip", address?.zip, MAX_SHORT_TEXT);

  return errors;
}

/**
 * Нормализует payload заказа после успешной валидации.
 */
export function normalizeCreateOrderPayload(payload) {
  return {
    items: payload.items.map((item) => ({
      productId: parsePositiveInteger(item.productId),
      productName: item.productName.trim(),
      quantity: parsePositiveInteger(item.quantity),
      unitPrice: parseNonNegativeNumber(item.unitPrice)
    })),
    contacts: {
      name: payload.contacts.name.trim(),
      phone: payload.contacts.phone.trim(),
      email: payload.contacts.email.trim().toLowerCase()
    },
    address: {
      city: payload.address.city.trim(),
      street: payload.address.street.trim(),
      house: payload.address.house.trim(),
      apartment: payload.address.apartment?.trim() ?? "",
      zip: payload.address.zip?.trim() ?? ""
    }
  };
}
