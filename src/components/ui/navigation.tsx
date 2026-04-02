import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, User, LogOut, ChevronDown, Shield, Newspaper, Briefcase, Tag, Heart, Building2, Handshake, Scale, Presentation } from 'lucide-react';
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

const mediaColumns = [
  {
    title: 'Actualités',
    items: [
      { name: 'Articles', href: '/articles', icon: Newspaper, description: 'Analyses et actualités foncières' },
    ],
  },
  {
    title: 'Ressources',
    items: [
      
      { name: 'Présentation BIC', href: '/pitch-partenaires', icon: Presentation, description: 'Pitch pour partenaires d\'affaires' },
      { name: 'Nos Services', href: '/services', icon: Briefcase, description: 'Catalogue des services cadastraux' },
      { name: 'Codes Promo', href: '/about-discount-codes', icon: Tag, description: 'Codes de réduction disponibles' },
      { name: 'Contributions CCC', href: '/about-ccc', icon: Heart, description: 'Comprendre les contributions' },
    ],
  },
  {
    title: 'À propos',
    items: [
      { name: 'Le BIC', href: '/about', icon: Building2, description: 'Notre mission et notre équipe' },
      { name: 'Partenariat', href: '/partnership', icon: Handshake, description: 'Devenir partenaire' },
      { name: 'Mentions légales', href: '/legal', icon: Scale, description: 'CGU et politique de confidentialité' },
    ],
  },
];

const simpleNavItems = [
  { name: 'Accueil', href: '/' },
  { name: 'Données foncières', href: '/map' },
  { name: 'Carte Cadastrale', href: '/cadastral-map' },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileMediaOpen, setMobileMediaOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();

  const isAdminOrSuperAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto container-padding">
        <div className="flex justify-between items-center h-14 sm:h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <img src={bicLogo} alt="BIC Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold text-foreground">BIC</span>
              <span className="text-xs text-muted-foreground hidden sm:block">Bureau d'Informations Cadastrales</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Accueil */}
                <NavigationMenuItem>
                  <Link
                    to="/"
                    className="px-3 xl:px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 hover:bg-secondary/50 rounded-md whitespace-nowrap inline-block"
                  >
                    Accueil
                  </Link>
                </NavigationMenuItem>

                {/* Media Mega-Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="px-3 xl:px-4 py-2 text-sm font-medium">
                    Media
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-3 gap-0 w-[550px] p-4">
                      {mediaColumns.map((column) => (
                        <div key={column.title} className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                            {column.title}
                          </h4>
                          <ul className="space-y-0.5">
                            {column.items.map((item) => (
                              <li key={item.name}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    to={item.href}
                                    className="group flex items-start gap-2.5 rounded-md p-2 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                  >
                                    <item.icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
                                    <div className="space-y-0.5">
                                      <div className="text-sm font-medium leading-none">{item.name}</div>
                                      <p className="text-xs leading-snug text-muted-foreground group-hover:text-accent-foreground/70">
                                        {item.description}
                                      </p>
                                    </div>
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Simple nav items */}
                {simpleNavItems.slice(1).map((item) => (
                  <NavigationMenuItem key={item.name}>
                    <Link
                      to={item.href}
                      className="px-3 xl:px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 hover:bg-secondary/50 rounded-md whitespace-nowrap inline-block"
                    >
                      {item.name}
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            {isAdminOrSuperAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </div>

          {/* Auth & Mobile Menu Button */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {!loading && (
              <>
                {user ? (
                  <>
                    <div className="hidden sm:flex items-center space-x-2">
                      <Button variant="ghost" size="sm" asChild className="text-xs">
                        <Link to="/mon-compte" className="flex items-center space-x-1">
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="truncate max-w-24 sm:max-w-32">
                            {profile?.full_name || user.email}
                          </span>
                        </Link>
                      </Button>
                      {isAdminOrSuperAdmin && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Admin</span>
                      )}
                      {profile?.role === 'partner' && (
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">Partenaire</span>
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
                  <Button variant="default" size="sm" asChild className="hidden sm:flex text-xs">
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
              className="lg:hidden p-1 sm:p-2"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-label="Menu de navigation"
            >
              {isOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden transition-all duration-300 ease-in-out overflow-hidden bg-background/95 backdrop-blur-sm border-t border-border",
          isOpen ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="pb-3 sm:pb-4 space-y-1 px-2">
            {/* Accueil */}
            <Link
              to="/"
              className="block px-3 py-2 text-sm font-medium text-foreground hover:text-primary-foreground hover:bg-primary/90 rounded-md transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              Accueil
            </Link>

            {/* Media - Mobile Accordion */}
            <div>
              <button
                onClick={() => setMobileMediaOpen(!mobileMediaOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:text-primary-foreground hover:bg-primary/90 rounded-md transition-colors duration-200"
              >
                Media
                <ChevronDown className={cn("h-4 w-4 transition-transform", mobileMediaOpen && "rotate-180")} />
              </button>
              {mobileMediaOpen && (
                <div className="pl-2 space-y-3 mt-1 pb-1">
                  {mediaColumns.map((column) => (
                    <div key={column.title}>
                      <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {column.title}
                      </p>
                      <div className="space-y-0.5">
                        {column.items.map((item) => (
                          <Link
                            key={item.name}
                            to={item.href}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary-foreground hover:bg-primary/90 rounded-md transition-colors duration-200"
                            onClick={() => setIsOpen(false)}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Other simple items */}
            {simpleNavItems.slice(1).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="block px-3 py-2 text-sm font-medium text-foreground hover:text-primary-foreground hover:bg-primary/90 rounded-md transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Auth section */}
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
                            {isAdminOrSuperAdmin ? 'Administrateur' :
                             profile.role === 'partner' ? 'Partenaire' : 'Utilisateur'}
                          </p>
                        )}
                      </div>
                      {isAdminOrSuperAdmin && (
                        <Link to="/admin" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" size="sm" className="flex items-center space-x-1 px-3 py-2 w-full justify-start text-sm">
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
                    <Button variant="ghost" size="sm" asChild className="flex items-center space-x-1 px-3 py-2 w-full justify-start text-sm">
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <User className="h-4 w-4" />
                        <span>Connexion</span>
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
