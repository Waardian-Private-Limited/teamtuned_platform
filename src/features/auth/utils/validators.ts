const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidMobile(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  const phone10 = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(phone10);
}
