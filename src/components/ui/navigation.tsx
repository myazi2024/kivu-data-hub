import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Globe, User, LogOut, ChevronDown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import bicLogo from '@/assets/bic-logo.png';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState('fr');
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();

  const navigation = [
    { name: 'Accueil', href: '/' },
    { 
      name: 'Media', 
      subItems: [
        { name: 'Articles', href: '/articles' },
        { name: 'Kiosque', href: '/publications' },
      ]
    },
    { name: 'Données foncières', href: '/map' },
    { name: 'Carte Cadastrale', href: '/cadastral-map' },
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
            <NavigationMenu>
              <NavigationMenuList>
                {navigation.map((item) => (
                  <NavigationMenuItem key={item.name}>
                    {item.subItems ? (
                      <>
                        <NavigationMenuTrigger className="px-3 xl:px-4 py-2 text-sm font-medium">
                          {item.name}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul className="grid w-48 gap-1 p-2">
                            {item.subItems.map((subItem) => (
                              <li key={subItem.name}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    to={subItem.href}
                                    className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                  >
                                    <div className="text-sm font-medium">{subItem.name}</div>
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </NavigationMenuContent>
                      </>
                    ) : (
                      <Link
                        to={item.href}
                        className="px-3 xl:px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 hover:bg-secondary/50 rounded-md whitespace-nowrap inline-block"
                      >
                        {item.name}
                      </Link>
                    )}
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
            
            {/* Admin Link - Desktop only */}
            {profile?.role === 'admin' && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </div>

          {/* Auth & Language Toggle & Mobile Menu Button */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {!loading && (
              <>
                {user ? (
                  <>
                    <div className="hidden sm:flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs"
                      >
                        <Link to="/mon-compte" className="flex items-center space-x-1">
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="truncate max-w-24 sm:max-w-32">
                            {profile?.full_name || user.email}
                          </span>
                        </Link>
                      </Button>
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
              <div key={item.name}>
                {item.subItems ? (
                  <div>
                    <button
                      onClick={() => setMediaMenuOpen(!mediaMenuOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:text-white hover:bg-seloger-red/90 rounded-md transition-colors duration-200"
                    >
                      {item.name}
                      <ChevronDown className={cn("h-4 w-4 transition-transform", mediaMenuOpen && "rotate-180")} />
                    </button>
                    {mediaMenuOpen && (
                      <div className="pl-4 space-y-1 mt-1">
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-white hover:bg-seloger-red/90 rounded-md transition-colors duration-200"
                            onClick={() => setIsOpen(false)}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.href}
                    className="block px-3 py-2 text-sm font-medium text-foreground hover:text-white hover:bg-seloger-red/90 rounded-md transition-colors duration-200"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              {!loading && (
                <>
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-border mb-2">
                    <Link
                      to="/mon-compte"
                      className="flex items-center space-x-3 text-sm font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      <User className="h-4 w-4 text-primary" />
                      <span className="truncate">{profile?.full_name || user.email}</span>
                    </Link>
                    {profile?.role && (
                      <p className="text-xs text-muted-foreground capitalize mt-1 ml-7">
                        {profile.role === 'admin' ? 'Administrateur' : 
                         profile.role === 'partner' ? 'Partenaire' : 'Utilisateur'}
                      </p>
                    )}
                  </div>
                  
                  {/* Admin Link - Mobile */}
                  {profile?.role === 'admin' && (
                    <Link to="/admin" onClick={() => setIsOpen(false)}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-1 px-3 py-2 w-full justify-start text-sm"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </Button>
                    </Link>
                  )}
                  
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