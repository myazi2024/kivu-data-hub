import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroSkyline from '@/assets/hero-skyline.webp';
import CadastralSearchBar from '@/components/cadastral/CadastralSearchBar';
import TypewriterAnimation from '@/components/TypewriterAnimation';
import CadastralStatsCounter from '@/components/CadastralStatsCounter';

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
            Accédez aux informations de n'importe quelle propriété en RDC, sans quitter votre canapé.
          </h1>
          
          <TypewriterAnimation />
        </div>

        {/* Barre de recherche cadastrale */}
        <div className="w-full max-w-4xl mx-auto mb-4 sm:mb-6">
          <CadastralSearchBar />
        </div>

        {/* Compteur de statistiques cadastrales */}
        <div className="mb-8 sm:mb-10">
          <CadastralStatsCounter />
        </div>

        {/* Call to Action Buttons - Premium Mobile Design */}
        <div className="flex flex-row gap-3 sm:gap-4 justify-center items-center px-4">
          <Link to="/cadastre-collaboratif" className="flex-1 max-w-[160px] sm:max-w-none sm:flex-none">
            <Button 
              className="w-full bg-white text-seloger-red hover:bg-white/95 hover:scale-[1.02] font-semibold px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base group transition-all duration-300 h-12 sm:h-auto rounded-xl sm:rounded-lg shadow-lg hover:shadow-xl"
            >
              <MapPin className="mr-2 h-4 w-4 sm:mr-2.5 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Cadastre collaboratif</span>
              <span className="sm:hidden">Cadastre</span>
              <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
          
          <Link to="/map" className="flex-1 max-w-[160px] sm:max-w-none sm:flex-none">
            <Button 
              variant="outline"
              className="w-full bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white hover:text-seloger-red hover:scale-[1.02] font-semibold px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base transition-all duration-300 h-12 sm:h-auto rounded-xl sm:rounded-lg shadow-lg hover:shadow-xl"
            >
              <MapPin className="mr-2 h-4 w-4 sm:mr-2.5 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Données foncières</span>
              <span className="sm:hidden">Données foncières</span>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;