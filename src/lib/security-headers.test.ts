import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";

import { BSKY_API, BSKY_EMBED } from "@/lib/bluesky-post";

// The deployed CSP (public/_headers, served by Cloudflare) is the only
// thing standing between the app and Bluesky: pnpm dev/preview never
// serve _headers, and the e2e suite stubs every Bluesky host, so only
// this file-content test guards the allowlist. Tightening the CSP
// without these hosts breaks Explore and the post reader on deploys
// only, surfacing as the generic "couldn't load" error. The expected
// origins are read off the app's own constants so the two cannot drift.
const headers = readFileSync(new URL("../../public/_headers", import.meta.url), "utf8");

const csp = (): string => {
  const line = headers
    .split("\n")
    .find((entry) => entry.trimStart().startsWith("Content-Security-Policy:"));
  if (!line) throw new Error("Content-Security-Policy not found in public/_headers");
  return line;
};

const directive = (name: string): string[] => {
  const match = new RegExp(`${name} ([^;]+)`).exec(csp());
  if (!match) throw new Error(`${name} not found in the deployed CSP`);
  return match[1].split(/\s+/);
};

describe("deployed CSP", () => {
  test("connect-src allowlists the Bluesky API origin", () => {
    expect(directive("connect-src")).toContain(new URL(BSKY_API).origin);
  });

  test("frame-src allowlists the Bluesky embed origin", () => {
    expect(directive("frame-src")).toContain(new URL(BSKY_EMBED).origin);
  });
});
