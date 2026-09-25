import { useEffect } from "react";
import type { RefObject } from "react";

const MIN_DISTANCE = 24;

// A horizontal-swipe accelerant, read passively on touchstart/touchend: no
// preventDefault and no touch-action override, so native vertical scrolling
// and long-press text selection are untouched. Vertical drags are ignored.
export const useSwipeStep = (
  ref: RefObject<HTMLElement | null>,
  onStep: (direction: 1 | -1) => void,
): void => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      tracking = true;
    };
    const onEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) <= Math.abs(dy)) return;
      onStep(dx < 0 ? 1 : -1);
    };

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchend", onEnd);
    };
  }, [ref, onStep]);
};
