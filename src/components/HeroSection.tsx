import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import gomaHeroImage from '@/assets/goma-city-hero.jpg';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={gomaHeroImage} 
          alt="Vue aérienne de Goma"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-bic-blue/90 via-bic-blue/70 to-bic-blue-light/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        {/* Main Heading */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Les données au service
            <span className="block text-white/90">de la ville</span>
          </h1>
          
          <p className="text-xl md:text-2xl lg:text-3xl font-light mb-8 text-white/95 max-w-4xl mx-auto leading-relaxed">
            Cartographier, comprendre, transformer : le Bureau de l'Immobilier du Congo 
            met les territoires au cœur de l'action publique.
          </p>
        </div>

        {/* Description */}
        <div className="mb-12">
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Cabinet indépendant basé à Goma, engagé dans la production et la diffusion 
            de données immobilières et territoriales fiables, géolocalisées et stratégiques 
            pour la République Démocratique du Congo.
          </p>
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link to="/publications">
            <Button 
              size="lg" 
              className="bg-white text-bic-blue hover:bg-white/90 font-semibold px-8 py-3 text-lg group transition-all duration-300"
            >
              Nos Publications
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
          
          <Link to="/map">
            <Button 
              variant="outline" 
              size="lg"
              className="bg-transparent border-white text-white hover:bg-white hover:text-bic-blue font-semibold px-8 py-3 text-lg transition-all duration-300"
            >
              <MapPin className="mr-2 h-5 w-5" />
              Cartographie Interactive
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-center mb-3">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">26</h3>
            <p className="text-white/90 text-sm">Provinces couvertes en RDC</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-center mb-3">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">100%</h3>
            <p className="text-white/90 text-sm">Données géolocalisées et vérifiées</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-center mb-3">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">SIG</h3>
            <p className="text-white/90 text-sm">Système d'Information Géographique</p>
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