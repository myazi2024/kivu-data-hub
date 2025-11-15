import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Globe } from 'lucide-react';
import bicLogo from '@/assets/bic-logo.png';
import footerPictogram from '@/assets/footer-pictogram.webp';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'À propos', href: '/about' },
    { name: 'Nos services', href: '/services' },
    { name: 'Publications', href: '/publications' },
    { name: 'Données foncières', href: '/map' },
    { name: 'Contact', href: '/contact' },
  ];

  const resources = [
    { name: 'Plateforme Myazi', href: '/myazi' },
    { name: 'Partenariat', href: '/partnership' },
    { name: 'Rejoignez-nous', href: '/careers' },
    { name: 'Mentions légales', href: '/legal' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto container-padding">
        {/* Main Footer Content */}
        <div className="py-3 sm:py-4 responsive-grid-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row items-start space-y-1.5 sm:space-y-0 sm:space-x-2 mb-2 sm:mb-3">
              <img src={bicLogo} alt="BIC Logo" className="h-7 w-7 sm:h-9 sm:w-9 brightness-0 invert flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">Bureau de l'Immobilier du Congo</h3>
                <p className="text-seloger-red font-semibold text-xs">BIC</p>
              </div>
              <img src={footerPictogram} alt="Pictogramme immobilier et territorial" className="h-5 w-auto sm:h-7 opacity-90 hidden lg:block flex-shrink-0" />
            </div>
            
            <p className="text-gray-300 mb-2 sm:mb-3 leading-snug text-xs max-w-lg">
              Cabinet indépendant spécialisé dans la production et la diffusion de données 
              immobilières et territoriales pour la République Démocratique du Congo.
            </p>
            
            <div className="space-y-1.5">
              <div className="flex items-start space-x-1.5">
                <MapPin className="h-3 w-3 text-seloger-red flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-xs leading-snug">07, Rue Touristique, Goma, Nord-Kivu, RDC</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Phone className="h-3 w-3 text-seloger-red flex-shrink-0" />
                <a href="tel:+243816996077" className="text-gray-300 text-xs hover:text-white transition-colors duration-200">
                  +243 816996077
                </a>
              </div>
              <div className="flex items-center space-x-1.5">
                <Mail className="h-3 w-3 text-seloger-red flex-shrink-0" />
                <a href="mailto:contact@bic.myazi.net.org" className="text-gray-300 text-xs hover:text-white transition-colors duration-200 break-all sm:break-normal">
                  contact@bic.myazi.net.org
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="text-xs sm:text-sm font-bold text-white border-b border-seloger-red pb-0.5">Liens rapides</h4>
            <ul className="space-y-0.5">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-gray-300 hover:text-seloger-red text-xs font-medium transition-colors duration-200 block py-0.5"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="text-xs sm:text-sm font-bold text-white border-b border-seloger-red pb-0.5">Ressources</h4>
            <ul className="space-y-0.5">
              {resources.map((resource) => (
                <li key={resource.name}>
                  <Link 
                    to={resource.href} 
                    className="text-gray-300 hover:text-seloger-red text-xs font-medium transition-colors duration-200 block py-0.5"
                  >
                    {resource.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-gray-700 py-2 sm:py-3">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-2 lg:space-y-0 lg:space-x-4">
            <div className="flex-1 max-w-lg">
              <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Restez informé</h4>
              <p className="text-gray-300 text-xs leading-snug">
                Recevez nos dernières publications et analyses du marché immobilier congolais.
              </p>
            </div>
            <div className="flex-shrink-0 w-full lg:w-auto">
              <Button 
                size="sm"
                className="w-full lg:w-auto bg-seloger-red text-white hover:bg-seloger-red-dark font-semibold px-3 sm:px-5 py-1.5 text-xs shadow-glow transition-all duration-300"
              >
                S'abonner aux publications
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-700 py-2 sm:py-3">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-1.5 md:space-y-0">
            <div className="text-gray-400 text-xs text-center md:text-left">
              © {currentYear} Bureau de l'Immobilier du Congo (BIC). Tous droits réservés.
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2">
              <span className="text-gray-500 text-xs font-medium">Couverture :</span>
              <div className="flex items-center space-x-1 bg-gray-800 px-2 py-0.5 rounded">
                <Globe className="h-3 w-3 text-seloger-red" />
                <span className="text-white text-xs font-semibold">26 provinces RDC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;