import React from 'react';
import Navigation from '@/components/ui/navigation';
import HeroSection from '@/components/HeroSection';
import PartnersSection from '@/components/PartnersSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-dvh">
      <Navigation />
      <HeroSection />
      <PartnersSection />
      <Footer />
    </div>
  );
};

export default Index;
