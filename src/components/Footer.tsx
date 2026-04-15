import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, Cookie } from 'lucide-react';
import bicLogoFallback from '@/assets/bic-logo.png';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { useCookies } from '@/hooks/useCookies';

const Footer = () => {
  const { config } = useAppAppearance();
  const { reopenBanner } = useCookies();
  const logoSrc = config.logo_url || bicLogoFallback;
  const appName = config.app_name || 'BIC';
  const appTagline = config.app_tagline || "Bureau d'Informations Cadastrales";
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'À propos', href: '/about' },
    { name: 'Nos services', href: '/services' },
    { name: 'Publications', href: '/publications' },
    
  ];

  const resources = [
    { name: 'Partenariat', href: '/partnership' },
    
    { name: 'Mentions légales', href: '/legal' },
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content */}
        <div className="py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-2">
              <img src={logoSrc} alt={appName} className="h-6 w-6 brightness-0 invert" />
            <div>
              <h3 className="text-sm font-bold leading-tight">{appTagline}</h3>
            </div>
            </div>
            
            <p className="text-muted-foreground text-xs leading-relaxed mb-3 max-w-md">
              Production et diffusion de données cadastrales et foncières pour la RDC.
            </p>
            
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                <span>Goma, Nord-Kivu</span>
              </div>
              <div className="flex items-center space-x-1.5 text-muted-foreground">
                <Phone className="h-3 w-3 text-primary flex-shrink-0" />
                <a href="tel:+243816996077" className="hover:text-background transition-colors">
                  +243 816996077
                </a>
              </div>
              <div className="flex items-center space-x-1.5 text-muted-foreground">
                <Mail className="h-3 w-3 text-primary flex-shrink-0" />
                <a href="mailto:contact@bic.cd" className="hover:text-background transition-colors break-all">
                  contact@bic.cd
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold mb-2 border-b border-primary/30 pb-1">Navigation</h4>
            <ul className="space-y-1">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-muted-foreground hover:text-primary text-xs transition-colors block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold mb-2 border-b border-primary/30 pb-1">Ressources</h4>
            <ul className="space-y-1">
              {resources.map((resource) => (
                <li key={resource.name}>
                  <Link 
                    to={resource.href} 
                    className="text-muted-foreground hover:text-primary text-xs transition-colors block"
                  >
                    {resource.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/20 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-center sm:text-left">
              <span>© {currentYear} {appName} - Tous droits réservés</span>
              <img src={logoSrc} alt={appName} className="h-3.5 w-3.5 brightness-0 invert inline-block" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reopenBanner}
                className="flex items-center gap-1 bg-background/10 px-2 py-1 rounded hover:bg-background/20 transition-colors cursor-pointer"
              >
                <Cookie className="h-3 w-3 text-primary" />
                <span className="text-background text-xs font-medium">Gérer les cookies</span>
              </button>
              <div className="flex items-center gap-1 bg-background/10 px-2 py-1 rounded">
                <Globe className="h-3 w-3 text-primary" />
                <span className="text-background text-xs font-medium">26 provinces</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
