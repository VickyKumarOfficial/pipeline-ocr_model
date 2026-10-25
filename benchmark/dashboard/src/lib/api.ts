"use client";

import useSWR from "swr";
import type { components } from "./api-types";

type Schemas = components["schemas"];
export type Overview = Schemas["Overview"];
export type LeaderboardRow = Schemas["LeaderboardRow"];
export type CategoryOut = Schemas["CategoryOut"];
export type ModelOut = Schemas["ModelOut"];
export type RunOut = Schemas["RunOut"];
export type Checklist = Schemas["Checklist"];
export type ModelDetail = Schemas["ModelDetail"];
export type SampleListItem = Schemas["SampleListItem"];
export type SampleDetail = Schemas["SampleDetail"];
export type PredictionOut = Schemas["PredictionOut"];
export type ModelOutputs = Schemas["ModelOutputs"];
export type ModelSampleOutput = Schemas["ModelSampleOutput"];
export type AllOutputs = Schemas["AllOutputs"];
export type SampleOut = Schemas["SampleOut"];
export type SampleOutputs = Schemas["SampleOutputs"];

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export function apiUrl(path: string, params?: Record<string, string | null | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v) qs.set(k, v);
  const q = qs.toString();
  return `${API_BASE}${path}${q ? `?${q}` : ""}`;
}

export function mediaUrl(path: string) {
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

/** Fetch from the API. Keeps the previous result on screen while a new one loads. */
export function useApi<T>(url: string | null) {
  return useSWR<T, Error>(url, fetcher, { keepPreviousData: true, revalidateOnFocus: false });
}
