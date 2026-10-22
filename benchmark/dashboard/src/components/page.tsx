import { CircleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { RunOut } from "@/lib/api";

/** Page column with the notebook margin. `margin` content sits left of the red line. */
export function Page({ title, lead, children, aside }: { title: string; lead?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1360px] px-6 pt-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[72ch]">
          <h1 className="text-h1 font-semibold tracking-[-0.01em] text-graphite">{title}</h1>
          {lead && <p className="mt-2 text-h4 text-pencil">{lead}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </div>
  );
}

export function DemoNotice({ run }: { run?: RunOut }) {
  if (!run?.is_demo) return null;
  return (
    <Alert className="border-redpen/30 bg-redpen-wash text-redpen">
      <CircleAlertIcon />
      <AlertTitle>Demo data: no model has been run yet</AlertTitle>
      <AlertDescription className="text-redpen/90">
        Every number, output and image on this page is made up to test the layout. Real results replace it after the
        first benchmark run.
      </AlertDescription>
    </Alert>
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
        <Skeleton key={i} className="h-9 w-full bg-rule/60" />
      ))}
    </div>
  );
}
