import React, { useEffect, useRef, useState } from 'react';
import CountUp from 'react-countup';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedPriceCounterProps {
  priceStr: string;
  label?: string;
  subLabel?: string;
  variant?: 'sale' | 'original' | 'savings' | 'discount';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
}

const parseNumericPrice = (str: string): number => {
  if (!str) return 0;
  const digits = str.replace(/[^\d]/g, '');
  return parseInt(digits, 10) || 0;
};

export const AnimatedPriceCounter: React.FC<AnimatedPriceCounterProps> = ({
  priceStr,
  label,
  subLabel,
  variant = 'sale',
  size = 'md',
  showBadge = false,
  badgeText,
  className = ''
}) => {
  const numericValue = parseNumericPrice(priceStr);
  const prevValueRef = useRef<number>(numericValue);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (prevValueRef.current !== numericValue) {
      setIsChanging(true);
      const timer = setTimeout(() => setIsChanging(false), 600);
      prevValueRef.current = numericValue;
      return () => clearTimeout(timer);
    }
  }, [numericValue]);

  // Variant color mappings
  const variantStyles = {
    sale: {
      text: 'text-[#007c76] font-black',
      bg: 'bg-emerald-50/90 border-emerald-200/80',
      badge: 'bg-emerald-600 text-white',
      glow: 'shadow-emerald-500/20'
    },
    original: {
      text: 'text-slate-400 font-bold line-through',
      bg: 'bg-slate-50 border-slate-200/70',
      badge: 'bg-slate-200 text-slate-700',
      glow: 'shadow-slate-500/10'
    },
    savings: {
      text: 'text-emerald-700 font-black',
      bg: 'bg-emerald-100/80 border-emerald-300',
      badge: 'bg-emerald-700 text-white',
      glow: 'shadow-emerald-600/25'
    },
    discount: {
      text: 'text-red-600 font-black',
      bg: 'bg-red-50 border-red-200',
      badge: 'bg-red-600 text-white',
      glow: 'shadow-red-500/20'
    }
  }[variant];

  // Size mappings
  const sizeStyles = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-xl sm:text-2xl'
  }[size];

  return (
    <div className={`inline-flex flex-col p-2.5 rounded-2xl border transition-all duration-300 relative ${variantStyles.bg} ${isChanging ? `scale-105 shadow-md ${variantStyles.glow} ring-2 ring-[#007c76]/30` : 'shadow-2xs'} ${className}`}>
      {(label || subLabel || showBadge) && (
        <div className="flex items-center justify-between gap-2 mb-1">
          {label && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {label}
            </span>
          )}
          {badgeText && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs animate-bounce ${variantStyles.badge}`}>
              {badgeText}
            </span>
          )}
        </div>
      )}

      <div className={`flex items-baseline gap-1 ${variantStyles.text} ${sizeStyles}`}>
        <CountUp
          start={prevValueRef.current}
          end={numericValue}
          duration={0.5}
          separator="."
          formattingFn={(val) => val.toLocaleString('vi-VN')}
        />
        <span className="text-[0.75em] font-extrabold">đ</span>
      </div>

      {subLabel && (
        <span className="text-[9px] font-medium text-slate-400 mt-0.5">
          {subLabel}
        </span>
      )}
    </div>
  );
};
