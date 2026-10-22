"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type Config = "default" | "full";

/** Run and config live in the URL so every view can be shared as a link. */
export function useUrlState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const run = params.get("run");
  const config: Config = params.get("config") === "full" ? "full" : "default";

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "" || (k === "config" && v === "default")) next.delete(k);
        else next.set(k, v);
      }
      const q = next.toString();
      router.replace(`${pathname}${q ? `?${q}` : ""}`, { scroll: false });
    },
    [params, pathname, router],
  );

  /** Build a link to another page that keeps the current run and config. */
  const href = useCallback(
    (path: string, extra?: Record<string, string>) => {
      const q = new URLSearchParams();
      if (run) q.set("run", run);
      if (config !== "default") q.set("config", config);
      for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
      const s = q.toString();
      return `${path}${s ? `?${s}` : ""}`;
    },
    [run, config],
  );

  return { run, config, params, set, href };
}
