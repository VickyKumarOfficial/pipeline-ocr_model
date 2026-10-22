"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LoadError, LoadingBlock, Page } from "@/components/page";
import { apiUrl, type RunOut, useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";

export function RunsView() {
  const { data, error, isLoading } = useApi<RunOut[]>(apiUrl("/api/runs"));

  return (
    <Page title="Runs" lead="Each run records what was tested and how, so any number on this site can be traced back.">
      {error ? (
        <LoadError error={error} />
      ) : isLoading || !data ? (
        <LoadingBlock rows={4} />
      ) : (
        <ol className="flex flex-col gap-4">
          {data.map((r) => (
            <li key={r.id} className="rounded-lg border border-rule bg-sheet p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-h3 font-semibold text-graphite">{r.is_demo ? "Demo data" : r.id}</h2>
                {r.is_demo && (
                  <Badge variant="outline" className="border-redpen/40 text-redpen">
                    Made-up numbers
                  </Badge>
                )}
                <span className="text-pencil">{fmtDate(r.created_at)}</span>
                <Link href={`/?run=${encodeURIComponent(r.id)}`} className="ml-auto text-ink underline-offset-4 hover:underline">
                  Open this run
                </Link>
              </div>
              {r.notes && <p className="mt-2 max-w-[80ch] text-pencil">{r.notes}</p>}
              <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-2 text-body">
                <dt className="text-pencil">Prompt for prompted models</dt>
                <dd className="font-mono text-graphite">{r.prompt ?? "none"}</dd>
                {Object.entries(r.machines).map(([k, v]) => (
                  <MachineRow key={k} label={k} value={v} />
                ))}
                <dt className="text-pencil">Code version</dt>
                <dd className="font-mono text-graphite">{r.git_commit ?? "not recorded"}</dd>
                <dt className="text-pencil">Input manifest hash</dt>
                <dd className="truncate font-mono text-graphite">{r.manifest_sha256 ?? "not recorded"}</dd>
                <dt className="text-pencil">Thresholds hash</dt>
                <dd className="truncate font-mono text-graphite">{r.thresholds_sha256 ?? "not recorded"}</dd>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </Page>
  );
}

function MachineRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-pencil">{label}</dt>
      <dd className="text-graphite">{value}</dd>
    </>
  );
}
