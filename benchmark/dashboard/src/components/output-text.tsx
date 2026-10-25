"use client";

import { useState } from "react";
import { RedPenDiff } from "@/components/red-pen-diff";
import type { SampleOut } from "@/lib/api";
import { cn } from "@/lib/utils";

export function referenceOf(sample: SampleOut) {
  return sample.ground_truth.text ?? sample.ground_truth.latex ?? sample.ground_truth.smiles ?? "";
}

/**
 * A model's final output. Shows the red-pen correction against the ground truth by default;
 * "Exact output" shows the text exactly as the model returned it.
 */
export function OutputText({ sample, output, error, className, clamp }: { sample: SampleOut; output: string; error?: string | null; className?: string; clamp?: boolean }) {
  const [raw, setRaw] = useState(false);
  if (error) return <p className={cn("text-body text-redpen", className)}>Failed: {error}</p>;
  if (!output) return <p className={cn("text-body text-pencil", className)}>Empty output.</p>;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className={cn(clamp && "max-h-48 overflow-y-auto pr-1")}>
        {raw ? (
          <pre translate="no" className="font-mono text-body leading-7 whitespace-pre-wrap break-words text-graphite">{output}</pre>
        ) : (
          <RedPenDiff reference={referenceOf(sample)} output={output} mode={sample.gt_kind === "text" ? "words" : "chars"} />
        )}
      </div>
      <button
        type="button"
        onClick={() => setRaw((v) => !v)}
        aria-pressed={raw}
        className="self-start rounded-sm text-caption text-ink underline-offset-4 hover:underline focus-visible:outline-2"
      >
        {raw ? "Show corrections" : "Exact output"}
      </button>
    </div>
  );
}
