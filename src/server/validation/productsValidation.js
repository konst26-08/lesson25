import { MAX_SHORT_TEXT, pushMaxLengthError } from "./stringLimits.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function validateCreateProduct(payload) {
  const errors = [];

  if (!isNonEmptyString(payload?.name)) {
    errors.push("Field 'name' is required and must be a non-empty string.");
  }

  if (!isNonNegativeNumber(payload?.price)) {
    errors.push("Field 'price' is required and must be a non-negative number.");
  }

  if (!isNonEmptyString(payload?.sport)) {
    errors.push("Field 'sport' is required and must be a non-empty string.");
  }

  if (!isNonEmptyString(payload?.brand)) {
    errors.push("Field 'brand' is required and must be a non-empty string.");
  }
  pushMaxLengthError(errors, "name", payload?.name, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "sport", payload?.sport, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "brand", payload?.brand, MAX_SHORT_TEXT);

  return errors;
}

export function validateUpdateProduct(payload) {
  const errors = [];

  if (payload.name !== undefined && !isNonEmptyString(payload.name)) {
    errors.push("Field 'name' must be a non-empty string.");
  }

  if (payload.price !== undefined && !isNonNegativeNumber(payload.price)) {
    errors.push("Field 'price' must be a non-negative number.");
  }

  if (payload.sport !== undefined && !isNonEmptyString(payload.sport)) {
    errors.push("Field 'sport' must be a non-empty string.");
  }

  if (payload.brand !== undefined && !isNonEmptyString(payload.brand)) {
    errors.push("Field 'brand' must be a non-empty string.");
  }

  if (payload.isActive !== undefined && typeof payload.isActive !== "boolean") {
    errors.push("Field 'isActive' must be boolean.");
  }

  if (Object.keys(payload).length === 0) {
    errors.push("Request body must include at least one field to update.");
  }
  pushMaxLengthError(errors, "name", payload.name, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "sport", payload.sport, MAX_SHORT_TEXT);
  pushMaxLengthError(errors, "brand", payload.brand, MAX_SHORT_TEXT);

  return errors;
}
