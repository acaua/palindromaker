const SKELETON_KEYS = ["a", "b", "c", "d"];

export default function PostSkeletonGrid({
  label,
  itemClassName = "",
}: {
  label: string;
  itemClassName?: string;
}) {
  return (
    <>
      <span role="status" className="sr-only">
        {label}
      </span>
      <ul aria-hidden="true" className="grid list-none gap-3 p-0 sm:grid-cols-2">
        {SKELETON_KEYS.map((key) => (
          <li key={key} className={`animate-pulse rounded-xl bg-white/70 ${itemClassName}`} />
        ))}
      </ul>
    </>
  );
}
