import { useEffect, useState } from "react";

// Whole seconds left, counting down from `seconds` on mount and flooring
// at zero. Mount-fresh by design: the caller renders it only while the
// cooldown applies, so every episode starts over with no reset logic. A
// single interval ticks it down; React bails out once it floors. Backs a
// retry button off a throttle instead of firing straight into it.
export const useCountdown = (seconds: number): number => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((left) => (left <= 0 ? 0 : left - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return remaining;
};
