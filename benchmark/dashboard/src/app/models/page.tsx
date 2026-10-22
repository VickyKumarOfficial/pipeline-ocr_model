import { Suspense } from "react";
import { LoadingBlock } from "@/components/page";
import { ModelView } from "./model-view";

export default function ModelPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1360px] px-6 pt-8"><LoadingBlock /></div>}>
      <ModelView />
    </Suspense>
  );
}
