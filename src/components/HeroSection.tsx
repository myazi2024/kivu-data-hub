import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroSkyline from '@/assets/hero-skyline.webp';
import CadastralSearchBar from '@/components/cadastral/CadastralSearchBar';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
      <div className="relative z-10 w-full max-w-7xl mx-auto container-padding text-center text-white">
        {/* Main Heading */}
        <div className="mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
            Les données au service
            <span className="block text-white/90">du foncier</span>
          </h1>
          
          <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-light mb-4 sm:mb-6 md:mb-8 text-white/95 max-w-2xl lg:max-w-4xl mx-auto leading-relaxed">
            De l'analyse à la production, le Bureau de l'Immobilier du Congo met les données foncières au service des décisions publiques et privées.
          </p>
        </div>


        {/* Call to Action Buttons - Mobile optimized */}
        <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 md:mb-12">
          <Link to="/publications" className="w-full xs:w-auto max-w-xs">
            <Button 
              className="w-full xs:w-auto bg-white text-seloger-red hover:bg-white/90 font-medium px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base group transition-all duration-300 h-10 sm:h-12"
            >
              <span className="hidden xs:inline">Nos Publications</span>
              <span className="xs:hidden">Publications</span>
              <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
          
          <Link to="/map" className="w-full xs:w-auto max-w-xs">
            <Button 
              variant="outline"
              className="w-full xs:w-auto bg-transparent border-white text-white hover:bg-white hover:text-seloger-red font-medium px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base transition-all duration-300 h-10 sm:h-12"
            >
              <MapPin className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Cartographie Interactive</span>
              <span className="xs:hidden">Carte</span>
            </Button>
          </Link>
        </div>

        {/* Barre de recherche cadastrale */}
        <div className="w-full max-w-5xl mx-auto mb-6 sm:mb-8 md:mb-12">
          <CadastralSearchBar />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center justify-center mb-2 sm:mb-3">
              <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">26</h3>
            <p className="text-white/90 text-xs sm:text-sm">Provinces couvertes en RDC</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center justify-center mb-2 sm:mb-3">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">100%</h3>
            <p className="text-white/90 text-xs sm:text-sm">Données géolocalisées et vérifiées</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 xs:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-center mb-2 sm:mb-3">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">SIG</h3>
            <p className="text-white/90 text-xs sm:text-sm">Système d'Information Géographique</p>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;