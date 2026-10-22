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
