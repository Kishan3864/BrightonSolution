"use client";

import { useAdminData } from "../../data/AdminDataProvider";
import { Card, EmptyState, Skeleton, SkeletonCard } from "../../kit";

/** Skeleton for a tab whose report is still loading: a KPI row plus `cards` chart cards. */
export function TabLoading({ kpis = 4, cards = 4 }: { kpis?: number; cards?: number }) {
  return (
    <div className="min-w-0" aria-busy="true" aria-label="Loading analytics">
      {kpis ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: kpis }, (_, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-3 h-7 w-20" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <SkeletonCard key={i} lines={5} />
        ))}
      </div>
    </div>
  );
}

/**
 * Renders the loading skeleton or an empty state when the report is missing, else nothing.
 * Usage: `const { report } = useAdminData(); if (!report) return <TabFallback/>;`
 */
export function TabFallback({ kpis, cards }: { kpis?: number; cards?: number }) {
  const { analyticsLoading, analyticsError } = useAdminData();
  if (analyticsLoading || !analyticsError) return <TabLoading kpis={kpis} cards={cards} />;
  return (
    <Card padding="none">
      <EmptyState icon="wifiOff" title="Analytics unavailable" description="The figures could not be loaded. Try Refresh in the top bar." />
    </Card>
  );
}
