import { Suspense } from "react";
import { LoadingBlock } from "@/components/page";
import { SamplesView } from "./samples-view";

export default function SamplesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1280px] px-6 pt-8"><LoadingBlock /></div>}>
      <SamplesView />
    </Suspense>
  );
}
