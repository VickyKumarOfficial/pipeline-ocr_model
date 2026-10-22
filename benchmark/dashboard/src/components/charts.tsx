"use client";

import { fmtMs } from "@/lib/format";

/* Hand-built SVG charts. Thin marks, one ink colour, red pen only for "worse". Every value
   also appears as text next to the mark or in a visible label, so nothing hides in a tooltip. */

type Pair = { label: string; a: number | null; b: number | null };

/** Two values per row on a 0-100 scale: hollow ring = library defaults, filled dot = all stages on. */
export function PairedDots({ rows, aLabel, bLabel, single }: { rows: Pair[]; aLabel: string; bLabel: string; single?: boolean }) {
  const W = 640;
  const labelW = 130;
  const valueW = 150;
  const plotW = W - labelW - valueW - 16;
  const rowH = 34;
  const top = 26;
  const H = top + rows.length * rowH + 6;
  const x = (v: number) => labelW + (v / 100) * plotW;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className={single ? "sr-only" : "flex flex-wrap items-center gap-4 text-caption text-pencil"}>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="4.5" fill="var(--sheet)" stroke="var(--ink-mark)" strokeWidth="2" /></svg>
          {aLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="5" fill="var(--ink)" /></svg>
          {bLabel}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[640px]" role="img" aria-label={`${aLabel} versus ${bLabel} by category`}>
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 6} y2={H - 4} stroke="var(--rule)" strokeWidth="1" />
            <text x={x(t)} y={top - 12} textAnchor="middle" className="fill-faint text-[11px] tabular">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = top + i * rowH + rowH / 2;
          const delta = r.a != null && r.b != null ? r.b - r.a : null;
          return (
            <g key={r.label}>
              <title>{`${r.label}: ${r.a?.toFixed(1) ?? "—"} → ${r.b?.toFixed(1) ?? "—"}`}</title>
              <text x={0} y={y + 4} className="fill-graphite text-[13px]">{r.label}</text>
              {r.a != null && r.b != null && (
                <line x1={x(r.a)} x2={x(r.b)} y1={y} y2={y} stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" />
              )}
              {r.a != null && (single ? (
                <circle cx={x(r.a)} cy={y} r="5" fill="var(--ink)" stroke="var(--sheet)" strokeWidth="2" />
              ) : (
                <circle cx={x(r.a)} cy={y} r="5.5" fill="var(--sheet)" stroke="var(--ink-mark)" strokeWidth="2" />
              ))}
              {r.b != null && <circle cx={x(r.b)} cy={y} r="5" fill="var(--ink)" stroke="var(--sheet)" strokeWidth="2" />}
              <text x={W - valueW + 8} y={y + 4} className="fill-graphite text-[12px] tabular">
                {single ? (r.a?.toFixed(1) ?? "—") : `${r.a?.toFixed(1) ?? "—"} → ${r.b?.toFixed(1) ?? "—"}`}
                {delta != null && Math.abs(delta) >= 0.05 && (
                  <tspan className={delta > 0 ? "fill-ink" : "fill-redpen"}>{` ${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`}</tspan>
                )}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

const TICKS_MS = [100, 200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000];

/** One dot per sample on a log time axis, with median and p95 marked. */
export function TimeStrip({ series }: { series: { label: string; values: number[] }[] }) {
  const all = series.flatMap((s) => s.values);
  if (!all.length) return <p className="text-pencil">No timings recorded.</p>;
  const lo = Math.min(...all) * 0.8;
  const hi = Math.max(...all) * 1.2;
  const W = 640;
  const labelW = 130;
  const plotW = W - labelW - 12;
  const rowH = 56;
  const top = 8;
  const H = top + series.length * rowH + 24;
  const x = (v: number) => labelW + ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * plotW;
  const q = (v: number[], p: number) => {
    const s = [...v].sort((a, b) => a - b);
    const pos = (s.length - 1) * p;
    const i = Math.floor(pos);
    return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (pos - i);
  };
  const ticks = TICKS_MS.filter((t) => t >= lo && t <= hi);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[640px]" role="img" aria-label="Time per sample">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={top} y2={H - 22} stroke="var(--rule)" strokeWidth="1" />
          <text x={x(t)} y={H - 6} textAnchor="middle" className="fill-faint text-[11px] tabular">{t < 1000 ? `${t} ms` : `${t / 1000} s`}</text>
        </g>
      ))}
      {series.map((s, i) => {
        const yMid = top + i * rowH + rowH / 2;
        if (!s.values.length) return null;
        const p50 = q(s.values, 0.5);
        const p95 = q(s.values, 0.95);
        return (
          <g key={s.label}>
            <text x={0} y={yMid - 4} className="fill-graphite text-[13px]">{s.label}</text>
            <text x={0} y={yMid + 12} className="fill-pencil text-[11px] tabular">{`median ${fmtMs(p50)}, p95 ${fmtMs(p95)}`}</text>
            {s.values.map((v, j) => (
              <circle key={j} cx={x(v)} cy={yMid + ((j * 7) % 13) - 6} r="4" fill="var(--ink-mark)" fillOpacity="0.55" stroke="var(--sheet)" strokeWidth="1.5">
                <title>{fmtMs(v)}</title>
              </circle>
            ))}
            <line x1={x(p50)} x2={x(p50)} y1={yMid - 16} y2={yMid + 16} stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
            <line x1={x(p95)} x2={x(p95)} y1={yMid - 12} y2={yMid + 12} stroke="var(--pencil)" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

/** Off → on for one optional stage, drawn inline in the pipeline list. */
export function OnOffBar({ off, on }: { off: number; on: number }) {
  const W = 180;
  const H = 18;
  const lo = Math.max(0, Math.min(off, on) - 10);
  const hi = Math.min(100, Math.max(off, on) + 10);
  const x = (v: number) => 6 + ((v - lo) / (hi - lo)) * (W - 12);
  const better = on >= off;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <line x1={6} x2={W - 6} y1={H / 2} y2={H / 2} stroke="var(--rule)" strokeWidth="1" />
      <line x1={x(off)} x2={x(on)} y1={H / 2} y2={H / 2} stroke={better ? "var(--ink-mark)" : "var(--redpen)"} strokeWidth="2" />
      <circle cx={x(off)} cy={H / 2} r="4.5" fill="var(--sheet)" stroke="var(--faint)" strokeWidth="2" />
      <circle cx={x(on)} cy={H / 2} r="4.5" fill={better ? "var(--ink)" : "var(--redpen)"} stroke="var(--sheet)" strokeWidth="1.5" />
    </svg>
  );
}
