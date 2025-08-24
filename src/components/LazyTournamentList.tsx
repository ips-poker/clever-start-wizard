import React, { lazy, Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const TournamentList = lazy(() => import('./TournamentList').then(module => ({ default: module.TournamentList })));

const TournamentListSkeleton = () => (
  <section className="py-20 bg-muted/30">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <Skeleton className="h-8 w-64 mx-auto mb-4" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-4 p-6 border rounded-lg">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export function LazyTournamentList() {
  return (
    <Suspense fallback={<TournamentListSkeleton />}>
      <TournamentList />
    </Suspense>
  );
}