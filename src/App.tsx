import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
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
import NotFound from "./pages/NotFound";
import ExternalTimer from "./pages/ExternalTimer";
import TelegramMiniApp from "./pages/TelegramMiniApp";
import InvitationCard from "./pages/InvitationCard";
import TermsOfService from "./pages/TermsOfService";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Check if loading screen was already shown in this session
    const hasShownLoading = sessionStorage.getItem('syndikate_loading_shown');
    
    if (hasShownLoading) {
      setIsLoading(false);
      setShowContent(true);
    }
  }, []);

  useEffect(() => {
    // Safety: reset any global fixed styles that could block scrolling
    const rootEl = document.getElementById('root');
    document.body.style.position = '';
    document.body.style.overflow = '';
    document.body.style.width = '';
    document.body.style.height = '';
    if (rootEl) {
      rootEl.style.position = '';
      rootEl.style.overflow = '';
      rootEl.style.width = '';
      rootEl.style.height = '';
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('syndikate_loading_shown', 'true');
    setIsLoading(false);
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <QueryClientProvider client={queryClient}>
      {isLoading && <BrutalLoadingScreen onLoadingComplete={handleLoadingComplete} />}
      {showContent && (
        <>
          <div className="notranslate" translate="no">
            <Toaster />
            <Sonner />
          </div>
          <BrowserRouter>
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
            <Route path="/profile" element={<Profile />} />
            <Route path="/external-timer" element={<ExternalTimer />} />
            <Route path="/invitation/:id" element={<InvitationCard />} />
            <Route path="/telegram" element={<TelegramMiniApp />} />
            <Route path="/telegram-mini-app" element={<TelegramMiniApp />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<Privacy />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileBottomNav />
        </div>
      </BrowserRouter>
        </>
      )}
    </QueryClientProvider>
  );
}

export default App;
