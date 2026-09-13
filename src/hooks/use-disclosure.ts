import { useCallback, useEffect, useId, useRef, useState } from "react";

// The disclosure pattern shared by the site header's phone menu and the
// status bar's Share dropdown: an aria-expanded trigger and a hidden panel,
// closed by Escape (refocusing the trigger) or a click outside (leaving
// focus where the click landed).
export const useDisclosure = () => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (triggerRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) {
        return;
      }
      close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  return { open, toggle, close, triggerRef, panelRef, panelId };
};
