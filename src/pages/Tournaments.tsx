import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TournamentList } from "@/components/TournamentList";

export default function Tournaments() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="pt-24 md:pt-20 pb-16">
        <TournamentList />
      </main>
      <Footer />
    </div>
  );
}