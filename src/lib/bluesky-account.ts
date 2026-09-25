const HANDLE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const PLC_DID = /^did:plc:[a-z2-7]{24}$/;
const WEB_PREFIX = "did:web:";
const RESERVED_TLDS = new Set([
  "alt",
  "arpa",
  "example",
  "internal",
  "invalid",
  "local",
  "localhost",
  "onion",
  "test",
]);

export const isHandleAccount = (value: string): boolean => HANDLE.test(value);

export const isDidAccount = (value: string): boolean => {
  if (PLC_DID.test(value)) return true;
  if (!value.startsWith(WEB_PREFIX)) return false;
  const host = value.slice(WEB_PREFIX.length);
  return (
    host === host.toLowerCase() &&
    isHandleAccount(host) &&
    !RESERVED_TLDS.has(host.split(".").at(-1) ?? "")
  );
};

const actorFromProfileUrl = (value: string): string | null => {
  const candidate = /^(?:www\.)?bsky\.app\//i.test(value) ? `https://${value}` : value;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.hostname !== "bsky.app" && url.hostname !== "www.bsky.app") return null;
    const match = /^\/profile\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) return null;
    const actor = decodeURIComponent(match[1]);
    return actor.includes("/") ? null : actor;
  } catch {
    return null;
  }
};

export const normalizeAccount = (input: string): string | null => {
  const value = input.trim();
  if (value === "") return null;
  const profileUrl = /^(?:www\.)?bsky\.app\//i.test(value) ? `https://${value}` : value;
  const candidate = value.startsWith("@")
    ? value.slice(1)
    : (actorFromProfileUrl(profileUrl) ?? value);
  if (isDidAccount(candidate)) return candidate;
  if (!isHandleAccount(candidate)) return null;
  return candidate.toLowerCase();
};
