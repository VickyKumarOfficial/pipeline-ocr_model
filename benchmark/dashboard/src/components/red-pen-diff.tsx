"use client";

import { diffChars, diffWordsWithSpace } from "diff";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * A model's output marked the way a teacher corrects an answer sheet:
 * text the model got wrong is struck through, text it missed is written in, highlighted.
 */
export function RedPenDiff({ reference, output, mode, className }: { reference: string; output: string; mode: "words" | "chars"; className?: string }) {
  const parts = useMemo(() => {
    const raw = mode === "chars" ? diffChars(reference, output) : diffWordsWithSpace(reference, output);
    // Strike the wrong text first, then write the correction after it, like a teacher would.
    const out = [...raw];
    for (let i = 0; i < out.length - 1; i++) {
      if (out[i].removed && out[i + 1].added) [out[i], out[i + 1]] = [out[i + 1], out[i]];
    }
    return out;
  }, [reference, output, mode]);
  return (
    <p translate="no" className={cn("font-mono text-body leading-7 whitespace-pre-wrap break-words text-graphite", className)}>
      {parts.map((p, i) =>
        p.added ? (
          <del key={i} className="text-redpen decoration-redpen decoration-2" title="Wrong: not in the ground truth">
            {p.value}
          </del>
        ) : p.removed ? (
          <ins key={i} className="rounded-sm bg-redpen-wash px-0.5 text-redpen no-underline" title="Missed: in the ground truth, not in the output">
            {p.value}
          </ins>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </p>
  );
}

export function RedPenLegend({ inline }: { inline?: boolean }) {
  const Tag = inline ? "span" : "p";
  return (
    <Tag className={cn("text-caption text-pencil", inline ? "inline-flex flex-wrap gap-x-4" : "flex flex-wrap gap-x-6 gap-y-1")}>
      <span>
        <del className="font-mono text-redpen decoration-2">struck</del> = wrong
      </span>
      <span>
        <ins className="rounded-sm bg-redpen-wash px-0.5 font-mono text-redpen no-underline">added</ins> = missed
      </span>
    </Tag>
  );
}
