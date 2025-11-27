import React, { lazy, Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const TournamentList = lazy(() => import('./TournamentList').then(module => ({ default: module.TournamentList })));

const TournamentListSkeleton = () => (
  <section className="py-20 bg-background relative overflow-hidden">
    {/* Industrial Background */}
    <div className="absolute inset-0 industrial-texture opacity-50" />
    
    {/* Metal Grid Pattern */}
    <div 
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
          repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
        `
      }}
    />

    {/* Neon Glow Spots */}
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-syndikate-orange/10 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-syndikate-red/10 rounded-full blur-3xl animate-pulse" />

    <div className="container mx-auto px-4 relative z-10">
      <div className="text-center mb-12">
        <div className="flex items-center gap-3 justify-center mb-6">
          <Skeleton className="w-12 h-12 bg-syndikate-metal" />
          <Skeleton className="h-10 w-64 bg-syndikate-metal" />
        </div>
        <div className="h-[2px] w-20 bg-syndikate-orange/20 mx-auto mb-6"></div>
        <Skeleton className="h-4 w-96 mx-auto bg-syndikate-metal" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="brutal-metal brutal-border p-5 relative overflow-hidden animate-pulse">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-border" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-border" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-border" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-border" />

            {/* Warning Stripe */}
            <div 
              className="absolute top-0 left-0 right-0 h-2 opacity-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.3), rgba(255, 135, 31, 0.3) 10px, transparent 10px, transparent 20px)'
              }}
            />
            
            <div className="space-y-4">
              <div className="space-y-3">
                <Skeleton className="h-7 w-3/4 bg-syndikate-metal-light" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-24 bg-syndikate-orange/20" />
                  <Skeleton className="h-7 w-20 bg-syndikate-metal-light" />
                </div>
              </div>
              
              <div className="h-[2px] bg-syndikate-orange/20" />
              
              <Skeleton className="h-24 bg-syndikate-metal-light" />
              
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-24 bg-syndikate-metal-light" />
                <Skeleton className="h-24 bg-syndikate-metal-light" />
                <Skeleton className="h-24 bg-syndikate-metal-light" />
                <Skeleton className="h-24 bg-syndikate-metal-light" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-11 w-full bg-syndikate-orange/20" />
                <Skeleton className="h-11 w-full bg-syndikate-orange/30" />
              </div>
            </div>

            {/* Bottom Warning Stripe */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-2 opacity-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255, 135, 31, 0.3), rgba(255, 135, 31, 0.3) 10px, transparent 10px, transparent 20px)'
              }}
            />
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
