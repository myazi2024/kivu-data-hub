import React from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroSkyline from '@/assets/hero-skyline.webp';
import TypewriterAnimation from '@/components/TypewriterAnimation';
import { useCatalogConfig } from '@/hooks/useCatalogConfig';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';

const HeroSection = () => {
  const { config: catalogConfig } = useCatalogConfig();
  const { config: appearanceConfig } = useAppAppearance();
  const { user } = useAuth();
  const provinces = catalogConfig.available_provinces || [];

  const heroImage = appearanceConfig.hero_image_url || heroSkyline;
  const heroTitle = appearanceConfig.hero_title || 'Consultez les informations cadastrales des parcelles depuis chez vous.';
  const overlayOpacity = appearanceConfig.hero_overlay_opacity ?? 80;

  // CTA #1 — Cadastre numérique : protégé. Si non connecté, on passe par /auth?redirect=
  const cadastreTarget = user ? '/cadastral-map' : '/auth?redirect=/cadastral-map';

  // Lien texte secondaire (configurable, fallback Articles)
  const secondaryLabel = appearanceConfig.hero_secondary_link_label || 'Lire nos analyses';
  const secondaryHref = appearanceConfig.hero_secondary_link_href || '/articles';

  return (
    <>
      <Helmet>
        <link rel="preload" as="image" href={heroImage} fetchpriority="high" />
      </Helmet>

      <section className="relative min-h-[85dvh] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Illustration urbaine stylisée — skyline et données territoriales"
            className="w-full h-full object-cover object-center"
            loading="eager"
            decoding="async"
            // @ts-expect-error fetchpriority is valid HTML attr
            fetchpriority="high"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary via-primary/70 to-primary"
            style={{ opacity: overlayOpacity / 100 }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 text-center text-primary-foreground">
          {/* Main Heading */}
          <div className="mb-8 sm:mb-10">
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 leading-tight">
              {heroTitle}
            </h1>
            <TypewriterAnimation />
          </div>

          {/* CTA — 1 primary + 1 outline + 1 text link */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch px-4 max-w-2xl mx-auto">
            <Link
              to={cadastreTarget}
              className="w-full sm:flex-1"
              onClick={() => trackEvent('hero_cta_click', { id: 'cadastre', authed: !!user })}
            >
              <Button
                size="lg"
                className="w-full bg-background text-primary hover:bg-background/95 hover:scale-[1.02] font-bold px-6 sm:px-8 py-6 sm:py-7 text-base sm:text-lg group transition-all duration-300 rounded-xl shadow-2xl"
              >
                <Map className="mr-3 h-6 w-6 sm:h-7 sm:w-7" />
                <span>Cadastre numérique</span>
                <ArrowRight className="ml-3 h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>

            <Link
              to="/map"
              className="w-full sm:flex-1"
              onClick={() => trackEvent('hero_cta_click', { id: 'donnees-foncieres' })}
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full bg-primary-foreground/10 backdrop-blur-sm border-2 border-primary-foreground/30 text-primary-foreground hover:bg-background hover:text-primary hover:scale-[1.02] font-semibold px-6 sm:px-8 py-6 sm:py-7 text-base sm:text-lg transition-all duration-300 rounded-xl shadow-lg"
              >
                <MapPin className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                <span>Données foncières</span>
              </Button>
            </Link>
          </div>

          {/* Secondary text link */}
          <div className="mt-4">
            <Link
              to={secondaryHref}
              onClick={() => trackEvent('hero_cta_click', { id: 'secondary', href: secondaryHref })}
              className="text-sm text-primary-foreground/85 hover:text-primary-foreground underline underline-offset-4 transition-colors"
            >
              {secondaryLabel} →
            </Link>
          </div>

          {/* Available Provinces */}
          {provinces.length > 0 && (
            <div className="mt-6 px-4">
              <p className="text-[11px] text-primary-foreground/60 leading-relaxed break-words">
                Service disponible pour : {provinces.join(', ')}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default HeroSection;
