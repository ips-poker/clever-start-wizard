import React, { lazy, Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const TournamentList = lazy(() => import('./TournamentList').then(module => ({ default: module.TournamentList })));

const TournamentListSkeleton = () => (
  <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
    {/* Decorative elements - Enhanced */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
      <div className="absolute top-10 left-10 text-amber-400/40 text-5xl animate-pulse">♠</div>
      <div className="absolute top-20 right-20 text-amber-400/30 text-4xl animate-bounce-subtle">♣</div>
      <div className="absolute bottom-10 left-20 text-amber-400/35 text-6xl animate-pulse">♥</div>
      <div className="absolute bottom-20 right-10 text-amber-400/30 text-3xl animate-bounce-subtle">♦</div>
    </div>
    
    {/* Gradient light spots */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
    </div>

    <div className="container mx-auto px-4 relative z-10">
      <div className="text-center mb-12">
        <div className="flex items-center gap-3 justify-center mb-6">
          <Skeleton className="w-10 h-10 rounded-xl bg-amber-500/20" />
          <Skeleton className="h-8 w-64 bg-gradient-to-r from-amber-400/20 to-amber-600/20" />
        </div>
        <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400/20 to-amber-600/20 mx-auto mb-6"></div>
        <Skeleton className="h-4 w-96 mx-auto bg-white/10" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-xl relative overflow-hidden animate-pulse">
            {/* Ticket perforations */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full -ml-3 border border-white/10"></div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full -mr-3 border border-white/10"></div>
            
            {/* Dashed line */}
            <div className="absolute left-6 right-6 top-1/2 h-px border-t-2 border-dashed border-white/20 transform -translate-y-1/2"></div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl bg-amber-500/20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4 bg-white/20" />
                  <Skeleton className="h-3 w-1/2 bg-white/10" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-white/20" />
              </div>
              
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-2/3 bg-white/10" />
                <Skeleton className="h-4 w-3/4 bg-white/10" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-xl bg-amber-400/20" />
                <Skeleton className="h-12 w-full rounded-xl bg-amber-500/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Custom animations */}
    <style>{`
      .animate-bounce-subtle {
        animation: bounce-subtle 3s ease-in-out infinite;
      }
      @keyframes bounce-subtle {
        0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
        50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
      }
    `}</style>
  </section>
);

export function LazyTournamentList() {
  return (
    <Suspense fallback={<TournamentListSkeleton />}>
      <TournamentList />
    </Suspense>
  );
}