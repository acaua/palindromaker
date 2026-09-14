# Documents live in the browser, not on a server

The editor has no backend: the working document and the preferences live in `localStorage`, saved debounced and flushed on unload/tab-hide. That keeps the app a static Cloudflare Worker with nothing to run or operate, but the document is per-origin and per-browser — no sync, and a cleared profile loses it. Adding a server later means migrating data that only ever existed on the client, so this is the app's least reversible choice.
