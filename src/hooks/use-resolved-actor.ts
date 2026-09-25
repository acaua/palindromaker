import { useBlueskyHandle } from "@/hooks/use-bluesky-handle";
import { isDidAccount } from "@/lib/bluesky-account";

// The one handle-or-DID resolution: a DID is its own answer, a handle goes
// through the shared handle Query. `resolvedActor` is null until a handle
// resolves, and stays null when it fails, so callers gate on it directly.
export const useResolvedActor = (actor: string | null) => {
  const handle = actor !== null && !isDidAccount(actor) ? actor : null;
  const identity = useBlueskyHandle(handle);
  const resolvedActor =
    actor !== null && isDidAccount(actor)
      ? actor
      : identity.isError
        ? null
        : (identity.data ?? null);
  return { handle, identity, resolvedActor };
};
