import { Suspense } from "react";
import { LoadingBlock } from "@/components/page";
import { RunsView } from "./runs-view";

export default function RunsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1360px] px-6 pt-8"><LoadingBlock /></div>}>
      <RunsView />
    </Suspense>
  );
}
