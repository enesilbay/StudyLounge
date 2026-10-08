/** Yeni şifre kuralları (kayıt ve şifre sıfırlama). Türkçe harfler de sayılır. */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
  id: 'length' | 'upper' | 'lower';
  label: string;
  met: boolean;
}

export function checkPassword(password: string): PasswordRule[] {
  return [
    { id: 'length', label: `En az ${PASSWORD_MIN_LENGTH} karakter`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'upper', label: 'En az bir büyük harf', met: /\p{Lu}/u.test(password) },
    { id: 'lower', label: 'En az bir küçük harf', met: /\p{Ll}/u.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPassword(password).every((rule) => rule.met);
}
