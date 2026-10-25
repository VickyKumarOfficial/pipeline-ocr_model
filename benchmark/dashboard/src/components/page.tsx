import type { ReactNode } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { RunOut } from "@/lib/api";

export function Page({ title, lead, children, aside }: { title: ReactNode; lead?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[70ch]">
          <h1 className="text-h1 font-semibold tracking-[-0.01em] text-graphite">{title}</h1>
          {lead && <p className="mt-1.5 text-h4 text-pencil">{lead}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-6 flex flex-col gap-10">{children}</div>
    </div>
  );
}

/** One quiet line, not a banner: demo numbers must be obvious without shouting over the data. */
export function DemoNotice({ run }: { run?: RunOut }) {
  if (!run?.is_demo) return null;
  return (
    <p role="note" className="-mt-4 flex items-start gap-2 text-body text-redpen">
      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-redpen" />
      <span>
        <span className="font-semibold">Demo data.</span> No model has been run yet; every number and output here is made up
        to test the layout.
      </span>
    </p>
  );
}

/** A titled block of a page. `tip` adds the dotted-underline explanation to the title. */
export function Section({ title, note, aside, children, id }: { title: ReactNode; note?: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="text-h3 font-semibold text-graphite">{title}</h2>
          {note && <p className="text-body text-pencil">{note}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function LoadError({ error }: { error: Error }) {
  return (
    <Empty className="border border-dashed border-rule-strong bg-sheet">
      <EmptyHeader>
        <EmptyTitle>Results could not be loaded</EmptyTitle>
        <EmptyDescription>
          {error.message}. Check that the API is running and that NEXT_PUBLIC_API_URL points to it.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function LoadingBlock({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full bg-muted" />
      ))}
    </div>
  );
}
