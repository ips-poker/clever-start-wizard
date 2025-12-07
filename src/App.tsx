import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { BrutalLoadingScreen } from "@/components/BrutalLoadingScreen";
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
import Clans from "./pages/Clans";
import NotFound from "./pages/NotFound";
import ExternalTimer from "./pages/ExternalTimer";
import TelegramMiniApp from "./pages/TelegramMiniApp";
import InvitationCard from "./pages/InvitationCard";
import TermsOfService from "./pages/TermsOfService";
import Privacy from "./pages/Privacy";
import PokerDemo from "./pages/PokerDemo";

const queryClient = new QueryClient();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          {/* Loading screen overlay */}
          {isLoading && <BrutalLoadingScreen onLoadingComplete={handleLoadingComplete} />}
          
          {/* Main content - always mounted but hidden during loading */}
          <div style={{ 
            opacity: showContent ? 1 : 0, 
            visibility: showContent ? 'visible' : 'hidden',
            transition: 'opacity 0.3s ease-in-out'
          }}>
            <div className="notranslate" translate="no">
              <Toaster />
              <Sonner />
            </div>
            <div className="pb-16 md:pb-0">
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
                <Route path="/clans" element={<Clans />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/external-timer" element={<ExternalTimer />} />
                <Route path="/invitation/:id" element={<InvitationCard />} />
                <Route path="/telegram" element={<TelegramMiniApp />} />
                <Route path="/telegram-mini-app" element={<TelegramMiniApp />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/poker-demo" element={<PokerDemo />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <MobileBottomNav />
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
