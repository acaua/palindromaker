// A fresh page starts at the top: a long palindrome can leave the window
// scrolled deep. The route swap and the menu remount drop focus, so the
// page's h1 takes it and screen readers announce the new page — unless the
// page manages its own focus (the editor autofocuses on mount).
export const resetPageView = (): void => {
  window.scrollTo(0, 0);
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.isContentEditable) return;
  document.querySelector<HTMLElement>("main h1")?.focus();
};
