import { prefsFor } from "@/lib/prefs";
import type { PrefsStore } from "@/lib/prefs";
import { localStorageOrNull } from "@/lib/storage";
import type { StorageLike } from "@/lib/storage";

// The runtime owner of preferences: one store for the whole page, so no
// component pairs localStorageOrNull() with the codec itself and every
// write goes through the same binding. The codec (src/lib/prefs.ts) stays
// pure and storage-injectable; this module holds the one mutable store —
// `initPrefs` is the seam tests and the editor session use to bind their
// own storage, `prefsStore` the lazy default.
let shared: PrefsStore | null = null;

export const initPrefs = (storage: StorageLike | null): PrefsStore => (shared = prefsFor(storage));

export const prefsStore = (): PrefsStore => (shared ??= prefsFor(localStorageOrNull()));
