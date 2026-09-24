export type ExploreSearch = {
  account?: string;
};

export const validateExploreSearch = (search: Record<string, unknown>): ExploreSearch => {
  if (typeof search.account !== "string") return {};
  return { account: search.account };
};
