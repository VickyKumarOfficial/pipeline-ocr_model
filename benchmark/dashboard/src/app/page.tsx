import { Suspense } from "react";
import { LoadingBlock } from "@/components/page";
import { LeaderboardView } from "./leaderboard-view";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1280px] px-6 pt-8"><LoadingBlock /></div>}>
      <LeaderboardView />
    </Suspense>
  );
}
