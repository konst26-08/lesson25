export const MAX_EMAIL_LENGTH = 254;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_SHORT_TEXT = 200;
export const MAX_MEDIUM_TEXT = 500;

export function isWithinMaxLength(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}

export function pushMaxLengthError(errors, field, value, maxLength) {
  if (typeof value === "string" && value.length > maxLength) {
    errors.push(`Field '${field}' must not exceed ${maxLength} characters.`);
  }
}
