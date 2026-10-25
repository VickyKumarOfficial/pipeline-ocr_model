"use client";

import Link from "next/link";
import { referenceOf } from "@/components/output-text";
import { PlatformTag } from "@/components/marks";
import { DemoNotice, LoadError, LoadingBlock, Page } from "@/components/page";
import { RedPenDiff, RedPenLegend } from "@/components/red-pen-diff";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type AllOutputs, apiUrl, mediaUrl, type ModelOut, type Overview, type SampleOutputs, useApi } from "@/lib/api";
import { CATEGORY_SHORT, fmtMs, fmtScore } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

export function OutputsView() {
  const { run, config, params, set } = useUrlState();
  const category = params.get("category");
  const view = params.get("view") === "exact" ? "exact" : "corrections";
  const { data, error, isLoading } = useApi<AllOutputs>(apiUrl("/api/outputs", { run_id: run, config, category }));
  const { data: overview } = useApi<Overview>(apiUrl("/api/overview", { run_id: run, config }));
  const cats = overview?.categories.filter((c) => c.sample_count > 0) ?? [];

  return (
    <Page
      title="All outputs"
      lead="Every sample with what each model returned, side by side. Models are ordered by their average score here."
      aside={
        <div className="flex flex-wrap items-center gap-2">
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
          <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && set({ view: v === "exact" ? "exact" : null })} aria-label="Show">
            <ToggleGroupItem value="corrections" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">Corrections</ToggleGroupItem>
            <ToggleGroupItem value="exact" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">Exact output</ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
    >
      <DemoNotice run={data?.run} />
      {view === "corrections" && <RedPenLegend />}
      {error ? (
        <LoadError error={error} />
      ) : isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <ol className="flex flex-col gap-12">
          {data.samples.map((s) => (
            <SampleBlock key={s.sample.id} s={s} models={data.models} exact={view === "exact"} />
          ))}
        </ol>
      )}
    </Page>
  );
}

function SampleBlock({ s, models, exact }: { s: SampleOutputs; models: ModelOut[]; exact: boolean }) {
  const { href } = useUrlState();
  const sample = s.sample;
  const reference = referenceOf(sample);
  const ran = models.filter((m) => s.outputs[m.id]);
  return (
    <li className="flex flex-col gap-4">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[200px_minmax(0,1fr)]">
        <Link href={href("/samples", { id: sample.id })} className="group rounded-md focus-visible:outline-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(sample.image_url)}
            alt={`Input ${sample.id}`}
            width={sample.width}
            height={sample.height}
            loading="lazy"
            className="aspect-[3/2] w-full rounded-md border border-rule object-cover transition-opacity group-hover:opacity-85"
          />
        </Link>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 className="text-h4 font-semibold text-graphite">{sample.id}</h2>
            <span className="text-caption text-pencil">{CATEGORY_SHORT[sample.category] ?? sample.category}</span>
            <Link href={href("/samples", { id: sample.id })} className="ml-auto text-caption text-ink underline-offset-4 hover:underline">
              Open with line boxes
            </Link>
          </div>
          <span className="text-caption text-pencil">Ground truth</span>
          <p translate="no" className="font-mono text-body leading-7 whitespace-pre-wrap break-words text-graphite">{reference}</p>
        </div>
      </div>

      {ran.length === 0 ? (
        <p className="text-pencil">No model has read this sample yet.</p>
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-lg border border-rule bg-sheet [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {ran.map((m) => {
            const o = s.outputs[m.id];
            const low = o.error || (o.score ?? 0) < 60;
            return (
              <li key={m.id} className="flex min-w-0 flex-col gap-2 bg-sheet p-3 outline outline-1 outline-rule">
                <div className="flex items-baseline justify-between gap-2">
                  <Link href={href("/models", { id: m.id })} className="truncate font-semibold text-graphite underline-offset-4 hover:text-ink hover:underline">
                    {m.name}
                  </Link>
                  <span className={cn("shrink-0 text-h4 font-semibold tabular", low ? "text-redpen" : "text-graphite")}>{fmtScore(o.score)}</span>
                </div>
                <div className="flex items-center gap-2 text-caption text-pencil">
                  <PlatformTag platform={m.platform} />
                  <span className="tabular">{fmtMs(o.total_ms)}</span>
                </div>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {o.error ? (
                    <p className="text-body text-redpen">Failed: {o.error}</p>
                  ) : !o.output ? (
                    <p className="text-body text-pencil">Empty output.</p>
                  ) : exact ? (
                    <pre translate="no" className="font-mono text-body leading-6 whitespace-pre-wrap break-words text-graphite">{o.output}</pre>
                  ) : (
                    <RedPenDiff reference={reference} output={o.output} mode={sample.gt_kind === "text" ? "words" : "chars"} className="leading-6" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
