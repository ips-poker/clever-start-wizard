import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { RatingBenefits } from "@/components/RatingBenefits";
import { Features } from "@/components/Features";
import { Gallery } from "@/components/Gallery";
import { SocialProof } from "@/components/SocialProof";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <RatingBenefits />
        <Features />
        <Gallery />
        <SocialProof />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
