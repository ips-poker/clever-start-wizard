import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HeroSkeleton() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background simulation */}
      <div className="absolute inset-0 bg-slate-950/60"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/50 via-slate-900/45 to-slate-950/70"></div>
      
      {/* Floating elements */}
      <div className="absolute inset-0 opacity-10 overflow-hidden motion-reduce:hidden">
        <div className="absolute top-20 left-10 text-6xl text-white/20">♠</div>
        <div className="absolute bottom-20 right-10 text-5xl text-white/15">♣</div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[70vh] lg:min-h-screen py-12 lg:py-20">
          {/* Left Column - Content Skeleton */}
          <div className="text-white space-y-10 animate-fade-in order-2 lg:order-1">
            <div className="space-y-8">
              {/* Badge skeleton */}
              <div className="flex justify-center lg:justify-start">
                <Skeleton className="h-12 w-48 rounded-full bg-white/10" />
              </div>
              
              {/* Logo and Title Section */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-4 lg:space-y-0 lg:space-x-8">
                <div className="flex-shrink-0">
                  <Skeleton className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-white/10" />
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-12 lg:h-16 w-32 lg:w-48 bg-white/10" />
                  <Skeleton className="h-6 lg:h-8 w-48 lg:w-72 bg-white/10" />
                </div>
              </div>
              
              {/* Description skeleton */}
              <div className="text-center lg:text-left space-y-2">
                <Skeleton className="h-6 w-full max-w-2xl mx-auto lg:mx-0 bg-white/10" />
                <Skeleton className="h-6 w-3/4 max-w-xl mx-auto lg:mx-0 bg-white/10" />
                <Skeleton className="h-6 w-5/6 max-w-lg mx-auto lg:mx-0 bg-white/10" />
              </div>

              {/* Key Benefits skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 max-w-2xl mx-auto lg:mx-0">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl bg-white/8" />
                ))}
              </div>
            </div>

            {/* Buttons skeleton */}
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center lg:justify-start max-w-lg mx-auto lg:mx-0">
              <Skeleton className="h-14 w-full sm:w-48 rounded-xl bg-white/15" />
              <Skeleton className="h-14 w-full sm:w-48 rounded-xl bg-white/10" />
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 pt-8 max-w-2xl mx-auto lg:mx-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center p-4 md:p-5 bg-white/8 backdrop-blur-xl rounded-xl border border-white/20">
                  <Skeleton className="h-8 w-12 mx-auto mb-2 bg-white/15" />
                  <Skeleton className="h-4 w-16 mx-auto bg-white/10" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Cards Skeleton */}
          <div className="space-y-6 animate-slide-right order-1 lg:order-2">
            {/* Main Feature Card skeleton */}
            <Card className="p-8 bg-white/15 border border-white/30 shadow-lg">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Skeleton className="w-10 h-10 bg-white/30" />
                </div>
                <Skeleton className="h-8 w-3/4 mx-auto bg-white/20" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full bg-white/15" />
                  <Skeleton className="h-5 w-2/3 mx-auto bg-white/15" />
                </div>
                <Skeleton className="h-10 w-32 mx-auto rounded-full bg-white/20" />
              </div>
            </Card>

            {/* Feature Cards skeleton */}
            <div className="grid gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 bg-white/8 backdrop-blur-xl border border-white/20">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-12 h-12 rounded-xl bg-white/20" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32 bg-white/15" />
                      <Skeleton className="h-4 w-48 bg-white/10" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}