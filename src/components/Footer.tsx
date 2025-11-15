import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Globe } from 'lucide-react';
import bicLogo from '@/assets/bic-logo.png';

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
    { name: 'Partenariat', href: '/partnership' },
    { name: 'Rejoignez-nous', href: '/careers' },
    { name: 'Mentions légales', href: '/legal' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content - Compact Grid */}
        <div className="py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-2">
              <img src={bicLogo} alt="BIC" className="h-6 w-6 brightness-0 invert" />
              <div>
                <h3 className="text-sm font-bold leading-tight">Bureau de l'Immobilier du Congo</h3>
                <p className="text-seloger-red text-xs font-semibold">BIC</p>
              </div>
            </div>
            
            <p className="text-gray-400 text-xs leading-relaxed mb-3 max-w-md">
              Production et diffusion de données immobilières et territoriales pour la RDC.
            </p>
            
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 text-gray-400">
                <MapPin className="h-3 w-3 text-seloger-red flex-shrink-0" />
                <span>Goma, Nord-Kivu</span>
              </div>
              <div className="flex items-center space-x-1.5 text-gray-400">
                <Phone className="h-3 w-3 text-seloger-red flex-shrink-0" />
                <a href="tel:+243816996077" className="hover:text-white transition-colors">
                  +243 816996077
                </a>
              </div>
              <div className="flex items-center space-x-1.5 text-gray-400">
                <Mail className="h-3 w-3 text-seloger-red flex-shrink-0" />
                <a href="mailto:contact@bic.myazi.net.org" className="hover:text-white transition-colors break-all">
                  contact@bic.myazi.net.org
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold mb-2 border-b border-seloger-red/30 pb-1">Navigation</h4>
            <ul className="space-y-1">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-gray-400 hover:text-seloger-red text-xs transition-colors block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold mb-2 border-b border-seloger-red/30 pb-1">Ressources</h4>
            <ul className="space-y-1">
              {resources.map((resource) => (
                <li key={resource.name}>
                  <Link 
                    to={resource.href} 
                    className="text-gray-400 hover:text-seloger-red text-xs transition-colors block"
                  >
                    {resource.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="text-gray-500 text-center sm:text-left">
              © {currentYear} BIC - Tous droits réservés
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                className="bg-seloger-red hover:bg-seloger-red-dark text-white text-xs px-3 py-1 h-7"
              >
                S'abonner
              </Button>
              <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
                <Globe className="h-3 w-3 text-seloger-red" />
                <span className="text-white text-xs font-medium">26 provinces</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
