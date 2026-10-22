"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiUrl, type RunOut, useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Leaderboard" },
  { href: "/checklist", label: "Capability checklist" },
  { href: "/samples", label: "Samples" },
  { href: "/runs", label: "Runs" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { run, config, set, href } = useUrlState();
  const { data: runs } = useApi<RunOut[]>(apiUrl("/api/runs"));
  const latest = runs?.slice().sort((a, b) => Number(a.is_demo) - Number(b.is_demo))[0];
  const current = runs?.find((r) => r.id === run) ?? latest;

  return (
    <header className="border-b border-rule bg-sheet">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-8 gap-y-3 px-6 pt-4">
        <Link href={href("/")} className="flex items-baseline gap-2 rounded-sm focus-visible:outline-2">
          <span className="text-h3 font-semibold tracking-tight text-ink">Niera</span>
          <span className="text-h3 text-graphite">OCR benchmark</span>
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-caption text-pencil">
            Run
            <Select value={current?.id ?? ""} onValueChange={(v) => set({ run: v === latest?.id ? null : v })}>
              <SelectTrigger size="sm" className="min-w-56 bg-sheet text-body" aria-label="Run">
                <SelectValue placeholder="Loading runs…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {runs?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.is_demo ? "Demo data" : r.id} ({fmtDate(r.created_at)})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center gap-2 text-caption text-pencil">
            <span id="config-label">Settings</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={config}
              onValueChange={(v) => v && set({ config: v })}
              aria-labelledby="config-label"
            >
              <ToggleGroupItem value="default" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">
                Library defaults
              </ToggleGroupItem>
              <ToggleGroupItem value="full" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">
                All stages on
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      <nav aria-label="Sections" className="mx-auto mt-3 flex max-w-[1360px] gap-1 overflow-x-auto px-4">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" || pathname.startsWith("/models") : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={href(item.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 rounded-t-sm px-3 pt-1 pb-2.5 text-body text-pencil transition-colors hover:text-graphite focus-visible:outline-2",
                active && "font-semibold text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
