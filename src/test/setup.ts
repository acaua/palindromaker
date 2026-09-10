import { cleanup } from "@testing-library/react";
import { afterEach } from "vite-plus/test";

// Testing Library only registers its own cleanup when vitest globals are
// on; these tests import from "vite-plus/test" instead, so without this
// every render would pile up in the same document.
afterEach(cleanup);
