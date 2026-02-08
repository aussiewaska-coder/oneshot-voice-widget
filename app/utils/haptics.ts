/**
 * Haptic feedback utilities for touch interactions.
 * Uses the Vibration API (supported on iOS, Android, Firefox, Chrome).
 * Degrades gracefully if unsupported.
 *
 * Browser Support:
 * - iOS Safari: ✅ Full support
 * - Chrome Android: ✅ Full support
 * - Firefox Android: ✅ Full support
 * - Samsung Internet: ✅ Full support
 */

export const haptics = {
  /**
   * Light single pulse (10ms) - use for subtle feedback
   * Best for: Tab switches, scroll completion, light touches
   */
  light: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {
        // Silently fail if vibration is denied or unsupported
      }
    }
  },

  /**
   * Medium single pulse (15ms) - use for standard interactions
   * Best for: Button taps, form input, standard feedback
   */
  medium: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch (e) {
        // Silently fail if vibration is denied or unsupported
      }
    }
  },

  /**
   * Heavy single pulse (50ms) - use for important actions
   * Best for: Connect/disconnect, critical operations
   */
  heavy: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(50);
      } catch (e) {
        // Silently fail if vibration is denied or unsupported
      }
    }
  },

  /**
   * Double pulse pattern (20ms-10ms-20ms) - use for state changes
   * Best for: Bottom sheet expand/collapse, toggle on/off
   */
  double: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([20, 10, 20]);
      } catch (e) {
        // Silently fail if vibration is denied or unsupported
      }
    }
  },

  /**
   * Success pattern (10ms-5ms-10ms) - use for successful operations
   * Best for: Message sent, action confirmed, operation complete
   */
  success: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([10, 5, 10, 5, 10]);
      } catch (e) {
        // Silently fail if vibration is denied or unsupported
      }
    }
  },

  /**
   * Error pattern (100ms) - use for errors or warnings
   * Best for: Connection error, invalid input, permission denied
   */
  error: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(100);
      } catch (e) {
        // Silently fail if vibration is denied or unsupported
      }
    }
  },
};
