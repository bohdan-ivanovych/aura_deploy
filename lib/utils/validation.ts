export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_NAME_LENGTH = 100;

export function sanitizeText(text: unknown, maxLength = MAX_MESSAGE_LENGTH): string {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
}

export function validateCuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[a-z0-9]{20,30}$/.test(id);
}

export function validateEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function validateLanguageCode(code: unknown): code is string {
  if (typeof code !== 'string') return false;
  return /^[a-z]{2,5}$/.test(code);
}

export function assertNonEmpty(value: string, fieldName: string): void {
  if (!value.trim()) {
    throw new Error(`${fieldName} must not be empty`);
  }
}
