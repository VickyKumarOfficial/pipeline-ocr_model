"use client";

import Link from "next/link";
import { OnOffBar, PairedDots, TimeStrip } from "@/components/charts";
import { PlatformTag, TestMark } from "@/components/marks";
import { DemoNotice, LoadError, LoadingBlock, Page } from "@/components/page";
import { Separator } from "@/components/ui/separator";
import { apiUrl, mediaUrl, type ModelDetail, type Overview, useApi } from "@/lib/api";
import { CATEGORY_SHORT, fmtMB, fmtMs, fmtScore } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

export function ModelView() {
  const { run, config, params, href } = useUrlState();
  const id = params.get("id");
  const { data, error, isLoading } = useApi<ModelDetail>(id ? apiUrl(`/api/models/${id}`, { run_id: run }) : null);
  // Category labels come from the overview so names stay in one place.
  const { data: overview } = useApi<Overview>(apiUrl("/api/overview", { run_id: run, config }));

  if (!id) return <Page title="Model"><p className="text-pencil">Pick a model from the leaderboard.</p></Page>;
  if (error) return <Page title="Model"><LoadError error={error} /></Page>;
  if (isLoading || !data) return <Page title="Model"><LoadingBlock /></Page>;

  const m = data.model;
  const labels = Object.fromEntries((overview?.categories ?? []).map((c) => [c.id, c.label]));
  const abl = Object.fromEntries(data.ablations.map((a) => [a.flag, a]));
  const def = Object.fromEntries((data.scores.default ?? []).map((s) => [s.category, s.score]));
  const full = Object.fromEntries((data.scores.full ?? []).map((s) => [s.category, s.score]));
  const pairs = m.covers
    .filter((c) => def[c] != null || full[c] != null)
    .map((c) => ({ label: CATEGORY_SHORT[c] ?? labels[c] ?? c, a: def[c] ?? null, b: full[c] ?? null }));
  const hasOptional = m.pipeline.some((s) => s.optional);
  const tests = data.tests[config] ?? { PASS: 0, PARTIAL: 0, FAIL: 0, "N/T": 0 };

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

      <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y border-rule py-4">
        <Fact label="Runs on"><PlatformTag platform={m.platform} /></Fact>
        <Fact label="Size">{m.params ?? "not stated"}</Fact>
        <Fact label="Weights on disk">{fmtMB(data.weights_mb)}</Fact>
        <Fact label="Load time">{fmtMs(data.load_ms[config])}</Fact>
        <Fact label="Peak memory">{fmtMB(data.peak_mem_mb[config])}</Fact>
        <Fact label="Input">{m.needs_prompt ? "Image + neutral prompt" : "Image only"}</Fact>
        <Fact label="License">{m.license ?? "unknown"}</Fact>
      </dl>

      {m.status !== "tested" ? (
        <p className="text-pencil">No outputs yet. This page fills in once the model has been run.</p>
      ) : (
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {hasOptional ? (
            <Section title="Does turning every stage on help?" note="Score per category, 0–100.">
              <PairedDots rows={pairs} aLabel="Library defaults" bLabel="All stages on" />
            </Section>
          ) : (
            <Section title="Score per category" note="0–100. This model has no optional stages, so both settings run the same pipeline.">
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

          <Section title="Pipeline, in the order it runs" note="Optional stages show their score with the stage off (ring) and on (dot).">
            <ol className="flex flex-col">
              {m.pipeline.map((step, i) => {
                const a = abl[step.id];
                const delta = a ? a.score_on - a.score_off : null;
                return (
                  <li key={step.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-rule py-3 last:border-0">
                    <span className="text-h4 font-semibold text-ink tabular">{i + 1}</span>
                    <div>
                      <div className="text-graphite">{step.name}</div>
                      <div className="text-caption text-pencil">
                        {step.optional ? (step.default_on ? "Optional, on by default" : "Optional, off by default") : "Always runs"}
                      </div>
                    </div>
                    {a && delta != null ? (
                      <div className="flex items-center gap-3">
                        <OnOffBar off={a.score_off} on={a.score_on} />
                        <span className={cn("w-24 text-right text-caption tabular", delta >= 0 ? "text-ink" : "text-redpen")}>
                          {delta >= 0 ? "helps" : "hurts"} {delta >= 0 ? "+" : "−"}
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

          <Section title="Checklist results" note={`${config === "full" ? "All stages on" : "Library defaults"}, across ${Object.values(tests).reduce((a, b) => a + b, 0)} stages.`}>
            <div className="flex flex-wrap gap-8">
              {(["PASS", "PARTIAL", "FAIL", "N/T"] as const).map((t) => (
                <div key={t} className="flex items-baseline gap-2">
                  <TestMark test={t} className="text-h3" />
                  <span className="text-h2 font-semibold text-graphite">{tests[t] ?? 0}</span>
                  <span className="text-pencil">{t === "N/T" ? "not tested" : t.toLowerCase()}</span>
                </div>
              ))}
            </div>
            <Link href={href("/checklist", { model: m.id })} className="mt-4 inline-block text-ink underline-offset-4 hover:underline">
              See every stage for {m.name}
            </Link>
          </Section>
        </div>
      )}

      {data.worst.length > 0 && (
        <>
          <Separator className="bg-rule" />
          <Section title="Lowest-scoring samples" note="Library defaults. Open one to compare outputs side by side.">
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {data.worst.map((w) => (
                <li key={w.id}>
                  <Link href={href("/samples", { id: w.id })} className="group flex flex-col gap-2 rounded-md focus-visible:outline-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(w.image_url)}
                      alt={`Sample ${w.id}`}
                      width={1100}
                      height={720}
                      loading="lazy"
                      className="aspect-[3/2] w-full rounded-md border border-rule object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-opacity group-hover:opacity-85"
                    />
                    <span className="flex justify-between text-caption">
                      <span className="text-pencil">{CATEGORY_SHORT[w.category] ?? w.category}</span>
                      <span className="font-semibold text-redpen tabular">{fmtScore(w.score)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </Page>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-pencil">{label}</dt>
      <dd className="text-graphite">{children}</dd>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="text-h3 font-semibold text-graphite">{title}</h2>
        {note && <p className="text-caption text-pencil">{note}</p>}
      </div>
      {children}
    </section>
  );
}
