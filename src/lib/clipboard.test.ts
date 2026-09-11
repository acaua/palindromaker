import { describe, expect, test } from "vite-plus/test";

import { clipboardOrNull, copyText } from "@/lib/clipboard";

describe("clipboardOrNull", () => {
  test("is null without a browser global", () => {
    // node project: no navigator at all
    expect(clipboardOrNull()).toBeNull();
  });
});

describe("copyText", () => {
  test("writes through to the writer", async () => {
    const written: string[] = [];
    const writer = {
      writeText: async (text: string) => {
        written.push(text);
      },
    };
    await expect(copyText(writer, "Anita lava la tina")).resolves.toBe(true);
    expect(written).toEqual(["Anita lava la tina"]);
  });

  test("survives a rejection", async () => {
    const writer = {
      writeText: async () => {
        throw new Error("permission denied");
      },
    };
    await expect(copyText(writer, "hello")).resolves.toBe(false);
  });

  test("is false without a writer", async () => {
    await expect(copyText(null, "hello")).resolves.toBe(false);
  });
});
