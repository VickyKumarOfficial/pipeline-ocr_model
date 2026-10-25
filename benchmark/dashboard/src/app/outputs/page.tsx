import { Suspense } from "react";
import { LoadingBlock } from "@/components/page";
import { OutputsView } from "./outputs-view";

export default function OutputsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1280px] px-6 pt-8"><LoadingBlock /></div>}>
      <OutputsView />
    </Suspense>
  );
}
