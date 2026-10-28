"use client";
// Hook compartido por SearchBox y FiltersPanel: reescribe la URL (replace,
// resetea page) para que el servidor re-consulte. Cliente porque usa
// useRouter/useSearchParams y debounce.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useCatalogParams(): {
  get: (key: string) => string;
  set: (patch: Record<string, string | undefined>) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const set = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(search.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, search],
  );

  return { get: (key: string) => search.get(key) ?? "", set };
}
