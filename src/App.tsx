import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useGlobalDataSync } from "@/hooks/useGlobalDataSync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TournamentDirector from "./pages/TournamentDirector";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import About from "./pages/About";
import Blog from "./pages/Blog";
import Gallery from "./pages/Gallery";
import Tournaments from "./pages/Tournaments";
import Rating from "./pages/Rating";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ExternalTimer from "./pages/ExternalTimer";
import TelegramMiniApp from "./pages/TelegramMiniApp";
import InvitationCard from "./pages/InvitationCard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Отключаем глобальное кэширование для устранения проблем производительности
  // useGlobalDataSync({
  //   enabled: false,
  //   clearCacheOnStart: true
  // });
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <BrowserRouter>
          <div className="notranslate" translate="no">
            <Toaster />
            <Sonner />
          </div>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
              <div className="animate-spin w-12 h-12 border-2 border-amber-600 border-t-transparent rounded-full"></div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/director" element={<TournamentDirector />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/rating" element={<Rating />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/external-timer" element={<ExternalTimer />} />
              <Route path="/invitation/:id" element={<InvitationCard />} />
              <Route path="/telegram" element={<TelegramMiniApp />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
