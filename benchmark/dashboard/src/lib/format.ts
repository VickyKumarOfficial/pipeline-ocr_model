export function fmtScore(v: number | null | undefined) {
  return v == null ? "—" : v.toFixed(1);
}

export function fmtMs(v: number | null | undefined) {
  if (v == null) return "—";
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0)} s`;
}

export function fmtMB(v: number | null | undefined) {
  if (v == null) return "—";
  return v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${Math.round(v)} MB`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export const CATEGORY_SHORT: Record<string, string> = {
  handwritten_text: "Handwriting",
  handwritten_formula: "HW formulas",
  diagram_labels: "Diagrams",
  printed_text: "Printed",
  printed_formula: "Printed formulas",
  chemistry: "Chemistry",
  hindi: "Hindi",
  tables: "Tables",
};

/** Native metrics stored with each output: display name and what it means. */
export const METRIC_INFO: Record<string, { label: string; tip: string; pct?: boolean }> = {
  cer: { label: "CER", tip: "Character error rate: edits needed to turn the output into the ground truth, divided by its length. Lower is better.", pct: true },
  label_recall: { label: "Label recall", tip: "Share of the diagram's labels that appear in the output. Higher is better.", pct: true },
  exact_match: { label: "Exact match", tip: "LaTeX equal to the ground truth after removing spacing commands and spaces." },
  norm_edit_distance: { label: "LaTeX edit distance", tip: "Normalised edit distance between output and ground-truth LaTeX, 0 to 1. Lower is better." },
  canonical_exact_match: { label: "Same molecule", tip: "The SMILES string describes the same molecule as the ground truth after canonicalisation." },
};

export function fmtMetric(key: string, v: unknown) {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return METRIC_INFO[key]?.pct ? `${(v * 100).toFixed(1)}%` : v.toFixed(3);
  return String(v);
}
