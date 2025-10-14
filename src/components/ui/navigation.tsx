import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Globe, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import bicLogo from '@/assets/bic-logo.png';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState('fr');
  const { user, profile, signOut, loading } = useAuth();

  const navigation = [
    { name: 'Accueil', href: '/' },
    { name: 'Articles', href: '/articles' },
    { name: 'Kiosque', href: '/publications' },
    { name: 'Services Cadastraux', href: '/services-cadastraux' },
    { name: 'Plateforme Myazi', href: '/myazi' },
    { name: 'Données foncières', href: '/map' },
    { name: 'Rejoignez-nous', href: '/careers' },
  ];

  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto container-padding">
        <div className="flex justify-between items-center h-14 sm:h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <img src={bicLogo} alt="BIC Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold text-foreground">BIC</span>
              <span className="text-xs text-muted-foreground hidden sm:block">Bureau de l'Immobilier du Congo</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="px-3 xl:px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 hover:bg-secondary/50 rounded-md whitespace-nowrap"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth & Language Toggle & Mobile Menu Button */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {!loading && (
              <>
                {user ? (
                  <>
                    <div className="hidden sm:flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-24 sm:max-w-32">
                        {profile?.full_name || user.email}
                      </span>
                      {profile?.role === 'admin' && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          Admin
                        </span>
                      )}
                      {profile?.role === 'partner' && (
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          Partenaire
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={signOut}
                      className="hidden sm:flex items-center space-x-1 text-xs"
                    >
                      <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden md:inline">Déconnexion</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="hidden sm:flex text-xs"
                  >
                    <Link to="/auth">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden md:inline">Connexion</span>
                    </Link>
                  </Button>
                )}
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="hidden sm:flex items-center space-x-1 text-xs"
            >
              <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs font-semibold">{language.toUpperCase()}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-1 sm:p-2"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded="false"
            >
              {isOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden transition-all duration-300 ease-in-out overflow-hidden bg-background/95 backdrop-blur-sm border-t border-border",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>
        <div className="pb-3 sm:pb-4 space-y-1 px-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="block px-3 py-2 text-sm font-medium text-foreground hover:text-white hover:bg-seloger-red/90 rounded-md transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              {!loading && (
                <>
                  {user ? (
                    <>
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium truncate">{profile?.full_name || user.email}</p>
                        {profile?.role && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {profile.role === 'admin' ? 'Administrateur' : 
                             profile.role === 'partner' ? 'Partenaire' : 'Utilisateur'}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={signOut}
                        className="flex items-center space-x-1 px-3 py-2 w-full justify-start text-sm"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Déconnexion</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="flex items-center space-x-1 px-3 py-2 w-full justify-start text-sm"
                    >
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <User className="h-4 w-4" />
                        <span>Connexion</span>
                      </Link>
                    </Button>
                  )}
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
                className="flex items-center space-x-1 px-3 py-2 w-full justify-start text-sm"
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-semibold">{language.toUpperCase()}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;