/**
 * Centralized password validation aligned with `security-baseline-fr` memory.
 * Returns a list of human-readable problems (empty array = valid).
 */
export interface PasswordCheckResult {
  valid: boolean;
  problems: string[];
  /** Score 0-4 (0 = very weak, 4 = strong) */
  strength: number;
}

export function validatePassword(pw: string): PasswordCheckResult {
  const problems: string[] = [];
  if (!pw || pw.length < 10) problems.push('Au moins 10 caractères');
  if (!/[A-Z]/.test(pw)) problems.push('Au moins une majuscule');
  if (!/[a-z]/.test(pw)) problems.push('Au moins une minuscule');
  if (!/[0-9]/.test(pw)) problems.push('Au moins un chiffre');
  if (!/[^A-Za-z0-9]/.test(pw)) problems.push('Au moins un caractère spécial');

  let strength = 0;
  if (pw.length >= 10) strength++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) strength++;
  if (/[0-9]/.test(pw)) strength++;
  if (/[^A-Za-z0-9]/.test(pw)) strength++;
  if (pw.length >= 14) strength = Math.min(4, strength + 1);

  return { valid: problems.length === 0, problems, strength };
}
