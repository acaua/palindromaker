// GoatCounter analytics, React-free: main.tsx injects the script, and the
// router (src/router.tsx) counts one pageview per route. The script loads
// with no_onload so the initial route is counted here too — full page loads
// and SPA navigations go through the same countRoute().
declare global {
  interface Window {
    goatcounter?: {
      no_onload?: boolean;
      count?: (vars: { path: string }) => void;
    };
  }
}

const COUNT_SCRIPT_SRC = "https://gc.zgo.at/count.js";

let enabled = false;
let lastCounted: string | null = null;
// routes counted while the script was still loading, in order
let pendingPaths: string[] = [];

const countNow = (path: string): void => {
  // the queue can hold a repeat of what was just counted; repeats are not
  // new views
  if (path === lastCounted) return;
  window.goatcounter?.count?.({ path });
  lastCounted = path;
};

// one pageview per route; a repeat of the path you are already on is not a
// new view
export const countRoute = (path: string): void => {
  if (!enabled || path === lastCounted) return;
  // count() exists only once the script has loaded; earlier navigations
  // queue in order and are flushed on the script's load event, not lost
  if (window.goatcounter?.count) countNow(path);
  else if (pendingPaths[pendingPaths.length - 1] !== path) pendingPaths.push(path);
};

export const initGoatcounter = (
  url: string | undefined = import.meta.env.VITE_GOATCOUNTER_URL,
): void => {
  if (!url || enabled) return;
  enabled = true;
  // without no_onload the script counts on load by itself, and the
  // initial route would end up counted twice (by it and by countRoute)
  window.goatcounter = { no_onload: true };
  const script = document.createElement("script");
  script.async = true;
  script.dataset.goatcounter = url;
  script.src = COUNT_SCRIPT_SRC;
  script.addEventListener("load", () => {
    if (pendingPaths.length === 0) return;
    const paths = pendingPaths;
    pendingPaths = [];
    for (const path of paths) countNow(path);
  });
  document.head.appendChild(script);
};
