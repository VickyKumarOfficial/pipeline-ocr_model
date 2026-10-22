"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { TestMark, testLabel } from "@/components/marks";
import { DemoNotice, LoadError, LoadingBlock, Page } from "@/components/page";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiUrl, type Checklist, useApi } from "@/lib/api";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<string, string> = { H: "High", "H if in scope": "High if in scope", M: "Medium", L: "Low" };

export function ChecklistView() {
  const { run, config, params, set, href } = useUrlState();
  const priority = params.get("priority") ?? "all";
  const disagree = params.get("disagree") === "1";
  const focusModel = params.get("model");
  const { data, error, isLoading } = useApi<Checklist>(apiUrl("/api/checklist", { run_id: run, config }));

  const cells = useMemo(() => {
    const map = new Map<string, Checklist["cells"][number]>();
    for (const c of data?.cells ?? []) map.set(`${c.stage_id}|${c.model_id}`, c);
    return map;
  }, [data]);

  if (error) return <Page title="Capability checklist"><LoadError error={error} /></Page>;
  if (isLoading || !data) return <Page title="Capability checklist"><LoadingBlock rows={14} /></Page>;

  const models = data.models.filter((m) => m.status === "tested");
  const isDisagreement = (stageId: string) =>
    models.some((m) => {
      const c = cells.get(`${stageId}|${m.id}`);
      return c?.claim === true && c.test === "FAIL";
    });
  const stages = data.stages.filter(
    (s) => (priority === "all" || s.priority.startsWith(priority)) && (!disagree || isDisagreement(s.id)),
  );
  const groups = Object.entries(data.groups).filter(([g]) => stages.some((s) => s.group === g));

  return (
    <Page
      title="Capability checklist"
      lead="Every stage an OCR system can have, what each model's documentation claims, and what our tests found."
    >
      <DemoNotice run={data.run} />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2 text-caption text-pencil">
          <span id="prio-label">Priority for Niera</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={priority}
            onValueChange={(v) => v && set({ priority: v === "all" ? null : v })}
            aria-labelledby="prio-label"
          >
            {[["all", "All"], ["H", "High"], ["M", "Medium"], ["L", "Low"]].map(([v, l]) => (
              <ToggleGroupItem key={v} value={v} className="px-3 data-[state=on]:bg-ink-wash data-[state=on]:text-ink">
                {l}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <label className="flex items-center gap-2 text-caption text-pencil">
          <Switch checked={disagree} onCheckedChange={(v) => set({ disagree: v ? "1" : null })} />
          Only stages where the docs claim it but our test failed
        </label>
        <Legend />
      </div>

      <div className="overflow-x-auto rounded-lg border border-rule bg-sheet">
        <table className="w-full border-separate border-spacing-0 text-body">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-14 border-r border-b border-margin-line border-b-rule bg-sheet px-2 text-left align-bottom text-caption font-normal text-pencil">
                Stage
              </th>
              <th scope="col" className="sticky left-14 z-10 min-w-64 border-b border-rule bg-sheet px-3 pb-2 text-left align-bottom text-caption font-normal text-pencil">
                What it checks
              </th>
              {models.map((m) => (
                <th
                  key={m.id}
                  scope="col"
                  className={cn("h-40 w-11 border-b border-rule px-0 pb-2 align-bottom", focusModel === m.id && "bg-ink-wash")}
                >
                  <Link
                    href={href("/models", { id: m.id })}
                    className="mx-auto block w-fit rotate-180 text-caption font-medium whitespace-nowrap text-graphite [writing-mode:vertical-rl] hover:text-ink focus-visible:outline-2"
                  >
                    {m.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(([g, name]) => (
              <Fragment key={g}>
                <tr>
                  <th colSpan={2 + models.length} scope="colgroup" className="sticky left-0 border-b border-rule bg-paper px-3 py-2 text-left text-body font-semibold text-graphite">
                    {name}
                  </th>
                </tr>
                {stages
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <tr key={s.id} className="group">
                      <th scope="row" className="sticky left-0 z-10 border-r border-b border-margin-line border-b-rule bg-sheet px-2 text-left align-top text-caption font-semibold text-ink tabular group-hover:bg-paper">
                        <span className="block pt-2.5">{s.id}</span>
                      </th>
                      <td className="sticky left-14 z-10 border-b border-rule bg-sheet px-3 py-2 align-top group-hover:bg-paper">
                        <div className="text-graphite">{s.name}</div>
                        <div className="text-caption text-pencil">{PRIORITY_LABEL[s.priority] ?? s.priority} priority</div>
                      </td>
                      {models.map((m) => {
                        const c = cells.get(`${s.id}|${m.id}`);
                        const claimed = c?.claim === true;
                        const broken = claimed && c?.test === "FAIL";
                        const text = `${m.name}, ${s.id}: ${testLabel(c?.test ?? "N/T")}. Docs ${claimed ? `claim it${c?.claim_source ? ` (${c.claim_source})` : ""}` : "make no claim"}.`;
                        return (
                          <td
                            key={m.id}
                            title={text}
                            aria-label={text}
                            className={cn(
                              "relative border-b border-rule text-center align-middle text-h4 group-hover:bg-paper",
                              broken && "bg-redpen-wash group-hover:bg-redpen-wash",
                              focusModel === m.id && !broken && "bg-ink-wash/60",
                            )}
                          >
                            <TestMark test={c?.test ?? "N/T"} />
                            {claimed && <span aria-hidden className="absolute top-2.5 right-2 size-1.5 rounded-full bg-ink" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        {stages.length === 0 && <p className="p-6 text-pencil">No stages match these filters.</p>}
      </div>
    </Page>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-pencil" aria-label="Legend">
      {(["PASS", "PARTIAL", "FAIL", "N/T"] as const).map((t) => (
        <li key={t} className="flex items-center gap-1">
          <TestMark test={t} /> {testLabel(t).toLowerCase()}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-ink" /> docs claim it
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-sm bg-redpen-wash ring-1 ring-redpen/30" /> claimed but failed
      </li>
    </ul>
  );
}
