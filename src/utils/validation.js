const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?\d{10,15}$/;

export function validateRequired(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateEmail(value) {
  return validateRequired(value) && emailPattern.test(value.trim());
}

export function validatePhone(value) {
  return validateRequired(value) && phonePattern.test(value.replace(/\s/g, ""));
}
