import { useI18n } from "@/hooks/use-i18n";
import { useCountdown } from "@/hooks/use-countdown";
import { retryIn } from "@/lib/i18n";

export interface RetryLineProps {
  message: string;
  tone: "warn" | "error";
  onRetry: () => void;
  retryLabel: string;
  disabled?: boolean;
}

export const RetryLine = ({
  message,
  tone,
  onRetry,
  retryLabel,
  disabled = false,
}: RetryLineProps) => (
  <p role="status" className={`text-sm ${tone === "warn" ? "text-amber-700" : "text-red-700"}`}>
    {message}{" "}
    <button
      type="button"
      onClick={onRetry}
      disabled={disabled}
      className="cursor-pointer underline disabled:cursor-not-allowed"
    >
      {retryLabel}
    </button>
  </p>
);

export const ThrottledRetry = ({
  onRetry,
  cooldown,
  retryAt,
}: {
  onRetry: () => void;
  cooldown: number;
  retryAt?: number;
}) => {
  const { lang, t } = useI18n();
  const remaining = useCountdown(cooldown, retryAt);
  return (
    <RetryLine
      message={t("explore.rateLimited")}
      tone="warn"
      onRetry={onRetry}
      retryLabel={remaining > 0 ? retryIn(lang, remaining) : t("explore.retry")}
      disabled={remaining > 0}
    />
  );
};
