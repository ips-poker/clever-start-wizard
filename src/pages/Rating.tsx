import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TopPlayers } from "@/components/TopPlayers";

export default function Rating() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-20">
        <TopPlayers />
      </main>
      <Footer />
    </div>
  );
}