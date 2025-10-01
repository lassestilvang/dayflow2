"use client";

/**
 * Check if the View Transition API is supported in the current browser
 */
export function isViewTransitionSupported(): boolean {
  if (typeof document === "undefined") return false;
  return "startViewTransition" in document;
}

/**
 * Execute a callback with View Transition API animation
 * Falls back to instant execution if not supported
 */
export async function withViewTransition(
  callback: () => void | Promise<void>
): Promise<void> {
  if (!isViewTransitionSupported()) {
    // No View Transition API support - execute immediately
    await callback();
    return;
  }

  // Use View Transition API for smooth animation
  const transition = (document as any).startViewTransition(async () => {
    await callback();
  });

  try {
    await transition.finished;
  } catch (error) {
    // Transition was skipped or interrupted
    console.warn("View transition interrupted:", error);
  }
}

/**
 * Execute a theme change with View Transition API
 * Creates a smooth cross-fade animation between themes
 *
 * @param callback Function that performs the theme change
 * @param options Optional configuration for the transition
 */
export async function withThemeTransition(
  callback: () => void | Promise<void>,
  options?: {
    skipMotion?: boolean;
  }
): Promise<void> {
  // Check if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || options?.skipMotion) {
    // Skip animation if user prefers reduced motion
    await callback();
    return;
  }

  await withViewTransition(callback);
}

/**
 * Execute a theme change with circular reveal animation from a specific element
 *
 * @param callback Function that performs the theme change
 * @param originElement Optional element to use as the origin point for the reveal
 */
export async function withCircularReveal(
  callback: () => void | Promise<void>,
  originElement?: HTMLElement | null
): Promise<void> {
  if (!isViewTransitionSupported() || !originElement) {
    await withThemeTransition(callback);
    return;
  }

  // Check if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    await callback();
    return;
  }

  // Get the position of the origin element
  const rect = originElement.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // Calculate the maximum distance from the origin to any corner
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  // Create a circular reveal animation using CSS
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation-duration: 0.5s;
      animation-timing-function: ease-in-out;
    }

    ::view-transition-new(root) {
      animation-name: theme-transition-reveal;
      clip-path: circle(0% at ${x}px ${y}px);
    }

    @keyframes theme-transition-reveal {
      to {
        clip-path: circle(${endRadius}px at ${x}px ${y}px);
      }
    }
  `;

  document.head.appendChild(styleSheet);

  try {
    await withViewTransition(callback);
  } finally {
    // Clean up the temporary style
    document.head.removeChild(styleSheet);
  }
}
