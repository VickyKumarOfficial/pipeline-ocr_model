import { Suspense } from "react";
import { LoadingBlock } from "@/components/page";
import { ChecklistView } from "./checklist-view";

export default function ChecklistPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1280px] px-6 pt-8"><LoadingBlock /></div>}>
      <ChecklistView />
    </Suspense>
  );
}
