"use client";

import Link from "next/link";
import { PlatformTag, ScoreCell, Tip } from "@/components/marks";
import { DemoNotice, LoadError, LoadingBlock, Page } from "@/components/page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiUrl, type CategoryOut, type LeaderboardRow, type Overview, useApi } from "@/lib/api";
import { CATEGORY_SHORT, fmtMB, fmtMs, fmtScore } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const GATE = {
  pass: { glyph: "✓", label: "No invented text on blank or text-free inputs", className: "text-ink" },
  flagged: { glyph: "✗", label: "Flagged: invented text or looped on R01–R03", className: "text-redpen" },
  untested: { glyph: "–", label: "Not tested yet", className: "text-faint" },
} as const;

type Href = (p: string, e?: Record<string, string>) => string;

export function LeaderboardView() {
  const { run, config, params, set, href } = useUrlState();
  const all = params.get("cols") === "all";
  const { data, error, isLoading } = useApi<Overview>(apiUrl("/api/overview", { run_id: run, config }));

  if (error) return <Page title="Leaderboard"><LoadError error={error} /></Page>;
  if (isLoading || !data) return <Page title="Leaderboard"><LoadingBlock rows={12} /></Page>;

  const focus = data.categories.filter((c) => c.focus);
  const other = all ? data.categories.filter((c) => !c.focus) : [];
  const ranked = data.rows.filter((r) => r.rank != null);
  const unranked = data.rows.filter((r) => r.rank == null && r.model.status === "tested");
  const pending = data.rows.filter((r) => r.model.status !== "tested");
  const leader = ranked[0];
  const colCount = 3 + focus.length + other.length + (all ? 5 : 3);

  return (
    <Page
      title="Which model reads Niera's pages best?"
      lead={
        leader ? (
          <>
            <Link href={href("/models", { id: leader.model.id })} className="font-semibold text-ink underline-offset-4 hover:underline">
              {leader.model.name}
            </Link>{" "}
            leads, averaging <span className="tabular font-semibold text-graphite">{fmtScore(leader.focus_score)}</span> of 100
            on handwriting, handwritten formulas and diagram labels.
          </>
        ) : (
          "No model covers all three focus areas yet."
        )
      }
    >
      <DemoNotice run={data.run} />

      <section aria-labelledby="board-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="board-title" className="text-body text-pencil">
            {ranked.length} ranked, {unranked.length} specialist, {pending.length} waiting. Click a model for everything we
            collected from it.
          </h2>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={all ? "all" : "key"}
            onValueChange={(v) => v && set({ cols: v === "all" ? "all" : null })}
            aria-label="Columns"
          >
            <ToggleGroupItem value="key" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">Key stats</ToggleGroupItem>
            <ToggleGroupItem value="all" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">All columns</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="overflow-hidden rounded-lg border border-rule">
          <Table className="text-body">
            <TableHeader className="bg-muted/60 [&_th]:h-11 [&_th]:whitespace-normal [&_th]:text-caption [&_th]:leading-tight">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-4 text-center font-normal text-pencil">#</TableHead>
                <TableHead className="w-56 font-normal text-pencil">Model</TableHead>
                <TableHead className="text-right">
                  <Tip label="Focus average" tip="Mean of the three focus areas, 0–100. This decides the rank." strong />
                </TableHead>
                {focus.map((c) => (
                  <TableHead key={c.id} className="text-right">
                    <CatTip c={c} />
                  </TableHead>
                ))}
                {other.map((c, i) => (
                  <TableHead key={c.id} className={cn("text-right", i === 0 && "border-l border-rule")}>
                    <CatTip c={c} muted />
                  </TableHead>
                ))}
                <TableHead className="border-l border-rule text-right">
                  <Tip label="Capability" tip="Weighted share of checklist stages passed in our tests (H = 3, M = 2, L = 1, partial = half). Never overrides accuracy." muted />
                </TableHead>
                {all && (
                  <TableHead className="text-center">
                    <Tip label="Hallucination" tip="Gate on R01–R03: blank pages, photos with no text, repetition loops." muted />
                  </TableHead>
                )}
                <TableHead className="text-right">
                  <Tip label="Median time" tip="Median time per sample after warm-up. Compare only within one machine: M4 CPU and Colab T4 differ." muted />
                </TableHead>
                {all && (
                  <TableHead className="text-right">
                    <Tip label="p95 time" tip="The slowest 5% of samples took at least this long." muted />
                  </TableHead>
                )}
                <TableHead className="pr-4 text-right">
                  <Tip label="Peak memory" tip="Highest memory seen while reading one sample." muted />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((r) => <BoardRow key={r.model.id} row={r} focus={focus} other={other} all={all} href={href} />)}
              {unranked.length > 0 && <GroupRow colSpan={colCount} title="Specialists, not ranked" note="They cover fewer than three focus areas, so compare them per column." />}
              {unranked.map((r) => <BoardRow key={r.model.id} row={r} focus={focus} other={other} all={all} href={href} />)}
              {pending.length > 0 && <GroupRow colSpan={colCount} title="Baseline" note="Scored the same way once its outputs arrive." />}
              {pending.map((r) => (
                <TableRow key={r.model.id} className="hover:bg-transparent">
                  <TableCell />
                  <TableCell className="font-semibold text-graphite">{r.model.name}</TableCell>
                  <TableCell colSpan={colCount - 2} className="whitespace-normal text-pencil">
                    Outputs not received yet.
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="how-title" className="grid gap-6 border-t border-rule pt-6 text-body text-pencil md:grid-cols-3">
        <h2 id="how-title" className="sr-only">How to read this table</h2>
        <p>
          <span className="font-semibold text-graphite">Rank</span> comes from accuracy alone: the average of the three focus
          columns. Higher is better. The combining rule still needs team sign-off before real results are scored.
        </p>
        <p>
          <span className="font-semibold text-graphite">Capability</span> counts checklist stages a model passed in our tests,
          not what its documentation claims.
        </p>
        <p>
          <span className="font-semibold text-graphite">Speed</span> sits next to the machine it ran on. PaddleOCR models run on
          the M4 CPU and the challengers on a Colab T4, so times only compare within one machine.
        </p>
      </section>
    </Page>
  );
}

function CatTip({ c, muted }: { c: CategoryOut; muted?: boolean }) {
  return (
    <Tip
      label={CATEGORY_SHORT[c.id] ?? c.label}
      tip={c.sample_count ? `${c.label}: ${c.metric}. ${c.sample_count} samples.` : `${c.label}: no samples collected yet.`}
      muted={muted}
    />
  );
}

function GroupRow({ colSpan, title, note }: { colSpan: number; title: string; note: string }) {
  return (
    <TableRow className="bg-muted/60 hover:bg-muted/60">
      <TableCell />
      <TableCell colSpan={colSpan - 1} className="py-2 whitespace-normal text-caption">
        <span className="font-semibold text-graphite">{title}.</span> <span className="text-pencil">{note}</span>
      </TableCell>
    </TableRow>
  );
}

function BoardRow({ row, focus, other, all, href }: { row: LeaderboardRow; focus: CategoryOut[]; other: CategoryOut[]; all: boolean; href: Href }) {
  const byCat = Object.fromEntries(row.scores.map((s) => [s.category, s]));
  const gate = GATE[row.hallucination_gate as keyof typeof GATE] ?? GATE.untested;
  const link = href("/models", { id: row.model.id });
  return (
    <TableRow className="group">
      <TableCell className="pl-4 text-center text-h4 font-semibold text-ink tabular">{row.rank ?? ""}</TableCell>
      <TableCell>
        <Link href={link} className="font-semibold text-graphite underline-offset-4 group-hover:text-ink hover:underline focus-visible:outline-2">
          {row.model.name}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-pencil">
          <PlatformTag platform={row.model.platform} />
          {row.model.params && <span>{row.model.params}</span>}
          {row.errors > 0 && <span className="text-redpen">{row.errors} failed</span>}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {row.rank != null ? (
          <ScoreCell value={row.focus_score} strong />
        ) : (
          <span className="text-caption text-pencil">
            {row.model.kind === "layout" ? "Layout only" : `${row.focus_coverage} of 3 areas`}
          </span>
        )}
      </TableCell>
      {focus.map((c) => (
        <TableCell key={c.id} className="text-right">
          <ScoreCell value={byCat[c.id]?.score} />
        </TableCell>
      ))}
      {other.map((c, i) => (
        <TableCell key={c.id} className={cn("text-right", i === 0 && "border-l border-rule")}>
          <ScoreCell value={byCat[c.id]?.score} naReason={byCat[c.id]?.n === 0 && row.model.covers.includes(c.id) ? "No samples yet" : undefined} />
        </TableCell>
      ))}
      <TableCell className="border-l border-rule text-right tabular text-graphite">{fmtScore(row.capability_score)}</TableCell>
      {all && (
        <TableCell className="text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span role="img" aria-label={gate.label} tabIndex={0} className={cn("font-semibold focus-visible:outline-2", gate.className)}>
                {gate.glyph}
              </span>
            </TooltipTrigger>
            <TooltipContent>{gate.label}</TooltipContent>
          </Tooltip>
        </TableCell>
      )}
      <TableCell className="text-right tabular text-graphite">{fmtMs(row.p50_ms)}</TableCell>
      {all && <TableCell className="text-right tabular text-pencil">{fmtMs(row.p95_ms)}</TableCell>}
      <TableCell className="pr-4 text-right tabular text-graphite">{fmtMB(row.peak_mem_mb)}</TableCell>
    </TableRow>
  );
}
