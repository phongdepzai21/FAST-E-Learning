import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelActiveSmoothScroll,
  resolveScrollTarget,
  smoothBounceScrollTo,
} from '../utils/scrollToPanel';

export interface UseSmoothScrollToOptions {
  /**
   * Optional reactive key (e.g. active tab, expanded boolean, fetched result object, view mode).
   * Whenever this changes and `enabled` is true, the hook monitors dynamic content loading
   * and scrolls smoothly with a bounce effect once content settles.
   */
  triggerKey?: unknown;
  /**
   * Element ID (with or without leading '#') to scroll to when `targetRef` is not attached.
   */
  targetId?: string;
  /**
   * Whether the reactive `triggerKey` watcher is active (default: true).
   */
  enabled?: boolean;
  /**
   * Whether to trigger scroll on the initial mount if `triggerKey` is active (default: false).
   */
  scrollOnMount?: boolean;
  /**
   * Breathing room in pixels above the scrolled-to element (default: 16).
   */
  offset?: number;
  /**
   * Duration of the scroll animation in milliseconds (default: 650).
   */
  duration?: number;
  /**
   * Spring overshoot strength for easeOutBack curve (default: 1.35).
   */
  bounceStrength?: number;
  /**
   * Whether to trigger the subtle spring-settle animation on the revealed element (default: true).
   */
  bounceElement?: boolean;
  /**
   * Debounce time (ms) while MutationObserver / ResizeObserver waits for lazy or async
   * dynamic panel content to finish mounting before scrolling (default: 75).
   */
  settleDelayMs?: number;
  /**
   * Maximum time (ms) to wait after a trigger before scrolling even if continuous
   * background mutations occur (default: 600).
   */
  maxWaitMs?: number;
  /**
   * Automatically observe DOM changes inside the target element (or document container
   * waiting for lazy loading / async panels) to re-adjust & scroll when content finishes loading.
   * Defaults to true.
   */
  observeMutations?: boolean;
  /**
   * If true, also automatically scrolls when an initially empty or loading-spinner container
   * populates with newly opened sections even without `triggerKey` changing (default: false).
   */
  detectDynamicReveal?: boolean;
}

export interface UseSmoothScrollToResult<T extends HTMLElement = HTMLDivElement> {
  /** Attach directly to a section/panel container when not using `targetId`. */
  targetRef: React.RefObject<T | null>;
  /**
   * Imperatively wait for any imminent DOM update / async panel expansion and scroll
   * smoothly with bounce to either the provided element/ID or the hook's configured target.
   */
  scrollTo: (
    overrideTarget?: HTMLElement | string | null,
    overrideOffset?: number
  ) => void;
  /** True while the smooth bounce scroll animation is currently running. */
  isScrolling: boolean;
  /** Cancels any pending observer wait or in-flight scroll animation. */
  cancelScroll: () => void;
}

function hasLoadingIndicator(el: HTMLElement): boolean {
  return Boolean(
    el.querySelector('[data-scroll-loading="true"], .animate-spin') &&
      el.innerText.trim().length < 240
  );
}

/**
 * Custom hook that detects dynamic content loading inside panels (via MutationObserver
 * & ResizeObserver) and automatically scrolls the viewport or scroll container to the
 * newly opened section with a smooth bounce effect.
 */
export function useSmoothScrollTo<T extends HTMLElement = HTMLDivElement>(
  options: UseSmoothScrollToOptions = {}
): UseSmoothScrollToResult<T> {
  const {
    triggerKey,
    targetId,
    enabled = true,
    scrollOnMount = false,
    offset = 16,
    duration = 650,
    bounceStrength = 1.35,
    bounceElement = true,
    settleDelayMs = 75,
    maxWaitMs = 600,
    observeMutations = true,
    detectDynamicReveal = false,
  } = options;

  const targetRef = useRef<T | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const settleTimerRef = useRef<number | null>(null);
  const maxWaitTimerRef = useRef<number | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mountedRef = useRef(false);
  const wasLoadingRef = useRef(false);

  const clearPendingObservers = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (maxWaitTimerRef.current !== null) {
      window.clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
      mutationObserverRef.current = null;
    }
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
  }, []);

  const cancelScroll = useCallback(() => {
    clearPendingObservers();
    cancelActiveSmoothScroll();
    setIsScrolling(false);
  }, [clearPendingObservers]);

  const executeScroll = useCallback(
    (el: HTMLElement, customOffset?: number) => {
      clearPendingObservers();
      setIsScrolling(true);
      smoothBounceScrollTo(el, {
        offset: customOffset ?? offset,
        duration,
        bounceStrength,
        bounceElement,
        onComplete: () => {
          setIsScrolling(false);
        },
      });
    },
    [clearPendingObservers, offset, duration, bounceStrength, bounceElement]
  );

  const scheduleAfterDynamicSettle = useCallback(
    (
      overrideTarget?: HTMLElement | string | null,
      overrideOffset?: number
    ) => {
      if (typeof window === 'undefined') return;
      clearPendingObservers();

      const getEl = () =>
        resolveScrollTarget(overrideTarget) ||
        targetRef.current ||
        resolveScrollTarget(targetId);

      const triggerNow = () => {
        const el = getEl();
        if (el) {
          executeScroll(el, overrideOffset);
        } else {
          clearPendingObservers();
        }
      };

      const resetSettleTimer = () => {
        if (settleTimerRef.current !== null) {
          window.clearTimeout(settleTimerRef.current);
        }
        const currentEl = getEl();
        const delay =
          currentEl && hasLoadingIndicator(currentEl)
            ? Math.max(settleDelayMs, 180)
            : settleDelayMs;

        settleTimerRef.current = window.setTimeout(() => {
          const el = getEl();
          if (el && hasLoadingIndicator(el)) {
            // Still showing a lazy Suspense or loading spinner; let maxWait cap it cleanly
            return;
          }
          triggerNow();
        }, delay);
      };

      // Safety cap so background polling never postpones scrolling indefinitely
      maxWaitTimerRef.current = window.setTimeout(() => {
        triggerNow();
      }, maxWaitMs);

      if (observeMutations) {
        const el = getEl();
        const observeRoot: Node = el || document.body;
        const mObserver = new MutationObserver(() => {
          // Once target mounts (or finishes mutating children), reset settle debounce
          resetSettleTimer();
        });
        mObserver.observe(observeRoot, {
          childList: true,
          subtree: true,
        });
        mutationObserverRef.current = mObserver;

        if (el && typeof ResizeObserver !== 'undefined') {
          let prevHeight = el.getBoundingClientRect().height;
          const rObserver = new ResizeObserver((entries) => {
            const nextHeight = entries[0]?.contentRect.height ?? prevHeight;
            if (Math.abs(nextHeight - prevHeight) > 8) {
              prevHeight = nextHeight;
              resetSettleTimer();
            }
          });
          rObserver.observe(el);
          resizeObserverRef.current = rObserver;
        }
      }

      // Kick off initial settle check after current React commit paints
      window.requestAnimationFrame(() => {
        resetSettleTimer();
      });
    },
    [
      clearPendingObservers,
      targetId,
      executeScroll,
      settleDelayMs,
      maxWaitMs,
      observeMutations,
    ]
  );

  // Reactive watcher when `triggerKey` updates (tab switch, panel open, async data arrival)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!scrollOnMount) return;
    }
    if (!enabled) return;

    scheduleAfterDynamicSettle();
  }, [triggerKey, enabled, scrollOnMount, scheduleAfterDynamicSettle]);

  // Passive dynamic content reveal watcher: catches async spinner -> loaded panel transitions
  // even when `triggerKey` isn't explicitly passed.
  useEffect(() => {
    if (!detectDynamicReveal || !enabled || typeof window === 'undefined') return;
    const el = targetRef.current || resolveScrollTarget(targetId);
    if (!el) return;

    wasLoadingRef.current = hasLoadingIndicator(el) || el.childElementCount === 0;

    const passiveObserver = new MutationObserver(() => {
      const loadingNow = hasLoadingIndicator(el);
      if (wasLoadingRef.current && !loadingNow && el.childElementCount > 0) {
        wasLoadingRef.current = false;
        scheduleAfterDynamicSettle(el);
      } else if (loadingNow) {
        wasLoadingRef.current = true;
      }
    });

    passiveObserver.observe(el, {
      childList: true,
      subtree: true,
    });

    return () => {
      passiveObserver.disconnect();
    };
  }, [detectDynamicReveal, enabled, targetId, scheduleAfterDynamicSettle]);

  useEffect(() => {
    return () => {
      clearPendingObservers();
    };
  }, [clearPendingObservers]);

  return {
    targetRef,
    scrollTo: scheduleAfterDynamicSettle,
    isScrolling,
    cancelScroll,
  };
}

export default useSmoothScrollTo;
