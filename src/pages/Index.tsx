import React from 'react';
import Navigation from '@/components/ui/navigation';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <HeroSection />
      <Footer />
    </div>
  );
};

export default Index;
