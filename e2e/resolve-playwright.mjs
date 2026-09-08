// pnpm does not hoist playwright to the top level, but @playwright/test's
// own dependency tree carries it, so resolve from there.
import { createRequire } from "node:module";

const require = createRequire(import.meta.resolve("@playwright/test"));
const { chromium } = require("playwright");
export { chromium };
