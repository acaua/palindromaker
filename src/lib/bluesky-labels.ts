import { isDidAccount } from "@/lib/bluesky-account";

type Json = Record<string, unknown>;

const asRecord = (value: unknown): Json | null =>
  typeof value === "object" && value !== null ? (value as Json) : null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const labelTimestamp = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const MALFORMED_LABEL = "!malformed-label";

type LabelGroup = {
  name: string;
  positives: number[];
  negatives: number[];
  untrustedPositive: boolean;
};

export const activeLabels = (
  value: unknown,
  subjectUris: string | readonly string[],
  subjectCid: string,
): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return [MALFORMED_LABEL];
  const subjects = typeof subjectUris === "string" ? [subjectUris] : subjectUris;
  const groups = new Map<string, LabelGroup>();
  let malformed = false;
  for (const entry of value) {
    const label = asRecord(entry);
    const name = asString(label?.val);
    if (!label || !name) {
      malformed = true;
      continue;
    }
    const labelUri = asString(label?.uri);
    const labelCid = asString(label?.cid);
    if (labelUri !== undefined && !subjects.includes(labelUri)) continue;
    const subjectCidKnown = subjectCid !== "";
    if (subjectCidKnown && labelCid !== undefined && labelCid !== subjectCid) continue;
    const expiration = label?.exp;
    const expirationTimestamp = labelTimestamp(expiration);
    if (expirationTimestamp !== null && expirationTimestamp <= Date.now()) continue;
    const timestamp = labelTimestamp(label?.cts);
    const source = asString(label?.src);
    const metadataValid =
      timestamp !== null &&
      source !== undefined &&
      isDidAccount(source) &&
      labelUri !== undefined &&
      subjects.includes(labelUri) &&
      (labelCid === undefined || !subjectCidKnown || labelCid === subjectCid) &&
      (expiration === undefined || expirationTimestamp !== null);
    const subject = labelUri ?? subjects[0] ?? "";
    const key = `${subject}\u0000${source ?? ""}\u0000${name}\u0000${labelCid ?? ""}`;
    const group = groups.get(key) ?? {
      name,
      positives: [],
      negatives: [],
      untrustedPositive: false,
    };

    if (label?.neg === true) {
      if (metadataValid && timestamp !== null) group.negatives.push(timestamp);
    } else if (metadataValid && timestamp !== null) {
      group.positives.push(timestamp);
    } else {
      group.untrustedPositive = true;
    }
    groups.set(key, group);
  }

  const active: string[] = [];
  for (const group of groups.values()) {
    const latestPositive = group.positives.length > 0 ? Math.max(...group.positives) : -Infinity;
    const cleared =
      !group.untrustedPositive && group.negatives.some((timestamp) => timestamp > latestPositive);
    if (!cleared) active.push(group.name);
  }
  if (malformed) active.push(MALFORMED_LABEL);
  return active;
};

export const recordLabelValues = (value: unknown): string[] => {
  if (value === undefined) return [];
  const record = asRecord(value);
  const values = record?.values;
  if (!record || !Array.isArray(values)) return [MALFORMED_LABEL];
  const labels: string[] = [];
  let malformed = false;
  for (const value of values) {
    if (typeof value === "string" && value) labels.push(value);
    else {
      const label = asString(asRecord(value)?.val);
      if (label) labels.push(label);
      else malformed = true;
    }
  }
  if (malformed) labels.push(MALFORMED_LABEL);
  return labels;
};

export interface AuthorLabelValues {
  accountLabels: readonly string[];
  profileLabels: readonly string[];
}

export const authorLabelValues = (value: unknown, did: string): AuthorLabelValues => {
  const profileUri = `at://${did}/app.bsky.actor.profile/self`;
  return {
    accountLabels: activeLabels(value, [did, `at://${did}`], ""),
    profileLabels: activeLabels(value, profileUri, ""),
  };
};
