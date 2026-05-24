import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, pushMaxLengthError } from "./stringLimits.js";

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validateRegisterPayload(payload) {
  const errors = [];

  if (!isEmail(payload?.email)) {
    errors.push("Field 'email' is required and must be a valid email.");
  }
  pushMaxLengthError(errors, "email", payload?.email, MAX_EMAIL_LENGTH);

  if (typeof payload?.password !== "string" || payload.password.length < 8) {
    errors.push("Field 'password' is required and must contain at least 8 characters.");
  }
  pushMaxLengthError(errors, "password", payload?.password, MAX_PASSWORD_LENGTH);

  return errors;
}

export function validateLoginPayload(payload) {
  const errors = [];

  if (!isEmail(payload?.email)) {
    errors.push("Field 'email' is required and must be a valid email.");
  }
  pushMaxLengthError(errors, "email", payload?.email, MAX_EMAIL_LENGTH);

  if (typeof payload?.password !== "string" || payload.password.length === 0) {
    errors.push("Field 'password' is required.");
  }
  pushMaxLengthError(errors, "password", payload?.password, MAX_PASSWORD_LENGTH);

  return errors;
}
