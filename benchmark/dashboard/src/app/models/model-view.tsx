"use client";

import Link from "next/link";
import { OnOffBar, PairedDots, TimeStrip } from "@/components/charts";
import { OutputText, referenceOf } from "@/components/output-text";
import { PlatformTag, TestMark, Tip } from "@/components/marks";
import { DemoNotice, LoadError, LoadingBlock, Page, Section } from "@/components/page";
import { RedPenLegend } from "@/components/red-pen-diff";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiUrl, mediaUrl, type ModelDetail, type ModelOutputs, type ModelSampleOutput, type Overview, useApi } from "@/lib/api";
import { CATEGORY_SHORT, fmtMB, fmtMetric, fmtMs, fmtScore, METRIC_INFO } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

function quantile(v: number[], q: number) {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, s.length - 1);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export function ModelView() {
  const { run, config, params, href } = useUrlState();
  const id = params.get("id");
  const { data, error, isLoading } = useApi<ModelDetail>(id ? apiUrl(`/api/models/${id}`, { run_id: run }) : null);
  const { data: outs } = useApi<ModelOutputs>(id ? apiUrl(`/api/models/${id}/outputs`, { run_id: run, config }) : null);
  const { data: overview } = useApi<Overview>(apiUrl("/api/overview", { run_id: run, config }));

  if (!id) return <Page title="Model"><p className="text-pencil">Pick a model from the leaderboard.</p></Page>;
  if (error) return <Page title="Model"><LoadError error={error} /></Page>;
  if (isLoading || !data) return <Page title="Model"><LoadingBlock /></Page>;

  const m = data.model;
  const row = overview?.rows.find((r) => r.model.id === m.id);
  const labels = Object.fromEntries((overview?.categories ?? []).map((c) => [c.id, c.label]));
  const abl = Object.fromEntries(data.ablations.map((a) => [a.flag, a]));
  const def = Object.fromEntries((data.scores.default ?? []).map((s) => [s.category, s.score]));
  const full = Object.fromEntries((data.scores.full ?? []).map((s) => [s.category, s.score]));
  const pairs = m.covers
    .filter((c) => def[c] != null || full[c] != null)
    .map((c) => ({ label: CATEGORY_SHORT[c] ?? labels[c] ?? c, a: def[c] ?? null, b: full[c] ?? null }));
  const hasOptional = m.pipeline.some((s) => s.optional);
  const tests = data.tests[config] ?? { PASS: 0, PARTIAL: 0, FAIL: 0, "N/T": 0 };
  const times = data.latencies_ms[config] ?? [];
  const items = outs?.items ?? [];
  const failed = items.filter((i) => i.error).length;
  const tested = m.status === "tested";

  return (
    <Page
      title={m.name}
      lead={m.summary}
      aside={
        <Link href={href("/")} className="text-body text-ink underline-offset-4 hover:underline">
          Back to leaderboard
        </Link>
      }
    >
      <DemoNotice run={data.run} />

      {/* Everything we record about the model, in one block. */}
      <Section id="facts" title="What we collect" note={`For this run, with ${config === "full" ? "all stages on" : "library defaults"}.`}>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Rank" tip="Position by focus average. Only models covering all three focus areas are ranked.">
            {row?.rank != null ? `#${row.rank}` : row?.model.kind === "layout" ? "Layout only" : "Not ranked"}
          </Fact>
          <Fact label="Focus average" tip="Mean score of handwriting, handwritten formulas and diagram labels, 0–100." big>
            {fmtScore(row?.focus_score)}
          </Fact>
          <Fact label="Capability" tip="Weighted share of checklist stages passed (H = 3, M = 2, L = 1, partial = half).">
            {fmtScore(row?.capability_score)}
          </Fact>
          <Fact label="Samples read" tip="Outputs stored for this run and setting, and how many failed or timed out.">
            {items.length}
            {failed > 0 && <span className="ml-1.5 text-body text-redpen">{failed} failed</span>}
          </Fact>
          <Fact label="Median time" tip="Median time per sample after warm-up.">{fmtMs(quantile(times, 0.5))}</Fact>
          <Fact label="p95 time" tip="The slowest 5% of samples took at least this long.">{fmtMs(quantile(times, 0.95))}</Fact>
          <Fact label="Peak memory" tip="Highest memory seen while reading one sample.">{fmtMB(data.peak_mem_mb[config])}</Fact>
          <Fact label="Load time" tip="Time to load the model before the first sample.">{fmtMs(data.load_ms[config])}</Fact>
          <Fact label="Weights on disk" tip="Size of the downloaded model files.">{fmtMB(data.weights_mb)}</Fact>
          <Fact label="Size" tip="Parameter count as stated by the model's authors.">{m.params ?? "Not stated"}</Fact>
          <Fact label="Runs on" tip="Machine used. Times only compare within the same machine."><PlatformTag platform={m.platform} /></Fact>
          <Fact label="License" tip="License of the model weights, from the model card.">{m.license ?? "Unknown"}</Fact>
        </dl>
        <p className="text-body text-pencil">
          <Tip label="Input" tip="What the model receives for each sample." muted />:{" "}
          {m.needs_prompt ? (
            <>image + prompt <q className="text-graphite">{data.run.prompt}</q></>
          ) : (
            "image only, no prompt"
          )}
          . Covers {m.covers.map((c) => CATEGORY_SHORT[c] ?? c).join(", ") || "no text categories"}.
        </p>
      </Section>

      {!tested ? (
        <p className="text-pencil">No outputs yet. This page fills in once the model has been run.</p>
      ) : (
        <>
          <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
            {hasOptional ? (
              <Section title="Score per category" note="0–100. Ring = library defaults, dot = all stages on.">
                <PairedDots rows={pairs} aLabel="Library defaults" bLabel="All stages on" />
              </Section>
            ) : (
              <Section title="Score per category" note="0–100. No optional stages, so both settings run the same pipeline.">
                <PairedDots rows={pairs.map((p) => ({ ...p, b: null }))} aLabel="Library defaults" bLabel="All stages on" single />
              </Section>
            )}
            <Section title="Time per sample" note="Each dot is one sample, after warm-up. Log scale.">
              <TimeStrip
                series={[
                  { label: "Library defaults", values: data.latencies_ms.default ?? [] },
                  { label: "All stages on", values: data.latencies_ms.full ?? [] },
                ]}
              />
            </Section>

            <Section title="Pipeline" note="In the order it runs. Optional stages show the score with the stage off and on.">
              <ol className="flex flex-col">
                {m.pipeline.map((step, i) => {
                  const a = abl[step.id];
                  const delta = a ? a.score_on - a.score_off : null;
                  return (
                    <li key={step.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-rule py-2.5 last:border-0">
                      <span className="text-pencil tabular">{i + 1}</span>
                      <div>
                        <div className="text-graphite">{step.name}</div>
                        <div className="text-caption text-pencil">
                          {step.optional ? (step.default_on ? "Optional, on by default" : "Optional, off by default") : "Always runs"}
                        </div>
                      </div>
                      {a && delta != null ? (
                        <div className="flex items-center gap-3">
                          <OnOffBar off={a.score_off} on={a.score_on} />
                          <span className={cn("w-20 text-right text-caption tabular", delta >= 0 ? "text-ink" : "text-redpen")}>
                            {delta >= 0 ? "helps +" : "hurts −"}
                            {Math.abs(delta).toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span />
                      )}
                    </li>
                  );
                })}
              </ol>
            </Section>

            <Section
              title="Checklist"
              note={`${Object.values(tests).reduce((a, b) => a + b, 0)} stages from STAGES.md.`}
              aside={
                <Link href={href("/checklist", { model: m.id })} className="text-body text-ink underline-offset-4 hover:underline">
                  See every stage
                </Link>
              }
            >
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {(["PASS", "PARTIAL", "FAIL", "N/T"] as const).map((t) => (
                  <div key={t} className="flex items-baseline gap-2">
                    <TestMark test={t} className="text-h4" />
                    <span className="text-h2 font-semibold text-graphite tabular">{tests[t] ?? 0}</span>
                    <span className="text-pencil">{t === "N/T" ? "not tested" : t.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <ModelOutputsList items={items} modelId={m.id} />
        </>
      )}
    </Page>
  );
}

function Fact({ label, tip, children, big }: { label: string; tip: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-sheet px-4 py-3">
      <dt className="text-caption">
        <Tip label={label} tip={tip} muted />
      </dt>
      <dd className={cn("tabular text-graphite", big ? "text-h2 font-semibold" : "text-h4")}>{children}</dd>
    </div>
  );
}

function ModelOutputsList({ items, modelId }: { items: ModelSampleOutput[]; modelId: string }) {
  const { params, set, href } = useUrlState();
  const cat = params.get("cat");
  const order = params.get("sort") === "sample" ? "sample" : "worst";
  const cats = [...new Set(items.map((i) => i.sample.category))];
  const shown = items
    .filter((i) => !cat || i.sample.category === cat)
    .sort((a, b) => (order === "worst" ? (a.error ? -1 : 0) - (b.error ? -1 : 0) || (a.score ?? 0) - (b.score ?? 0) : a.sample.id.localeCompare(b.sample.id)));

  return (
    <Section
      id="outputs"
      title="Every output"
      note={<>The final output for each sample, marked against the ground truth. <RedPenLegend inline /></>}
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={cat ?? "all"} onValueChange={(v) => set({ cat: v === "all" ? null : v })}>
            <SelectTrigger size="sm" className="min-w-44 bg-sheet text-body" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All categories ({items.length})</SelectItem>
                {cats.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_SHORT[c] ?? c} ({items.filter((i) => i.sample.category === c).length})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ToggleGroup type="single" variant="outline" size="sm" value={order} onValueChange={(v) => v && set({ sort: v === "worst" ? null : v })} aria-label="Sort">
            <ToggleGroupItem value="worst" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">Worst first</ToggleGroupItem>
            <ToggleGroupItem value="sample" className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">By sample</ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
    >
      <ol className="flex flex-col border-t border-rule">
        {shown.map((it) => (
          <li key={it.sample.id} className="grid gap-x-6 gap-y-3 border-b border-rule py-5 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]">
            <Link href={href("/samples", { id: it.sample.id, model: modelId })} className="group flex flex-col gap-1.5 rounded-md focus-visible:outline-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(it.sample.image_url)}
                alt={`Input ${it.sample.id}`}
                width={it.sample.width}
                height={it.sample.height}
                loading="lazy"
                className="aspect-[3/2] w-full rounded-md border border-rule object-cover transition-opacity group-hover:opacity-85"
              />
              <span className="text-caption text-pencil group-hover:text-ink">{it.sample.id}</span>
            </Link>

            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-caption text-pencil">Output</span>
                <span className={cn("text-h3 font-semibold tabular", it.error || (it.score ?? 0) < 60 ? "text-redpen" : "text-graphite")}>
                  {fmtScore(it.score)}
                </span>
              </div>
              <OutputText sample={it.sample} output={it.output} error={it.error} clamp />
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-caption text-pencil">Ground truth</span>
              <p translate="no" className="max-h-48 overflow-y-auto font-mono text-body leading-7 whitespace-pre-wrap break-words text-pencil">
                {referenceOf(it.sample)}
              </p>
              <dl className="mt-auto flex flex-wrap gap-x-5 gap-y-1 border-t border-rule pt-2 text-caption">
                {Object.entries(it.metrics).map(([k, v]) => (
                  <div key={k} className="flex gap-1.5">
                    <dt><Tip label={METRIC_INFO[k]?.label ?? k} tip={METRIC_INFO[k]?.tip ?? k} muted /></dt>
                    <dd className="tabular text-graphite">{fmtMetric(k, v)}</dd>
                  </div>
                ))}
                <div className="flex gap-1.5"><dt className="text-pencil">Time</dt><dd className="tabular text-graphite">{fmtMs(it.total_ms)}</dd></div>
                <div className="flex gap-1.5"><dt className="text-pencil">Memory</dt><dd className="tabular text-graphite">{fmtMB(it.peak_mem_mb)}</dd></div>
                <div className="flex gap-1.5">
                  <dt><Tip label="Stages run" tip={it.stages_run.join(", ") || "None recorded"} muted /></dt>
                  <dd className="tabular text-graphite">{it.stages_run.length}</dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ol>
      {shown.length === 0 && <p className="text-pencil">No outputs in this category.</p>}
    </Section>
  );
}
