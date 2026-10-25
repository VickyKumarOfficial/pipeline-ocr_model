"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlatformTag } from "@/components/marks";
import { DemoNotice, LoadError, LoadingBlock, Page } from "@/components/page";
import { RedPenDiff, RedPenLegend } from "@/components/red-pen-diff";
import { Switch } from "@/components/ui/switch";
import { apiUrl, mediaUrl, type PredictionOut, type SampleDetail, useApi } from "@/lib/api";
import { CATEGORY_SHORT, fmtMB, fmtMs, fmtScore } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

export function SamplesView() {
  const { params, href } = useUrlState();
  const router = useRouter();
  const id = params.get("id");
  // The sample list moved to /outputs; keep old links working.
  useEffect(() => {
    if (!id) router.replace(href("/outputs"));
  }, [id, router, href]);
  return id ? <SampleDetailView id={id} /> : null;
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
        <Link href={href("/outputs")} className="text-body text-ink underline-offset-4 hover:underline">
          All outputs
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
