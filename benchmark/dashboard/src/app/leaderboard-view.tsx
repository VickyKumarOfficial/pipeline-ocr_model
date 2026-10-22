"use client";

import Link from "next/link";
import { PlatformTag, ScoreCell } from "@/components/marks";
import { DemoNotice, LoadError, LoadingBlock, Page } from "@/components/page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiUrl, type LeaderboardRow, type Overview, useApi } from "@/lib/api";
import { CATEGORY_SHORT, fmtMB, fmtMs, fmtScore } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const GATE = {
  pass: { glyph: "✓", label: "No invented text on blank or text-free inputs", className: "text-ink" },
  flagged: { glyph: "✗", label: "Flagged: invented text or looped on R01–R03", className: "text-redpen" },
  untested: { glyph: "–", label: "Not tested yet", className: "text-faint" },
} as const;

export function LeaderboardView() {
  const { run, config, href } = useUrlState();
  const { data, error, isLoading } = useApi<Overview>(apiUrl("/api/overview", { run_id: run, config }));

  if (error) return <Page title="Leaderboard"><LoadError error={error} /></Page>;
  if (isLoading || !data) return <Page title="Leaderboard"><LoadingBlock rows={12} /></Page>;

  const focus = data.categories.filter((c) => c.focus);
  const other = data.categories.filter((c) => !c.focus);
  const ranked = data.rows.filter((r) => r.rank != null);
  const unranked = data.rows.filter((r) => r.rank == null && r.model.status === "tested");
  const pending = data.rows.filter((r) => r.model.status !== "tested");
  const leader = ranked[0];
  const colCount = 3 + focus.length + other.length + 4;

  return (
    <Page
      title="Which model reads Niera's pages best?"
      lead={
        leader ? (
          <>
            <Link href={href("/models", { id: leader.model.id })} className="font-semibold text-ink underline-offset-4 hover:underline">
              {leader.model.name}
            </Link>{" "}
            leads on the three focus areas: handwriting, handwritten formulas and diagram labels, with an average of{" "}
            <span className="tabular font-semibold text-graphite">{fmtScore(leader.focus_score)}</span> out of 100.
          </>
        ) : (
          "No model covers all three focus areas yet."
        )
      }
    >
      <DemoNotice run={data.run} />

      <section aria-labelledby="board-title" className="rounded-lg border border-rule bg-sheet">
        <h2 id="board-title" className="sr-only">Leaderboard</h2>
        <Table className="text-body">
          <TableHeader className="[&_th]:whitespace-normal [&_th]:leading-tight">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14 border-r border-margin-line text-center text-caption font-normal text-pencil">Rank</TableHead>
              <TableHead className="w-52 text-caption font-normal text-pencil">Model</TableHead>
              <TableHead className="text-right">
                <HeaderTip label="Focus average" tip="Mean of the three focus areas. This decides the rank." strong />
              </TableHead>
              {focus.map((c) => (
                <TableHead key={c.id} className="text-right">
                  <HeaderTip label={CATEGORY_SHORT[c.id] ?? c.label} tip={`${c.label}: ${c.metric}. ${c.sample_count} samples.`} />
                </TableHead>
              ))}
              {other.map((c, i) => (
                <TableHead key={c.id} className={cn("text-right", i === 0 && "border-l border-rule")}>
                  <HeaderTip
                    label={CATEGORY_SHORT[c.id] ?? c.label}
                    tip={c.sample_count ? `${c.label}: ${c.metric}. ${c.sample_count} samples.` : `${c.label}: no samples collected yet.`}
                    muted
                  />
                </TableHead>
              ))}
              <TableHead className="border-l border-rule text-right">
                <HeaderTip label="Capability" tip="Weighted share of checklist stages passed (H = 3, M = 2, L = 1, partial = half)." muted />
              </TableHead>
              <TableHead className="text-center">
                <HeaderTip label="Hallucination" tip="Gate on R01–R03: blank pages, photos with no text, repetition loops." muted />
              </TableHead>
              <TableHead className="text-right">
                <HeaderTip label="Median time" tip="Median seconds per sample after warm-up; p95 is the slowest 5%. Compare only within one machine: M4 CPU and Colab T4 differ." muted />
              </TableHead>
              <TableHead className="text-right">
                <HeaderTip label="Peak memory" tip="Highest memory seen while reading one sample." muted />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((r) => (
              <BoardRow key={r.model.id} row={r} focus={focus.map((c) => c.id)} other={other.map((c) => c.id)} href={href} />
            ))}
            {unranked.length > 0 && (
              <GroupRow colSpan={colCount} title="Not ranked" note="These cover fewer than three focus areas, so they are compared per column only." />
            )}
            {unranked.map((r) => (
              <BoardRow key={r.model.id} row={r} focus={focus.map((c) => c.id)} other={other.map((c) => c.id)} href={href} />
            ))}
            {pending.length > 0 && <GroupRow colSpan={colCount} title="Baseline" note="Scored the same way once its outputs arrive." />}
            {pending.map((r) => (
              <TableRow key={r.model.id} className="hover:bg-transparent">
                <TableCell className="border-r border-margin-line" />
                <TableCell className="font-semibold text-graphite">{r.model.name}</TableCell>
                <TableCell colSpan={colCount - 2} className="whitespace-normal text-pencil">
                  Outputs not received yet. {r.model.summary}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section aria-labelledby="how-title" className="grid gap-6 text-body text-pencil md:grid-cols-3">
        <h2 id="how-title" className="sr-only">How to read this table</h2>
        <p>
          <span className="font-semibold text-graphite">Rank</span> comes from accuracy alone: the average of the three focus
          columns. Scores are 0–100, higher is better. The rule for combining them still needs team sign-off before real results
          are scored.
        </p>
        <p>
          <span className="font-semibold text-graphite">Capability</span> counts checklist stages a model passed in our tests,
          not what its documentation claims. It never overrides accuracy.
        </p>
        <p>
          <span className="font-semibold text-graphite">Speed</span> is shown next to the machine it ran on. PaddleOCR models
          run on the M4 CPU and the challengers on a Colab T4, so times only compare within one machine.
        </p>
      </section>
    </Page>
  );
}

function GroupRow({ colSpan, title, note }: { colSpan: number; title: string; note: string }) {
  return (
    <TableRow className="bg-paper hover:bg-paper">
      <TableCell className="border-r border-margin-line" />
      <TableCell colSpan={colSpan - 1} className="py-2.5 whitespace-normal">
        <span className="font-semibold text-graphite">{title}</span>
        <span className="ml-2 text-pencil">{note}</span>
      </TableCell>
    </TableRow>
  );
}

function HeaderTip({ label, tip, strong, muted }: { label: string; tip: string; strong?: boolean; muted?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "cursor-help border-b border-dotted border-faint text-caption focus-visible:outline-2",
            strong ? "font-semibold text-graphite" : muted ? "font-normal text-pencil" : "font-medium text-graphite",
          )}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{tip}</TooltipContent>
    </Tooltip>
  );
}

function BoardRow({ row, focus, other, href }: { row: LeaderboardRow; focus: string[]; other: string[]; href: (p: string, e?: Record<string, string>) => string }) {
  const byCat = Object.fromEntries(row.scores.map((s) => [s.category, s]));
  const gate = GATE[row.hallucination_gate as keyof typeof GATE] ?? GATE.untested;
  return (
    <TableRow className="group">
      <TableCell className="border-r border-margin-line text-center text-h3 font-semibold text-ink tabular">
        {row.rank ?? ""}
      </TableCell>
      <TableCell>
        <Link
          href={href("/models", { id: row.model.id })}
          className="font-semibold text-graphite underline-offset-4 group-hover:text-ink hover:underline focus-visible:outline-2"
        >
          {row.model.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-pencil">
          <PlatformTag platform={row.model.platform} />
          {row.model.params && <span>{row.model.params}</span>}
          {row.errors > 0 && <span className="text-redpen">{row.errors} failed</span>}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {row.rank != null ? (
          <ScoreCell value={row.focus_score} strong />
        ) : (
          <span className="text-caption text-pencil">{row.focus_coverage} of 3 areas</span>
        )}
      </TableCell>
      {focus.map((id) => (
        <TableCell key={id} className="text-right">
          <ScoreCell value={byCat[id]?.score} />
        </TableCell>
      ))}
      {other.map((id, i) => (
        <TableCell key={id} className={cn("text-right", i === 0 && "border-l border-rule")}>
          <ScoreCell value={byCat[id]?.score} naReason={byCat[id]?.n === 0 && row.model.covers.includes(id) ? "No samples yet" : undefined} />
        </TableCell>
      ))}
      <TableCell className="border-l border-rule text-right tabular text-graphite">{fmtScore(row.capability_score)}</TableCell>
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
      <TableCell className="text-right tabular">
        <div className="text-graphite">{fmtMs(row.p50_ms)}</div>
        <div className="text-caption text-pencil">p95 {fmtMs(row.p95_ms)}</div>
      </TableCell>
      <TableCell className="text-right tabular text-graphite">{fmtMB(row.peak_mem_mb)}</TableCell>
    </TableRow>
  );
}
