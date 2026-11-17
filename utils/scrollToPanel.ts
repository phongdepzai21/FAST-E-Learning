export interface SmoothBounceScrollOptions {
  /** Breathing space above the target element in px (default: 16) */
  offset?: number;
  /** Scroll animation duration in ms (default: 650) */
  duration?: number;
  /** Overshoot factor for the easeOutBack bounce curve (default: 1.35; 0 disables overshoot) */
  bounceStrength?: number;
  /** Apply subtle spring-settle class on the target element upon scroll completion (default: true) */
  bounceElement?: boolean;
  /** Called right when animation finishes or is cancelled */
  onComplete?: () => void;
}

let activeCancelFn: (() => void) | null = null;
const bounceTimers = new WeakMap<HTMLElement, number>();

/**
 * Resolves a string ID (with or without leading '#') or HTMLElement to an HTMLElement.
 */
export function resolveScrollTarget(
  target: HTMLElement | string | null | undefined
): HTMLElement | null {
  if (typeof document === 'undefined' || !target) return null;
  if (typeof target !== 'string') return target;
  const cleanId = target.startsWith('#') ? target.slice(1) : target;
  return document.getElementById(cleanId);
}

/**
 * Finds the nearest scrollable ancestor element (like Account's `<main className="overflow-y-auto">`)
 * or returns `null` when the viewport (`window`) is the scroll container.
 */
export function findScrollContainer(el: HTMLElement): HTMLElement | null {
  let parent: HTMLElement | null = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const isScrollableStyle = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
    if (isScrollableStyle && parent.scrollHeight > parent.clientHeight + 2) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

/**
 * Easing function with a smooth, natural spring overshoot and settle.
 */
function easeOutBack(t: number, strength: number): number {
  if (strength <= 0) {
    // Standard easeOutCubic fallback
    return 1 - Math.pow(1 - t, 3);
  }
  const c1 = strength;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Applies a brief GPU-composited spring-settle bounce animation on the revealed element.
 */
export function triggerElementBounceSettle(el: HTMLElement): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const existingTimer = bounceTimers.get(el);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  el.classList.remove('smooth-scroll-bounce-active');
  // Force reflow so rapid consecutive reveals replay cleanly
  void el.offsetWidth;
  el.classList.add('smooth-scroll-bounce-active');

  const timer = window.setTimeout(() => {
    el.classList.remove('smooth-scroll-bounce-active');
    bounceTimers.delete(el);
  }, 580);
  bounceTimers.set(el, timer);
}

/**
 * Cancels any currently running smooth bounce scroll animation.
 */
export function cancelActiveSmoothScroll(): void {
  if (activeCancelFn) {
    activeCancelFn();
    activeCancelFn = null;
  }
}

/**
 * Smoothly scrolls the enclosing scroll container or window to `target` using a
 * requestAnimationFrame-driven spring/bounce curve + element settle animation.
 */
export function smoothBounceScrollTo(
  target: HTMLElement | string | null | undefined,
  options: SmoothBounceScrollOptions = {}
): () => void {
  if (typeof window === 'undefined') return () => {};
  const el = resolveScrollTarget(target);
  if (!el) return () => {};

  cancelActiveSmoothScroll();

  const {
    offset = 16,
    duration = 650,
    bounceStrength = 1.35,
    bounceElement = true,
    onComplete,
  } = options;

  const prefersReducedMotion = Boolean(
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const scrollContainer = findScrollContainer(el);
  const getCurrentScrollTop = () =>
    scrollContainer ? scrollContainer.scrollTop : window.scrollY || window.pageYOffset || 0;

  const getMaxScrollTop = () => {
    if (scrollContainer) {
      return Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    }
    const docEl = document.scrollingElement || document.documentElement;
    return Math.max(0, docEl.scrollHeight - window.innerHeight);
  };

  const setScrollTop = (y: number) => {
    const clamped = Math.max(0, Math.min(y, getMaxScrollTop()));
    if (scrollContainer) {
      scrollContainer.scrollTop = clamped;
    } else {
      window.scrollTo(0, clamped);
    }
  };

  const computeDestinationY = () => {
    const elRect = el.getBoundingClientRect();
    const containerTop = scrollContainer ? scrollContainer.getBoundingClientRect().top : 0;
    const rawTarget = getCurrentScrollTop() + (elRect.top - containerTop) - offset;
    return Math.max(0, Math.min(rawTarget, getMaxScrollTop()));
  };

  const startY = getCurrentScrollTop();
  const initialDestY = computeDestinationY();

  if (prefersReducedMotion || duration <= 0 || Math.abs(initialDestY - startY) < 2) {
    setScrollTop(initialDestY);
    if (bounceElement && !prefersReducedMotion) {
      triggerElementBounceSettle(el);
    }
    onComplete?.();
    return () => {};
  }

  let rafId = 0;
  let cancelled = false;
  let startTime: number | null = null;
  let bounceTriggered = false;

  const userInterruptEvents: Array<keyof WindowEventMap> = [
    'wheel',
    'touchstart',
    'pointerdown',
    'keydown',
  ];

  const cleanup = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    const listenerTarget: EventTarget = scrollContainer || window;
    userInterruptEvents.forEach((evt) => {
      listenerTarget.removeEventListener(evt, handleUserInterrupt as EventListener);
      window.removeEventListener(evt, handleUserInterrupt as EventListener);
    });
    if (activeCancelFn === cancel) {
      activeCancelFn = null;
    }
  };

  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    cleanup();
    onComplete?.();
  };

  function handleUserInterrupt(e: Event) {
    if (e.type === 'keydown') {
      const key = (e as KeyboardEvent).key;
      if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(key)) {
        return;
      }
    }
    cancel();
  }

  const listenerTarget: EventTarget = scrollContainer || window;
  userInterruptEvents.forEach((evt) => {
    listenerTarget.addEventListener(evt, handleUserInterrupt as EventListener, { passive: true });
    if (scrollContainer) {
      window.addEventListener(evt, handleUserInterrupt as EventListener, { passive: true });
    }
  });

  activeCancelFn = cancel;

  const step = (timestamp: number) => {
    if (cancelled) return;
    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Re-evaluate destination dynamically so late image/table height expansions stay accurate
    const destY = computeDestinationY();
    const eased = easeOutBack(progress, bounceStrength);
    const nextY = startY + (destY - startY) * eased;

    setScrollTop(nextY);

    if (bounceElement && !bounceTriggered && progress >= 0.72) {
      bounceTriggered = true;
      triggerElementBounceSettle(el);
    }

    if (progress < 1) {
      rafId = window.requestAnimationFrame(step);
    } else {
      setScrollTop(destY);
      if (bounceElement && !bounceTriggered) {
        triggerElementBounceSettle(el);
      }
      cancelled = true;
      cleanup();
      onComplete?.();
    }
  };

  rafId = window.requestAnimationFrame(step);
  return cancel;
}

/**
 * Backward-compatible helper that waits `delayMs` for newly toggled DOM panels
 * and then triggers a smooth bounce scroll to the target element.
 */
export function scrollToElementSmooth(
  target: HTMLElement | string | null | undefined,
  delayMs: number = 85,
  offset: number = 16
): void {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    smoothBounceScrollTo(target, { offset });
  }, delayMs);
}
