import { NeuralBackground } from './landing/fx/NeuralBackground';
import { CursorGlow } from './landing/fx/CursorGlow';
import { LandingNavbar } from './landing/sections/LandingNavbar';
import { Hero } from './landing/sections/Hero';
import { Features } from './landing/sections/Features';
import { LogoCloud } from './landing/sections/LogoCloud';
import { Testimonials } from './landing/sections/Testimonials';
import { FinalCTA, Footer } from './landing/sections/FinalCTA';
import './landing/landing.css';

export default function LandingPage() {


  return (
    <main className="lp-root">
      {/* Ambient gradient wash */}
      <div className="lp-ambient">
        <div className="lp-ambient-left" />
        <div className="lp-ambient-right" />
        <div className="lp-ambient-overlay" />
      </div>

      <NeuralBackground />
      <CursorGlow />
      <LandingNavbar />

      <Hero />
      <Features />
      <LogoCloud />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </main>
  );
}
