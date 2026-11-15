import React from 'react';
import { Check, Circle, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { evaluatePasswordStrength, type PasswordStrengthLevel } from '../utils/passwordValidation';

interface PasswordStrengthMeterProps {
  password: string;
  compact?: boolean;
  className?: string;
}

const LEVEL_STYLES: Record<
  PasswordStrengthLevel,
  {
    textClass: string;
    barClass: string;
    statusText: string;
  }
> = {
  empty: {
    textClass: 'text-slate-500',
    barClass: 'bg-slate-200',
    statusText: 'Nhập mật khẩu để kiểm tra độ mạnh',
  },
  weak: {
    textClass: 'text-rose-700',
    barClass: 'bg-rose-600',
    statusText: 'Độ mạnh: Yếu',
  },
  fair: {
    textClass: 'text-amber-700',
    barClass: 'bg-amber-500',
    statusText: 'Độ mạnh: Trung bình',
  },
  good: {
    textClass: 'text-sky-700',
    barClass: 'bg-sky-600',
    statusText: 'Độ mạnh: Khá mạnh',
  },
  strong: {
    textClass: 'text-emerald-700',
    barClass: 'bg-emerald-600',
    statusText: 'Độ mạnh: Mạnh (Đạt chuẩn)',
  },
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  compact = false,
  className = '',
}) => {
  const result = evaluatePasswordStrength(password);
  const style = LEVEL_STYLES[result.level];

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-2.5 text-left ${className}`}
      aria-live="polite"
    >
      {/* Header row: explicit icon + text status (never hue-only) */}
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1.5 text-xs font-bold ${style.textClass}`}>
          {result.level === 'strong' ? (
            <ShieldCheck className="w-4 h-4 shrink-0" />
          ) : result.level === 'weak' ? (
            <ShieldAlert className="w-4 h-4 shrink-0" />
          ) : (
            <Shield className="w-4 h-4 shrink-0" />
          )}
          <span>{style.statusText}</span>
        </div>
        <span className="text-[11px] font-bold text-slate-500 tabular-nums shrink-0">
          {result.score}/{result.maxScore} tiêu chí
        </span>
      </div>

      {/* 5-segment strength bar */}
      <div className="grid grid-cols-5 gap-1.5" role="progressbar" aria-valuenow={result.score} aria-valuemin={0} aria-valuemax={result.maxScore}>
        {[1, 2, 3, 4, 5].map((step) => {
          const filled = result.score >= step;
          return (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-colors duration-200 ${
                filled ? style.barClass : 'bg-slate-200'
              }`}
            />
          );
        })}
      </div>

      {/* Rules Checklist */}
      <ul className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-x-3 gap-y-1.5 pt-0.5`}>
        {result.rules.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
              rule.passed ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            {rule.passed ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={3} />
            ) : (
              <Circle className="w-3 h-3 text-slate-400 shrink-0" />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;
