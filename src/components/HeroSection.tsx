import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, BarChart3, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroSkyline from '@/assets/hero-skyline.webp';
import TypewriterAnimation from '@/components/TypewriterAnimation';
import { useCatalogConfig } from '@/hooks/useCatalogConfig';

const HeroSection = () => {
  const { config } = useCatalogConfig();
  const provinces = config.available_provinces || [];

  return (
    <section className="relative min-h-[85dvh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroSkyline}
          alt="Illustration urbaine stylisée — skyline et données territoriales"
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 text-center text-primary-foreground">
        {/* Main Heading */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 leading-tight">
            Consultez les informations cadastrales des parcelles depuis chez vous.
          </h1>
          
          <TypewriterAnimation />
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 max-w-2xl mx-auto">
          <Link to="/cadastral-map" className="w-full sm:flex-1">
            <Button 
              size="lg"
              className="w-full bg-background text-primary hover:bg-background/95 hover:scale-[1.02] font-bold px-6 sm:px-8 py-6 sm:py-7 text-base sm:text-lg group transition-all duration-300 rounded-xl shadow-2xl"
            >
              <Map className="mr-3 h-6 w-6 sm:h-7 sm:w-7" />
              <span>Cadastre numérique</span>
              <ArrowRight className="ml-3 h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
          
          <Link to="/publications" className="w-full sm:flex-1">
            <Button 
              variant="outline"
              size="lg"
              className="w-full bg-primary-foreground/10 backdrop-blur-sm border-2 border-primary-foreground/30 text-primary-foreground hover:bg-background hover:text-primary hover:scale-[1.02] font-semibold px-6 sm:px-8 py-6 sm:py-7 text-base sm:text-lg transition-all duration-300 rounded-xl shadow-lg"
            >
              <BarChart3 className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              <span>Media</span>
            </Button>
          </Link>
          
          <Link to="/map" className="w-full sm:flex-1">
            <Button 
              variant="outline"
              size="lg"
              className="w-full bg-primary-foreground/10 backdrop-blur-sm border-2 border-primary-foreground/30 text-primary-foreground hover:bg-background hover:text-primary hover:scale-[1.02] font-semibold px-6 sm:px-8 py-6 sm:py-7 text-base sm:text-lg transition-all duration-300 rounded-xl shadow-lg"
            >
              <MapPin className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              <span>Données foncières</span>
            </Button>
          </Link>
        </div>

        {/* Available Provinces */}
        {provinces.length > 0 && (
          <div className="mt-6 px-4">
            <p className="text-[11px] text-primary-foreground/60 leading-relaxed">
              Service disponible pour : {provinces.join(', ')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
