import React from 'react';
import Navigation from '@/components/ui/navigation';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-dvh">
      <Navigation />
      <HeroSection />
      <ServicesSection />
      <Footer />
    </div>
  );
};

export default Index;
