export type Json = Record<string, unknown>;

export const asRecord = (value: unknown): Json | null =>
  typeof value === "object" && value !== null ? (value as Json) : null;

export const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
