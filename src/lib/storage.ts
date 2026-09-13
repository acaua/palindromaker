// The one module that touches the global storage object. Everything that
// reads or writes localStorage takes the value from here instead of
// reaching for the global itself, so tests can inject their own — and so a
// browser that blocks site storage cannot take the app down before it
// renders.
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

// the browser's localStorage, or null when it cannot be used. Reading
// window.localStorage *throws* (rather than returning null) when the
// browser blocks site storage — inside an iframe, or with cookies
// disabled — so every call site goes through here.
export const localStorageOrNull = (): StorageLike | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

// the raw stored string, or null when storage is unavailable, the key is
// absent, or reading it fails
export const readRaw = (storage: Pick<Storage, "getItem"> | null, key: string): string | null => {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

// reads and parses a stored value; undefined when there is nothing to read
// or the value is not JSON — callers fall back to their own defaults
export const readJson = (storage: Pick<Storage, "getItem"> | null, key: string): unknown => {
  const raw = readRaw(storage, key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};
