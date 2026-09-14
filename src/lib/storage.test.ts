import { afterEach, describe, expect, test } from "vite-plus/test";

import { MemoryStorage } from "@/test/storages";
import { localStorageOrNull } from "./storage";

describe("localStorageOrNull", () => {
  const defineLocalStorage = (descriptor: PropertyDescriptor) =>
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      ...descriptor,
    });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  test("returns null when there is no localStorage", () => {
    expect(localStorageOrNull()).toBeNull();
  });

  test("returns null when the browser blocks site storage", () => {
    // Chrome and Safari throw on *access* when storage is blocked; without
    // this guard the exception escapes before the app renders
    defineLocalStorage({
      get() {
        throw new Error("SecurityError");
      },
    });

    expect(localStorageOrNull()).toBeNull();
  });

  test("returns the storage when it is available", () => {
    const storage = new MemoryStorage();
    defineLocalStorage({ value: storage });

    expect(localStorageOrNull()).toBe(storage);
  });
});
