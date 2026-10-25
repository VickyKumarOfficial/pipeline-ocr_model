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
  { href: "/", label: "Leaderboard", match: (p: string) => p === "/" || p.startsWith("/models") },
  { href: "/outputs", label: "Outputs", match: (p: string) => p.startsWith("/outputs") || p.startsWith("/samples") },
  { href: "/checklist", label: "Checklist", match: (p: string) => p.startsWith("/checklist") },
  { href: "/runs", label: "Runs", match: (p: string) => p.startsWith("/runs") },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { run, config, set, href } = useUrlState();
  const { data: runs } = useApi<RunOut[]>(apiUrl("/api/runs"));
  const latest = runs?.slice().sort((a, b) => Number(a.is_demo) - Number(b.is_demo))[0];
  const current = runs?.find((r) => r.id === run) ?? latest;

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-sheet/95 backdrop-blur supports-[backdrop-filter]:bg-sheet/85">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-2 px-6 py-3">
        <Link href={href("/")} className="rounded-sm text-h4 font-semibold text-graphite focus-visible:outline-2">
          Niera <span className="font-normal text-pencil">OCR benchmark</span>
        </Link>

        <nav aria-label="Sections" className="-mx-2 flex gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={href(item.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-body text-pencil transition-colors hover:bg-muted hover:text-graphite focus-visible:outline-2",
                  active && "bg-ink-wash font-semibold text-ink hover:bg-ink-wash hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={current?.id ?? ""} onValueChange={(v) => set({ run: v === latest?.id ? null : v })}>
            <SelectTrigger size="sm" className="min-w-52 bg-sheet text-body" aria-label="Run">
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
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={config}
            onValueChange={(v) => v && set({ config: v })}
            aria-label="Pipeline settings"
          >
            <ToggleGroupItem value="default" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">
              Defaults
            </ToggleGroupItem>
            <ToggleGroupItem value="full" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">
              All stages on
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </header>
  );
}
