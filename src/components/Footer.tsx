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
    { name: 'Cartographie', href: '/map' },
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
        <div className="section-padding responsive-grid-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4 mb-6 sm:mb-8">
              <img src={bicLogo} alt="BIC Logo" className="h-12 w-12 sm:h-14 sm:w-14 brightness-0 invert flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Bureau de l'Immobilier du Congo</h3>
                <p className="text-seloger-red font-semibold text-sm sm:text-base">BIC</p>
              </div>
              <img src={footerPictogram} alt="Pictogramme immobilier et territorial" className="h-8 w-auto sm:h-10 opacity-90 hidden lg:block flex-shrink-0" />
            </div>
            
            <p className="text-gray-300 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base max-w-lg">
              Cabinet indépendant spécialisé dans la production et la diffusion de données 
              immobilières et territoriales pour la République Démocratique du Congo.
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-seloger-red flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm sm:text-base leading-relaxed">07, Rue Touristique, Goma, Nord-Kivu, RDC</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-seloger-red flex-shrink-0" />
                <a href="tel:+243816996077" className="text-gray-300 text-sm sm:text-base hover:text-white transition-colors duration-200">
                  +243 816996077
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-seloger-red flex-shrink-0" />
                <a href="mailto:contact@bic.myazi.net.org" className="text-gray-300 text-sm sm:text-base hover:text-white transition-colors duration-200 break-all sm:break-normal">
                  contact@bic.myazi.net.org
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 sm:space-y-6">
            <h4 className="text-lg sm:text-xl font-bold text-white border-b border-seloger-red pb-2">Liens rapides</h4>
            <ul className="space-y-2 sm:space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-gray-300 hover:text-seloger-red text-sm sm:text-base font-medium transition-colors duration-200 block py-1"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4 sm:space-y-6">
            <h4 className="text-lg sm:text-xl font-bold text-white border-b border-seloger-red pb-2">Ressources</h4>
            <ul className="space-y-2 sm:space-y-3">
              {resources.map((resource) => (
                <li key={resource.name}>
                  <Link 
                    to={resource.href} 
                    className="text-gray-300 hover:text-seloger-red text-sm sm:text-base font-medium transition-colors duration-200 block py-1"
                  >
                    {resource.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-gray-700 py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 sm:space-y-6 lg:space-y-0 lg:space-x-8">
            <div className="flex-1 max-w-lg">
              <h4 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Restez informé</h4>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                Recevez nos dernières publications et analyses du marché immobilier congolais directement dans votre boîte mail.
              </p>
            </div>
            <div className="flex-shrink-0 w-full lg:w-auto">
              <Button 
                size="lg"
                className="w-full lg:w-auto bg-seloger-red text-white hover:bg-seloger-red-dark font-semibold px-6 sm:px-8 py-3 text-sm sm:text-base shadow-glow transition-all duration-300"
              >
                S'abonner aux publications
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-700 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 sm:space-y-4 md:space-y-0">
            <div className="text-gray-400 text-xs sm:text-sm text-center md:text-left">
              © {currentYear} Bureau de l'Immobilier du Congo (BIC). Tous droits réservés.
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 md:space-x-6">
              <span className="text-gray-500 text-xs sm:text-sm font-medium">Couverture :</span>
              <div className="flex items-center space-x-2 bg-gray-800 px-3 sm:px-4 py-2 rounded-md">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-seloger-red" />
                <span className="text-white text-xs sm:text-sm font-semibold">26 provinces RDC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;