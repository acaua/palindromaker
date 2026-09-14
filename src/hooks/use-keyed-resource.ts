import { useCallback, useEffect, useRef, useState } from "react";

// A keyed async load: when `key` changes (or retry is called), run `load`
// and keep its result. A load that finishes after the key changed is
// dropped. A null key loads nothing (idle). The caller supplies the shape
// of the three non-answers, so `state` is always the caller's own outcome
// type — the guard lives here, the vocabulary stays with the caller. This
// is the one shape every keyed reader shares: the dictionaries, the post
// and the search.
export type ResourceFallbacks<S> = {
  // the caller's own loading/error (and optional idle) states; a null key
  // is idle, which falls back to `loading` when the caller has no idle
  loading: S;
  error: S;
  idle?: S;
};

export function useKeyedResource<S>(
  key: string | null,
  load: () => Promise<S>,
  fallbacks: ResourceFallbacks<S>,
): { state: S; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; value: S } | null>(null);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const fullKey = key === null ? null : `${key}#${attempt}`;

  // the callbacks are read through refs so a caller that re-creates them
  // each render cannot restart the load; the key carries the identity
  const latestRef = useRef({ load, fallbacks });
  useEffect(() => {
    latestRef.current = { load, fallbacks };
  });

  useEffect(() => {
    if (fullKey === null) return;
    let active = true;
    void latestRef.current.load().then(
      (value) => {
        if (active) setOutcome({ key: fullKey, value });
      },
      () => {
        if (active) setOutcome({ key: fullKey, value: latestRef.current.fallbacks.error });
      },
    );
    return () => {
      active = false;
    };
  }, [fullKey]);

  if (fullKey === null) return { state: fallbacks.idle ?? fallbacks.loading, retry };
  if (outcome?.key === fullKey) return { state: outcome.value, retry };
  return { state: fallbacks.loading, retry };
}
