/**
 * Minimal haptics layer — only meaningful, discrete feedback.
 * Never called during scroll; only on confirmed user actions / state transitions.
 */
export const haptics = {
  /** Subtle tick — step change, timer start */
  light() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /** Medium pulse — confirmations */
  medium() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /** Timer done pattern */
  timerDone() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([120, 60, 160]);
    }
  },
};
