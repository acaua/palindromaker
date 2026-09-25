// A rate limit as the UI needs it: how long to hold the retry and the
// absolute time it releases. The absolute deadline is optional because a
// caller may only remember the cooldown length.
export interface ThrottleInfo {
  cooldownSeconds: number;
  retryAt?: number;
}
