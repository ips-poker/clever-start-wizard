import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
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
import TermsOfService from "./pages/TermsOfService";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="notranslate" translate="no">
        <Toaster />
        <Sonner />
      </div>
      <BrowserRouter>
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
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<Privacy />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
