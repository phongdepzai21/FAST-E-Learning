export interface PasswordRuleResult {
  id: 'minLength' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  passed: boolean;
}

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordValidationSummary {
  score: number; // 0..5
  maxScore: number;
  level: PasswordStrengthLevel;
  levelLabel: string;
  isValid: boolean;
  rules: PasswordRuleResult[];
  firstError: string | null;
}

export function evaluatePasswordStrength(password: string): PasswordValidationSummary {
  const value = password || '';

  const rules: PasswordRuleResult[] = [
    {
      id: 'minLength',
      label: 'Tối thiểu 8 ký tự',
      passed: value.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'Ít nhất 1 chữ cái in hoa (A-Z)',
      passed: /[A-Z]/.test(value),
    },
    {
      id: 'lowercase',
      label: 'Ít nhất 1 chữ cái thường (a-z)',
      passed: /[a-z]/.test(value),
    },
    {
      id: 'number',
      label: 'Ít nhất 1 chữ số (0-9)',
      passed: /[0-9]/.test(value),
    },
    {
      id: 'special',
      label: 'Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)',
      passed: /[^A-Za-z0-9\s]/.test(value),
    },
  ];

  const score = rules.filter((r) => r.passed).length;
  const maxScore = rules.length;

  let level: PasswordStrengthLevel = 'empty';
  let levelLabel = 'Chưa nhập mật khẩu';

  if (value.length === 0) {
    level = 'empty';
    levelLabel = 'Chưa nhập mật khẩu';
  } else if (score <= 2) {
    level = 'weak';
    levelLabel = 'Yếu';
  } else if (score === 3) {
    level = 'fair';
    levelLabel = 'Trung bình';
  } else if (score === 4) {
    level = 'good';
    levelLabel = 'Khá mạnh';
  } else {
    level = 'strong';
    levelLabel = 'Mạnh';
  }

  const failedRule = rules.find((r) => !r.passed);
  const firstError = failedRule
    ? `Mật khẩu chưa đạt yêu cầu bảo mật: cần ${failedRule.label.toLowerCase()}.`
    : null;

  return {
    score,
    maxScore,
    level,
    levelLabel,
    isValid: score === maxScore,
    rules,
    firstError,
  };
}
