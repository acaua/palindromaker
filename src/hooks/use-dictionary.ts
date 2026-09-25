import { useQuery } from "@tanstack/react-query";

import { loadDictionary } from "@/lib/dictionary";
import type { Dictionary, Language } from "@/lib/dictionary";
import { dictionaryKey } from "@/queries/query-keys";

export type DictionaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; dictionary: Dictionary }
  | { status: "error"; retry: () => void };

export const useDictionary = (language: Language, enabled: boolean): DictionaryState => {
  const query = useQuery<Dictionary>({
    queryKey: dictionaryKey(language),
    enabled,
    queryFn: ({ signal }) => loadDictionary(language, signal),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const retry = () => {
    void query.refetch();
  };

  if (!enabled) return { status: "idle" };
  if (query.isPending || (query.isError && query.isFetching)) return { status: "loading" };
  if (query.isError) return { status: "error", retry };
  return { status: "ready", dictionary: query.data };
};
