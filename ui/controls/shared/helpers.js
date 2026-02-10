/* controls/shared/helpers.js
   ============================================================
   SHARED HELPER FUNCTIONS
   ============================================================ */

/**
 * Generate a unique dot ID for point picker overlays
 */
export function pointPickerDotId(tabId, key, index) {
  return tabId + "-" + key + "-dot" + index;
}

/**
 * Remove all point picker dots from a container
 */
export function removePointPickerDots(container, tabId, key) {
  const existing = container.querySelectorAll(`[id^="${tabId}-${key}-dot"]`);
  existing.forEach(el => el.remove());
}

/**
 * Validate and clamp numeric input
 */
export function validateNumeric(value, min, max) {
  let num = parseFloat(value);
  if (isNaN(num)) return min !== null ? min : 0;
  if (min !== null && num < min) return min;
  if (max !== null && num > max) return max;
  return num;
}
