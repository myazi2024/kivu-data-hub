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
    { name: 'À propos', href: '/about' },
    { name: 'Nos services', href: '/services' },
    { name: 'Publications', href: '/publications' },
    { name: 'Plateforme Myazi', href: '/myazi' },
    { name: 'Cartographie', href: '/map' },
    { name: 'Partenariat', href: '/partnership' },
    { name: 'Rejoignez-nous', href: '/careers' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img src={bicLogo} alt="BIC Logo" className="h-10 w-10" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">BIC</span>
              <span className="text-xs text-muted-foreground">Bureau de l'Immobilier du Congo</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 hover:bg-secondary/50 rounded-md"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth & Language Toggle & Mobile Menu Button */}
          <div className="flex items-center space-x-2">
            {!loading && (
              <>
                {user ? (
                  <>
                    <div className="hidden sm:flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
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
                      className="hidden sm:flex items-center space-x-1"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Déconnexion</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="hidden sm:flex"
                  >
                    <Link to="/auth">
                      <User className="h-4 w-4 mr-1" />
                      Connexion
                    </Link>
                  </Button>
                )}
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="hidden sm:flex items-center space-x-1"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-semibold">{language.toUpperCase()}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded="false"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="pb-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="block px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-secondary/50 rounded-md transition-colors duration-200"
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
                        <p className="text-sm font-medium">{profile?.full_name || user.email}</p>
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
                        className="flex items-center space-x-1 px-3 py-2 w-full justify-start"
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
                      className="flex items-center space-x-1 px-3 py-2 w-full justify-start"
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
                className="flex items-center space-x-1 px-3 py-2 w-full justify-start"
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