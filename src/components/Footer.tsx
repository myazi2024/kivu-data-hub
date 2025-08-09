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
    <footer className="bg-bic-blue text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <img src={bicLogo} alt="BIC Logo" className="h-12 w-12 brightness-0 invert" />
              <div>
                <h3 className="text-xl font-bold">Bureau de l'Immobilier du Congo</h3>
                <p className="text-white/80 text-sm">BIC</p>
              </div>
              <img src={footerPictogram} alt="Pictogramme immobilier et territorial" className="h-8 w-auto opacity-80 hidden md:block" />
            </div>
            
            <p className="text-white/90 mb-6 leading-relaxed max-w-md">
              Cabinet indépendant spécialisé dans la production et la diffusion de données 
              immobilières et territoriales pour la République Démocratique du Congo.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-white/80 flex-shrink-0" />
                <span className="text-white/90 text-sm">07, Rue Touristique, Goma, Nord-Kivu, RDC</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-white/80 flex-shrink-0" />
                <span className="text-white/90 text-sm">+243 816996077</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-white/80 flex-shrink-0" />
                <span className="text-white/90 text-sm">contact@bic.myazi.net.org</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-white/80 hover:text-white text-sm transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Ressources</h4>
            <ul className="space-y-2">
              {resources.map((resource) => (
                <li key={resource.name}>
                  <Link 
                    to={resource.href} 
                    className="text-white/80 hover:text-white text-sm transition-colors duration-200"
                  >
                    {resource.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-white/20 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            <div>
              <h4 className="text-lg font-semibold mb-2">Restez informé</h4>
              <p className="text-white/80 text-sm">
                Recevez nos dernières publications et analyses du marché immobilier.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="secondary" 
                className="bg-white text-bic-blue hover:bg-white/90"
              >
                S'abonner aux publications
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-white/20 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-white/80 text-sm">
              © {currentYear} Bureau de l'Immobilier du Congo (BIC). Tous droits réservés.
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white/60 text-xs">Couverture :</span>
              <div className="flex items-center space-x-1">
                <Globe className="h-4 w-4 text-white/80" />
                <span className="text-white/80 text-sm font-medium">26 provinces RDC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;