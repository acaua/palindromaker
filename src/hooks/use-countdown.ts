import { useEffect, useState } from "react";

export const useCountdown = (seconds: number, deadline?: number): number => {
  const [remaining, setRemaining] = useState(() =>
    deadline === undefined ? seconds : Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((left) => (left <= 0 ? 0 : left - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return remaining;
};
