import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TournamentList } from "@/components/TournamentList";

export default function Tournaments() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-20">
        <TournamentList />
      </main>
      <Footer />
    </div>
  );
}