import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroSkyline from '@/assets/hero-skyline.webp';
import CadastralSearchBar from '@/components/cadastral/CadastralSearchBar';

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroSkyline}
          alt="Illustration urbaine stylisée — skyline et données territoriales"
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-seloger-red/90 via-seloger-red/70 to-seloger-red-light/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 text-center text-white">
        {/* Main Heading */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 leading-tight">
            Les données au service
            <span className="block text-white/90">du foncier</span>
          </h1>
          
          <p className="text-xs xs:text-sm sm:text-base md:text-lg font-light mb-3 sm:mb-4 text-white/95 max-w-xl lg:max-w-2xl mx-auto leading-relaxed">
            Le Bureau de l'Immobilier du Congo met les données foncières au service des décisions.
          </p>
        </div>

        {/* Call to Action Buttons - Mobile optimized */}
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 justify-center items-center mb-4 sm:mb-6">
          <Link to="/publications" className="w-full xs:w-auto max-w-xs">
            <Button 
              className="w-full xs:w-auto bg-white text-seloger-red hover:bg-white/90 font-medium px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm group transition-all duration-300 h-8 sm:h-10"
            >
              <span className="hidden xs:inline">Nos Publications</span>
              <span className="xs:hidden">Publications</span>
              <ArrowRight className="ml-1.5 h-3 w-3 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
          
          <Link to="/map" className="w-full xs:w-auto max-w-xs">
            <Button 
              variant="outline"
              className="w-full xs:w-auto bg-transparent border-white text-white hover:bg-white hover:text-seloger-red font-medium px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm transition-all duration-300 h-8 sm:h-10"
            >
              <MapPin className="mr-1.5 h-3 w-3" />
              <span className="hidden xs:inline">Cartographie Interactive</span>
              <span className="xs:hidden">Carte</span>
            </Button>
          </Link>
        </div>

        {/* Barre de recherche cadastrale */}
        <div className="w-full max-w-4xl mx-auto">
          <CadastralSearchBar />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;