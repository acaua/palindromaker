type SharedEntry<T> = {
  promise: Promise<T>;
  controller: AbortController;
  consumers: Set<symbol>;
  cancelTimer: ReturnType<typeof setTimeout> | null;
  settled: boolean;
};

const scopes = new WeakMap<object, Map<string, SharedEntry<unknown>>>();
const scopeEntries = new Set<{
  scope: object;
  requests: Map<string, SharedEntry<unknown>>;
}>();

const forgetScope = (scope: object, requests: Map<string, SharedEntry<unknown>>): void => {
  scopes.delete(scope);
  for (const entry of scopeEntries) {
    if (entry.requests === requests) scopeEntries.delete(entry);
  }
};

export const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ?? Object.assign(new Error("The operation was aborted"), { name: "AbortError" });

const withConsumerAbort = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(abortReason(signal));
    };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
    void promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
};

export const sharedRequest = <T>(
  scope: object,
  key: string,
  run: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> => {
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  const entryKey = key;
  let requests = scopes.get(scope);

  if (!requests) {
    requests = new Map();
    scopes.set(scope, requests);
    scopeEntries.add({ scope, requests });
  }
  let entry = requests.get(entryKey) as SharedEntry<T> | undefined;
  if (!entry) {
    const controller = new AbortController();
    let promise: Promise<T>;
    try {
      promise = Promise.resolve(run(controller.signal));
    } catch (error) {
      promise = Promise.reject(error);
    }
    entry = { promise, controller, consumers: new Set(), cancelTimer: null, settled: false };
    requests.set(entryKey, entry);
    const settle = () => {
      const currentEntry = entry!;
      currentEntry.settled = true;
      if (currentEntry.cancelTimer !== null) clearTimeout(currentEntry.cancelTimer);
      if (requests.get(entryKey) === currentEntry) {
        requests.delete(entryKey);
        if (requests.size === 0) {
          forgetScope(scope, requests);
        }
      }
      currentEntry.consumers.clear();
    };
    void promise.then(settle, settle);
  }

  const current = entry;
  const token = Symbol("shared-request-consumer");
  current.consumers.add(token);
  if (current.cancelTimer !== null) {
    clearTimeout(current.cancelTimer);
    current.cancelTimer = null;
  }

  const release = () => {
    if (!current.consumers.delete(token) || current.settled || current.consumers.size > 0) return;
    current.cancelTimer = setTimeout(() => {
      current.cancelTimer = null;
      if (current.settled || current.consumers.size > 0) return;
      if (requests.get(entryKey) === current) {
        requests.delete(entryKey);
        if (requests.size === 0) {
          forgetScope(scope, requests);
        }
      }
      current.controller.abort();
    }, 0);
  };

  if (signal) {
    if (signal.aborted) release();
    else signal.addEventListener("abort", release, { once: true });
  }

  return withConsumerAbort(current.promise, signal).finally(() => {
    if (signal) signal.removeEventListener("abort", release);
    release();
  });
};

export const clearSharedRequests = (): void => {
  for (const { scope, requests } of scopeEntries) {
    for (const entry of requests.values()) {
      if (entry.cancelTimer !== null) clearTimeout(entry.cancelTimer);
      if (!entry.settled) entry.controller.abort();
    }
    requests.clear();
    scopes.delete(scope);
  }
  scopeEntries.clear();
};
