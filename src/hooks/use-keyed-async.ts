import { useCallback, useEffect, useRef, useState } from "react";

// A keyed async load: when `key` changes (or retry is called), run `load`
// and keep its result. A load that finishes after the key changed is
// dropped. This is the shape both Bluesky readers share — one keyed
// outcome, one retry, one stale-response guard. A null key loads nothing.
export function useKeyedAsync<S>(
  key: string | null,
  load: () => Promise<S>,
  // what to store if the load rejects; the load is expected to handle its
  // own failure, so this is only a last-resort guard
  onError: () => S,
): { value: S | null; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; value: S } | null>(null);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const fullKey = key === null ? null : `${key}#${attempt}`;

  // the callbacks are read through refs so a caller that re-creates them
  // each render cannot restart the load; the key carries the identity
  const latestRef = useRef({ load, onError });
  useEffect(() => {
    latestRef.current = { load, onError };
  });

  useEffect(() => {
    if (fullKey === null) return;
    let active = true;
    void latestRef.current.load().then(
      (value) => {
        if (active) setOutcome({ key: fullKey, value });
      },
      () => {
        if (active) setOutcome({ key: fullKey, value: latestRef.current.onError() });
      },
    );
    return () => {
      active = false;
    };
  }, [fullKey]);

  return { value: fullKey !== null && outcome?.key === fullKey ? outcome.value : null, retry };
}
