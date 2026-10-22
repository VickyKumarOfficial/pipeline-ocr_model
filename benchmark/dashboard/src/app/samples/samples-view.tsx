"use client";

import Link from "next/link";
import { useState } from "react";
import { PlatformTag } from "@/components/marks";
import { DemoNotice, LoadError, LoadingBlock, Page } from "@/components/page";
import { RedPenDiff, RedPenLegend } from "@/components/red-pen-diff";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiUrl, mediaUrl, type Overview, type PredictionOut, type SampleDetail, type SampleListItem, useApi } from "@/lib/api";
import { CATEGORY_SHORT, fmtMB, fmtMs, fmtScore } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

export function SamplesView() {
  const { params } = useUrlState();
  const id = params.get("id");
  return id ? <SampleDetailView id={id} /> : <SampleList />;
}

function SampleList() {
  const { run, config, params, set, href } = useUrlState();
  const category = params.get("category");
  const { data, error, isLoading } = useApi<SampleListItem[]>(apiUrl("/api/samples", { run_id: run, config, category }));
  const { data: overview } = useApi<Overview>(apiUrl("/api/overview", { run_id: run, config }));
  const cats = overview?.categories.filter((c) => c.sample_count > 0) ?? [];

  return (
    <Page
      title="Samples"
      lead="Every input in the run. Open one to see each model's output marked against the ground truth."
      aside={
        <label className="flex items-center gap-2 text-caption text-pencil">
          Category
          <Select value={category ?? "all"} onValueChange={(v) => set({ category: v === "all" ? null : v })}>
            <SelectTrigger size="sm" className="min-w-48 bg-sheet text-body" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All categories</SelectItem>
                {cats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label} ({c.sample_count})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>
      }
    >
      <DemoNotice run={overview?.run} />
      {error ? (
        <LoadError error={error} />
      ) : isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <ul className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map(({ sample, best_score, worst_score }) => (
            <li key={sample.id}>
              <Link href={href("/samples", { id: sample.id })} className="group flex flex-col gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(sample.image_url)}
                  alt={`Sample ${sample.id}`}
                  width={sample.width}
                  height={sample.height}
                  loading="lazy"
                  className="aspect-[3/2] w-full rounded-md border border-rule bg-sheet object-cover transition-opacity group-hover:opacity-85"
                />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold text-graphite group-hover:text-ink">{sample.id}</span>
                  <span className="shrink-0 text-caption text-pencil">{CATEGORY_SHORT[sample.category] ?? sample.category}</span>
                </div>
                <div className="flex gap-4 text-caption text-pencil tabular">
                  <span>best <span className="font-semibold text-graphite">{fmtScore(best_score)}</span></span>
                  <span>worst <span className={cn("font-semibold", worst_score != null && worst_score < 60 ? "text-redpen" : "text-graphite")}>{fmtScore(worst_score)}</span></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function SampleDetailView({ id }: { id: string }) {
  const { run, config, params, set, href } = useUrlState();
  const selected = params.get("model");
  const { data, error, isLoading } = useApi<SampleDetail>(apiUrl(`/api/samples/${id}`, { run_id: run, config }));
  const [showBoxes, setShowBoxes] = useState(true);

  if (error) return <Page title={id}><LoadError error={error} /></Page>;
  if (isLoading || !data) return <Page title={id}><LoadingBlock /></Page>;

  const s = data.sample;
  const reference = s.ground_truth.text ?? s.ground_truth.latex ?? s.ground_truth.smiles ?? "";
  const current =
    data.predictions.find((p) => p.model.id === selected) ?? data.predictions.find((p) => p.lines.length > 0) ?? data.predictions[0];
  const boxes = showBoxes ? (current?.lines ?? []) : [];

  return (
    <Page
      title={s.id}
      lead={`${CATEGORY_SHORT[s.category] ?? s.category}. Scored by ${data.category_metric.charAt(0).toLowerCase()}${data.category_metric.slice(1)}.`}
      aside={
        <Link href={href("/samples")} className="text-body text-ink underline-offset-4 hover:underline">
          All samples
        </Link>
      }
    >
      <DemoNotice run={data.run} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <div className="relative overflow-hidden rounded-md border border-rule bg-sheet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(s.image_url)}
              alt={`Input image for ${s.id}`}
              width={s.width}
              height={s.height}
              fetchPriority="high"
              className="block h-auto w-full"
            />
            {boxes.length > 0 && (
              <svg viewBox={`0 0 ${s.width} ${s.height}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden>
                {boxes.map((ln, i) => {
                  const poly = (ln as { poly: number[][] }).poly;
                  return (
                    <polygon
                      key={i}
                      points={poly.map((p) => p.join(",")).join(" ")}
                      fill="var(--ink-mark)"
                      fillOpacity="0.08"
                      stroke="var(--ink-mark)"
                      strokeWidth={Math.max(2, s.width / 500)}
                    />
                  );
                })}
              </svg>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-pencil">
            <label className="flex items-center gap-2">
              <Switch checked={showBoxes} onCheckedChange={setShowBoxes} aria-label="Show detected text lines" />
              Show lines found by {current?.model.name ?? "the selected model"}
            </label>
            {current && current.lines.length === 0 && <span>This model returns no line boxes.</span>}
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 border-t border-rule pt-3 text-caption">
            <dt className="text-pencil">File</dt>
            <dd className="text-graphite">{s.file_format.toUpperCase()}, {s.width} × {s.height}</dd>
            <dt className="text-pencil">Tests stages</dt>
            <dd className="text-graphite">{s.stage_ids.join(", ")}</dd>
            <dt className="text-pencil">Source</dt>
            <dd className="text-graphite">{s.source}</dd>
            <dt className="text-pencil">SHA-256</dt>
            <dd className="truncate font-mono text-graphite" title={s.sha256}>{s.sha256.slice(0, 16)}…</dd>
          </dl>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-md border border-rule bg-sheet p-4">
            <h2 className="mb-2 text-caption font-semibold text-pencil">Ground truth</h2>
            <p translate="no" className="font-mono text-body leading-7 whitespace-pre-wrap text-graphite">{reference}</p>
          </section>

          <div className="flex flex-col gap-2">
            <h2 className="text-h3 font-semibold text-graphite">Model outputs, best first</h2>
            <RedPenLegend />
          </div>

          <ol className="flex flex-col gap-3">
            {data.predictions.map((p) => (
              <OutputCard
                key={p.model.id}
                p={p}
                reference={reference}
                mode={s.gt_kind === "text" ? "words" : "chars"}
                active={current?.model.id === p.model.id}
                onSelect={() => set({ model: p.model.id })}
              />
            ))}
          </ol>

          {data.not_run.length > 0 && (
            <p className="text-caption text-pencil">
              No output yet from {data.not_run.map((m) => m.name).join(", ")}.
            </p>
          )}
        </div>
      </div>
    </Page>
  );
}

function OutputCard({ p, reference, mode, active, onSelect }: { p: PredictionOut; reference: string; mode: "words" | "chars"; active: boolean; onSelect: () => void }) {
  return (
    <li
      className={cn(
        "rounded-md border bg-sheet transition-colors",
        active ? "border-ink-mark ring-1 ring-ink-mark" : "border-rule hover:border-rule-strong",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-t-md px-4 pt-3 text-left focus-visible:outline-2"
      >
        <span className="font-semibold text-graphite">{p.model.name}</span>
        <PlatformTag platform={p.model.platform} />
        <span className="ml-auto flex items-baseline gap-4 text-caption text-pencil tabular">
          <span>{fmtMs(p.total_ms)}</span>
          <span>{fmtMB(p.peak_mem_mb)}</span>
          <span className={cn("text-h4 font-semibold", p.score != null && p.score < 60 ? "text-redpen" : "text-graphite")}>
            {fmtScore(p.score)}
          </span>
        </span>
      </button>
      <div className="px-4 pt-2 pb-4">
        {p.error ? (
          <p className="text-redpen">Failed: {p.error}</p>
        ) : p.output ? (
          <RedPenDiff reference={reference} output={p.output} mode={mode} />
        ) : (
          <p className="text-pencil">Empty output.</p>
        )}
      </div>
    </li>
  );
}
