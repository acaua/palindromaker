import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import type { Mock } from "vite-plus/test";

type CountVars = { path: string };

const SITE_URL = "https://code.example.com/count";

// the injected count script
const script = () => document.querySelector<HTMLScriptElement>("script[data-goatcounter]");

// the module holds per-load state (enabled, last counted path, pending
// path), so every test re-imports it fresh
const fresh = async () => {
  vi.resetModules();
  return import("@/lib/goatcounter");
};

describe("goatcounter", () => {
  let count: Mock<(vars: CountVars) => void>;

  beforeEach(() => {
    document.head.replaceChildren();
    delete window.goatcounter;
    count = vi.fn<(vars: CountVars) => void>();
    // initGoatcounter's default reads the env: a developer's .env.local
    // (see .env.local.example) must not leak into these tests
    vi.stubEnv("VITE_GOATCOUNTER_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("injects the count script once, with counting left to the app", async () => {
    const { initGoatcounter } = await fresh();
    initGoatcounter(SITE_URL);
    initGoatcounter(SITE_URL);

    const added = script();
    expect(added?.getAttribute("data-goatcounter")).toBe(SITE_URL);
    expect(added?.src).toContain("gc.zgo.at/count.js");
    // the script must not count the initial pageview by itself
    expect(window.goatcounter?.no_onload).toBe(true);
  });

  test("counts nothing when the app runs without a site code", async () => {
    const { initGoatcounter, countRoute } = await fresh();
    initGoatcounter(undefined);
    countRoute("/about");

    expect(script()).toBeNull();
    expect(window.goatcounter).toBeUndefined();
  });

  test("counts each route once, repeats skipped", async () => {
    const { initGoatcounter, countRoute } = await fresh();
    initGoatcounter(SITE_URL);
    window.goatcounter!.count = count;

    countRoute("/about");
    countRoute("/about");
    countRoute("/");
    countRoute("/about");

    expect(count.mock.calls.map((call) => call[0].path)).toEqual(["/about", "/", "/about"]);
  });

  test("navigations that beat the script load are flushed in order on load", async () => {
    const { initGoatcounter, countRoute } = await fresh();
    initGoatcounter(SITE_URL);
    countRoute("/early");
    countRoute("/late");
    expect(count).not.toHaveBeenCalled();

    // the script arrives and defines count(); its load event flushes the
    // counts queued while it was still loading
    window.goatcounter!.count = count;
    fireEvent.load(script()!);

    expect(count.mock.calls.map((call) => call[0].path)).toEqual(["/early", "/late"]);
  });
});
