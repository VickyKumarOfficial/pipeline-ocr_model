import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtScore } from "@/lib/format";
import { cn } from "@/lib/utils";

const TEST_MARK: Record<string, { glyph: string; label: string; className: string }> = {
  PASS: { glyph: "✓", label: "Pass", className: "text-ink" },
  PARTIAL: { glyph: "½", label: "Partial", className: "text-ink-mark" },
  FAIL: { glyph: "✗", label: "Fail", className: "text-redpen" },
  "N/T": { glyph: "–", label: "Not tested", className: "text-faint" },
};

/** A grading mark: tick, half, cross or dash. Shape carries the meaning, colour supports it. */
export function TestMark({ test, className }: { test: string; className?: string }) {
  const m = TEST_MARK[test] ?? TEST_MARK["N/T"];
  return (
    <span role="img" aria-label={m.label} className={cn("inline-block w-4 text-center font-semibold", m.className, className)}>
      {m.glyph}
    </span>
  );
}

export function testLabel(test: string) {
  return (TEST_MARK[test] ?? TEST_MARK["N/T"]).label;
}

/** Score 0-100 with a thin bar. `null` means the model is not meant for this category. */
export function ScoreCell({ value, strong, naReason }: { value: number | null | undefined; strong?: boolean; naReason?: string }) {
  if (value == null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="text-faint focus-visible:outline-2">
            —
          </span>
        </TooltipTrigger>
        <TooltipContent>{naReason ?? "Not meant for this category"}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className={cn("tabular", strong ? "text-h4 font-semibold text-graphite" : "text-graphite")}>{fmtScore(value)}</span>
      <span aria-hidden className="block h-1 w-12 overflow-hidden rounded-full bg-rule">
        <span className="block h-full rounded-full bg-ink-mark" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </span>
    </span>
  );
}

/** A label with a dotted underline; hovering or focusing it shows the explanation. */
export function Tip({ label, tip, strong, muted, className }: { label: React.ReactNode; tip: React.ReactNode; strong?: boolean; muted?: boolean; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "cursor-help border-b border-dotted border-faint focus-visible:outline-2",
            strong ? "font-semibold text-graphite" : muted ? "font-normal text-pencil" : "font-medium text-graphite",
            className,
          )}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{tip}</TooltipContent>
    </Tooltip>
  );
}

export function PlatformTag({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-rule px-1.5 text-caption text-pencil">{platform}</span>
  );
}
